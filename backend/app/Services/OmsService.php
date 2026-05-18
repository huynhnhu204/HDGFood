<?php

namespace App\Services;

use App\Support\OrderCancelPolicy;
use App\Models\Combo;
use App\Mail\OrderCompletedMail;
use App\Models\Order;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Table;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Events\TableWorkflowUpdated;

class OmsService
{
    /**
     * Tạo một đơn hàng mới (Calculate discounts & Lock Inventory)
     */
    public function createOrder(array $data, ?User $requestUser)
    {
        return DB::transaction(function () use ($data, $requestUser) {
            $tableNumber = isset($data['table_number']) ? trim((string) $data['table_number']) : null;
            $tableSessionToken = isset($data['table_session_token']) ? trim((string) $data['table_session_token']) : null;
            $subtotal = 0;
            $promotionDiscount = 0;
            $items = [];
            $productIds = [];

            // 1. Tính tiền từng món, check kho (Row lock), trừ kho
            foreach ($data['items'] as $item) {
                $lineType = $item['type'] ?? 'product';

                if ($lineType === 'combo') {
                    $combo = Combo::with(['groups.comboProducts.product'])->findOrFail($item['combo_id']);
                    if (!($combo->is_running ?? false)) {
                        abort(422, "Combo '{$combo->name}' hiện không khả dụng.");
                    }

                    $quantity = (int) ($item['quantity'] ?? 1);
                    $selections = is_array($item['selections'] ?? null) ? $item['selections'] : [];
                    $calc = $combo->calculatePriceForSelections($selections);
                    if (empty($calc['items'])) {
                        abort(422, "Combo '{$combo->name}' chưa có lựa chọn món hợp lệ.");
                    }

                    $lineCost = 0;
                    $firstProductId = null;
                    foreach ($calc['items'] as $comboItem) {
                        $product = Product::lockForUpdate()->findOrFail((int) $comboItem['product_id']);
                        $needQty = max(1, (int) $comboItem['quantity']) * $quantity;
                        if ($product->stock < $needQty) {
                            abort(422, "Món '{$product->name}' trong combo không đủ số lượng.");
                        }
                        $product->decrement('stock', $needQty);
                        $lineCost += (float) ($product->cost_price ?? 0) * $needQty;
                        $productIds[] = $product->id;
                        if ($firstProductId === null) {
                            $firstProductId = $product->id;
                        }
                    }

                    $lineFinal = (float) ($calc['final_price'] ?? 0);
                    $itemSubtotal = $lineFinal * $quantity;
                    $subtotal += $itemSubtotal;

                    $items[] = [
                        'item_type' => 'combo',
                        'combo_id' => $combo->id,
                        // Giữ product_id để tương thích schema hiện tại (non-null)
                        'product_id' => $firstProductId,
                        'quantity' => $quantity,
                        'price' => $lineFinal,
                        'cost_price' => $lineCost,
                        'options_snapshot' => [
                            'combo_name' => $combo->name,
                            'selections' => $selections,
                            'combo_items' => $calc['items'],
                            'base_price' => $calc['base_price'] ?? 0,
                            'discount_amount' => $calc['discount_amount'] ?? 0,
                        ],
                    ];

                    continue;
                }

                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                if ($product->stock < $item['quantity']) {
                    abort(422, "Món '{$product->name}' không đủ số lượng.");
                }
                $product->decrement('stock', $item['quantity']);

                $itemPrice = $product->price;
                $itemCostPrice = $product->cost_price ?? 0;
                $itemSubtotal = $itemPrice * $item['quantity'];
                $subtotal += $itemSubtotal;
                $productIds[] = $product->id;

                $promotion = $product->promotions()->active()->first();
                if ($promotion) {
                    $promotionDiscount += $promotion->calculateDiscount((float)$itemPrice, $item['quantity']);
                }

                $items[] = [
                    'item_type' => 'product',
                    'product_id' => $product->id,
                    'quantity'   => $item['quantity'],
                    'price'      => $itemPrice,
                    'cost_price' => $itemCostPrice,
                ];
            }

            // 2. Định danh User để trừ tiền (Xác định VIP Tier Rank)
            $user = $requestUser;
            if ($requestUser && $requestUser->isAdmin() && !empty($data['user_id'])) {
                $user = User::find($data['user_id']);
            }

            $tierDiscount = 0;
            if ($user && !$user->isAdmin()) {
                $tierDiscount = $user->calcTierDiscount($subtotal - $promotionDiscount);
            }

            // 3. Xử lý Voucher Code
            $voucherDiscount = 0;
            $voucherId = null;
            $voucherCode = null;

            if (!empty($data['voucher_code'])) {
                $voucher = Voucher::where('code', Str::upper($data['voucher_code']))->first();

                if (!$voucher || !$voucher->isValid()) {
                    abort(422, 'Voucher không hợp lệ hoặc đã hết hạn');
                }

                if ($user && !$voucher->canBeUsedBy($user)) {
                    abort(422, 'Bạn không thể sử dụng voucher này');
                }

                $afterPromotion = $subtotal - $promotionDiscount - $tierDiscount;
                $voucherDiscount = $voucher->calculateDiscount($afterPromotion, $productIds);

                if ($voucherDiscount > 0) {
                    $voucherId = $voucher->id;
                    $voucherCode = $voucher->code;
                    $voucher->increment('used_count'); // Lưu lại limit
                }
            }

            $shippingFee = $data['shipping_fee'] ?? 0;
            $totalPrice = max(0, $subtotal - $promotionDiscount - $tierDiscount - $voucherDiscount) + $shippingFee;

            // Đơn tại bàn: nếu đã có đơn pending/confirmed thì cộng dồn vào đơn cũ.
            // Đơn tại bàn: khách (app) phải khớp session_token; admin POS được phép gán bàn không cần phiên.
            if ($tableNumber) {
                $table = Table::lockForUpdate()->find((int) $tableNumber);
                if (! $table) {
                    abort(422, 'Bàn không tồn tại.');
                }
                $adminBypassSession = $requestUser && $requestUser->isAdmin();
                if (! $adminBypassSession) {
                    if (! $table->session_token || $table->session_token !== $tableSessionToken) {
                        abort(409, 'Bàn này đang có khách, vui lòng chọn bàn khác.');
                    }
                }

                $openOrder = Order::where('shipping_address', $tableNumber)
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->latest()
                    ->first();

                if ($openOrder) {
                    $openOrder->items()->createMany($items);
                    $appendUpdates = [
                        'total' => (float) $openOrder->total + $subtotal,
                        'final_total' => (float) $openOrder->final_total + $totalPrice,
                        'notes' => $data['note'] ?? $openOrder->notes,
                    ];
                    if (! empty($data['payment_method'])) {
                        $appendUpdates['payment_method'] = $data['payment_method'];
                    }
                    $openOrder->update($appendUpdates);

                    $table->update([
                        'status' => 'occupied',
                        'current_order_id' => $openOrder->id,
                    ]);

                    \App\Models\Notification::createNotification(
                        "Bàn {$tableNumber} vừa đặt thêm món",
                        "Đã cộng dồn món vào đơn #{$openOrder->id}.",
                        "order",
                        "/admin/orders/{$openOrder->id}"
                    );
                    event(new TableWorkflowUpdated($table->id, $table->name, 'occupied', 'order_appended', $openOrder->id));

                    return $openOrder->fresh(['user', 'items.product', 'voucher']);
                }
            }

            // 4. Record DB Orders
            // Generate unique order number with random suffix to avoid collisions
            $orderNumber = 'ORD' . date('ymd') . str_pad(Order::whereDate('created_at', today())->count() + 1, 4, '0', STR_PAD_LEFT) . strtoupper(substr(uniqid(), -4));

            $customerEmailSnapshot = ($user !== null && ! $user->isAdmin()) ? $user->email : null;

            $order = Order::create([
                'user_id'            => $user?->id,
                'order_number'       => $orderNumber,
                'delivery_name'      => $data['customer_name'],
                'delivery_phone'     => $data['customer_phone'],
                'customer_email_snapshot' => $customerEmailSnapshot,
                'shipping_address'   => $data['table_number'] ?? $data['shipping_address'] ?? null,
                'payment_method'     => $data['payment_method'] ?? null,
                'shipping_fee'       => $shippingFee,
                'notes'              => $data['note'] ?? null,
                'total'              => $subtotal,
                'discount_amount'    => $promotionDiscount + $tierDiscount + $voucherDiscount,
                'final_total'        => $totalPrice,
                'voucher_id'         => $voucherId,
                'voucher_code'       => $voucherCode,
                'status'             => 'pending',
                'payment_status'     => 'unpaid',
            ]);

            $order->items()->createMany($items);

            if ($tableNumber && ($table = Table::find((int) $tableNumber))) {
                $table->update([
                    'status' => 'occupied',
                    'current_order_id' => $order->id,
                ]);
            }

            if ($voucherId && $user) {
                VoucherUsage::create([
                    'voucher_id'      => $voucherId,
                    'user_id'         => $user->id,
                    'order_id'        => $order->id,
                    'discount_amount' => $voucherDiscount,
                ]);
            }

            // Ghi nhận dòng tiền cho user để thăng hạng
            if ($user) {
                $user->increment('total_spent', $totalPrice);
                $user->increment('total_orders');
                $user->recalculateTier();
            }

            if ($tableNumber) {
                \App\Models\Notification::createNotification(
                    "Bàn {$tableNumber} vừa đặt món",
                    "Đơn mới #{$order->id} từ khách tại bàn {$tableNumber}.",
                    "order",
                    "/admin/orders/{$order->id}"
                );
                if (isset($table)) {
                    event(new TableWorkflowUpdated($table->id, $table->name, 'occupied', 'order_created', $order->id));
                }
            }

            return $order;
        });
    }

    /**
     * Tiến hành Hủy đơn vĩnh viễn
     */
    public function destroyOrder(Order $order)
    {
        return DB::transaction(function () use ($order) {
            // Nếu đơn chưa hoàn tất hoặc đã hủy rùi thì không cộng kho lại, nếu ko thì cộng vô
            if (!in_array($order->status, ['completed', 'cancelled'])) {
                $this->restoreInventory($order);
            }
            $order->delete();
        });
    }

    /**
     * Chuyển Status của đơn hàng
     * Cực kỳ quan trọng: Nếu Hủy đơn (cancelled), Tự động Hoàn kho!
     */
    public function changeOrderStatus(Order $order, string $newStatus, ?string $cancelReason = null, bool $isUserCancelled = false)
    {
        $old = $order->status;

        if (in_array($old, ['completed', 'cancelled'])) {
            abort(422, "Hệ thống bảo vệ: Không thể thay đổi hóa đơn đã '{$old}'.");
        }

        $flow = ['pending', 'confirmed', 'preparing', 'ready', 'serving', 'completed'];
        $oldIndex = array_search($old, $flow);
        $newIndex = array_search($newStatus, $flow);

        if ($newStatus !== 'cancelled' && $newIndex !== false && $oldIndex !== false && $newIndex < $oldIndex) {
            abort(422, 'Không được phép tua ngược trạng thái của một đơn hàng vật lý.');
        }

        if ($newStatus === 'cancelled') {
            $cancelPolicy = OrderCancelPolicy::evaluate($order);
            if (!($cancelPolicy['can_cancel'] ?? false)) {
                abort(422, $cancelPolicy['reason'] ?? 'Không thể hủy đơn ở trạng thái hiện tại.');
            }
        }

        return DB::transaction(function () use ($order, $newStatus, $cancelReason, $isUserCancelled) {
            if ($newStatus === 'cancelled') {
                $this->restoreInventory($order);
            }

            $updateData = ['status' => $newStatus];
            if ($newStatus === 'cancelled' && $cancelReason) {
                $normalizedReason = trim($cancelReason);
                if ($normalizedReason !== '') {
                    $currentNote = trim((string) ($order->notes ?? ''));
                    $cancelNote = "Lý do hủy: {$normalizedReason}";
                    $updateData['notes'] = $currentNote !== ''
                        ? "{$currentNote}\n{$cancelNote}"
                        : $cancelNote;
                }
            }
            if ($newStatus === 'cancelled') {
                $updateData['cancelled_at'] = now();
                $updateData['cancel_reason'] = $cancelReason;
                $updateData['is_user_cancelled'] = $isUserCancelled;
                $updateData['cancel_requested_at'] = null;
            }

            $order->update($updateData);

            if ($newStatus === 'completed' && $order->user?->email) {
                try {
                    Mail::to($order->user->email)->send(new OrderCompletedMail($order));
                } catch (\Throwable $e) {
                    Log::warning('Send completed order email failed: ' . $e->getMessage());
                }
            }

            if ($newStatus === 'completed') {
                $freshOrder = $order->fresh('user');
                app(LoyaltyService::class)->earnPointsForCompletedOrder($freshOrder);
                if ($freshOrder->user) {
                    app(AutomationService::class)->triggerLoyaltyEligibleRewardForUser($freshOrder->user);
                }
            }
            return $order;
        });
    }

    /**
     * Logic Hoàn kho (Sử dụng Database Row Locking để tranh Race conditions)
     */
    private function restoreInventory(Order $order)
    {
        $order->loadMissing('items');
        foreach ($order->items as $item) {
            $itemType = $item->item_type ?? 'product';
            if ($itemType === 'combo') {
                $comboItems = is_array($item->options_snapshot['combo_items'] ?? null)
                    ? $item->options_snapshot['combo_items']
                    : [];

                foreach ($comboItems as $comboItem) {
                    $pid = (int) ($comboItem['product_id'] ?? 0);
                    if ($pid <= 0) continue;

                    // Hoàn kho theo số lượng trong combo * số combo đã đặt
                    $componentQty = max(1, (int) ($comboItem['quantity'] ?? 1));
                    $restoreQty = $componentQty * max(1, (int) $item->quantity);
                    Product::lockForUpdate()->find($pid)?->increment('stock', $restoreQty);
                }
                continue;
            }

            Product::lockForUpdate()->find($item->product_id)?->increment('stock', $item->quantity);
        }
    }
}
