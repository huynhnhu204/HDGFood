<?php

namespace App\Http\Controllers;

use App\Events\TableWorkflowUpdated;
use App\Mail\OrderCompletedMail;
use App\Models\Order;
use App\Models\Product;
use App\Models\Table;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Http\Controllers\Concerns\AppliesAdminTrashIndex;

class TableController extends Controller
{
    use AppliesAdminTrashIndex;
    public function available()
    {
        $tables = Table::query()
            ->where('status', 'available')
            ->orderBy('area')
            ->orderBy('name')
            ->get(['id', 'name', 'area', 'status', 'capacity']);

        return response()->json(['data' => $tables]);
    }

    public function publicList()
    {
        $tables = Table::query()
            ->orderBy('area')
            ->orderBy('name')
            ->get(['id', 'name', 'area', 'status', 'capacity']);

        return response()->json(['data' => $tables]);
    }

    public function publicStatus(Table $table)
    {
        return response()->json([
            'data' => [
                'id' => $table->id,
                'name' => $table->name,
                'status' => $table->status,
                'current_order_id' => $table->current_order_id,
                'session_token' => $table->session_token,
            ],
        ]);
    }

    public function publicCurrentOrder(Table $table)
    {
        $order = null;
        if ($table->current_order_id) {
            $order = Order::with(['items.product', 'items.combo'])->find($table->current_order_id);
        }

        if (! $order) {
            $order = Order::with(['items.product', 'items.combo'])
                ->where('shipping_address', (string) $table->id)
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->latest()
                ->first();
        }

        if (! $order) {
            return response()->json(['data' => null]);
        }

        return response()->json([
            'data' => [
                'id' => $order->id,
                'status' => $order->status,
                'total' => (float) $order->total,
                'discount_amount' => (float) $order->discount_amount,
                'final_total' => (float) $order->final_total,
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'item_type' => $item->item_type ?? 'product',
                        'combo_id' => $item->combo_id,
                        'product_id' => $item->product_id,
                        'name' => ($item->item_type ?? 'product') === 'combo'
                            ? ($item->combo?->name ?? 'Combo')
                            : ($item->product?->name ?? 'Món đã xóa'),
                        'image' => ($item->item_type ?? 'product') === 'combo'
                            ? $item->combo?->image
                            : $item->product?->image,
                        'quantity' => (int) $item->quantity,
                        'price' => (float) $item->price,
                        'subtotal' => (float) $item->price * (int) $item->quantity,
                    ];
                })->values(),
            ],
        ]);
    }

    public function claimSession(Table $table)
    {
        if ($table->status !== 'available' && $table->session_token) {
            return response()->json(['message' => 'Bàn này đang có khách, vui lòng chọn bàn khác.'], 409);
        }

        $token = Str::random(48);
        $table->update([
            'session_token' => $token,
            'session_locked_at' => now(),
        ]);

        event(new TableWorkflowUpdated($table->id, $table->name, $table->status, 'session_claimed'));

        return response()->json([
            'message' => 'Đã giữ bàn thành công.',
            'data' => [
                'table_id' => $table->id,
                'table_name' => $table->name,
                'session_token' => $token,
            ],
        ]);
    }

    public function index(Request $request)
    {
        $query = Table::with(['currentOrder' => function ($q) {
            $q->select('id', 'final_total', 'status');
        }])->orderBy('area')->orderBy('name');

        if ($request->user()?->isAdmin()) {
            $this->applyAdminTrashIndexScope($query, $request);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'area' => 'nullable|string|max:255',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(5);
        $table = Table::create($validated);

        return response()->json($table, 201);
    }

    public function show(Table $table)
    {
        $table->load(['currentOrder.items.product', 'currentOrder.items.combo']);
        return response()->json($table);
    }

    public function update(Request $request, Table $table)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'capacity' => 'required|integer|min:1',
            'area' => 'nullable|string|max:255',
        ]);

        if ($table->name !== $validated['name']) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(5);
        }

        $table->update($validated);
        return response()->json($table);
    }

    public function destroy(Table $table)
    {
        if ($table->status === 'occupied') {
            return response()->json(['message' => 'Không thể xóa bàn đang có khách'], 400);
        }
        $table->delete();
        return response()->json(['message' => 'Đã xóa bàn thành công']);
    }

    public function updateStatus(Request $request, Table $table)
    {
        $validated = $request->validate([
            'status' => 'required|in:available,occupied,reserved',
            'current_order_id' => 'nullable|exists:orders,id',
        ]);

        $table->update($validated);

        if ($validated['status'] === 'occupied') {
            \App\Models\Notification::createNotification(
                "Bàn {$table->name} đang sử dụng",
                "Có khách vào ngồi tại bàn {$table->name}.",
                "table",
                "/admin/tables/{$table->id}"
            );
        }
        event(new TableWorkflowUpdated($table->id, $table->name, $validated['status'], 'status_changed', $table->current_order_id));

        return response()->json([
            'message' => 'Cập nhật trạng thái thành công',
            'table' => $table->fresh(['currentOrder'])
        ]);
    }

    /**
     * Public: khách bắt đầu gọi món -> chuyển bàn sang occupied.
     */
    public function occupyFromClient(Table $table)
    {
        $this->assertValidTableSession($table, request());

        if ($table->status === 'available') {
            $table->update(['status' => 'occupied']);
            event(new TableWorkflowUpdated($table->id, $table->name, 'occupied', 'occupied'));
        }

        return response()->json([
            'message' => 'Đã mở bàn cho phiên khách.',
            'table' => $table->fresh(['currentOrder']),
        ]);
    }

    public function requestPayment(Table $table)
    {
        $this->assertValidTableSession($table, request());

        if ($table->status !== 'reserved') {
            $table->update(['status' => 'reserved']);
        }

        \App\Models\Notification::createNotification(
            "Bàn {$table->name} yêu cầu thanh toán",
            "Khách tại {$table->name} vừa bấm gọi thanh toán.",
            "table",
            "/admin/tables/{$table->id}"
        );
        event(new TableWorkflowUpdated($table->id, $table->name, 'reserved', 'payment_requested', $table->current_order_id));

        return response()->json([
            'message' => 'Đã gửi yêu cầu thanh toán đến admin.',
            'table' => $table->fresh(['currentOrder']),
        ]);
    }

    public function completePayment(Request $request, Table $table)
    {
        $data = $request->validate([
            'payment_method' => 'nullable|string|max:50',
        ]);

        $result = DB::transaction(function () use ($table, $data) {
            $order = null;
            if ($table->current_order_id) {
                $order = Order::lockForUpdate()->find($table->current_order_id);
            }

            if (! $order) {
                $order = Order::where('shipping_address', (string) $table->id)
                    ->whereIn('status', ['pending', 'confirmed', 'reserved'])
                    ->latest()
                    ->lockForUpdate()
                    ->first();
            }

            if ($order) {
                $order->update([
                    'status' => 'completed',
                    'payment_status' => 'paid',
                    'payment_method' => $data['payment_method'] ?? $order->payment_method ?? 'cod',
                ]);
            }

            $table->update([
                'status' => 'available',
                'current_order_id' => null,
                'session_token' => null,
                'session_locked_at' => null,
            ]);

            return $order;
        });

        \App\Models\Notification::createNotification(
            "Hoàn tất thanh toán {$table->name}",
            "Bàn {$table->name} đã thanh toán và sẵn sàng phục vụ khách mới.",
            "table",
            "/admin/tables/{$table->id}"
        );
        event(new TableWorkflowUpdated($table->id, $table->name, 'available', 'payment_completed', $result?->id));

        if ($result?->user?->email) {
            try {
                Mail::to($result->user->email)->send(new OrderCompletedMail($result));
            } catch (\Throwable $e) {
                Log::warning('Send completed order email failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => 'Đã hoàn tất thu tiền và giải phóng bàn.',
            'table' => $table->fresh(['currentOrder']),
            'order' => $result,
        ]);
    }

    public function addItems(Request $request, Table $table)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $result = DB::transaction(function () use ($table, $data) {
            $lockedTable = Table::lockForUpdate()->findOrFail($table->id);

            $order = null;
            if ($lockedTable->current_order_id) {
                $order = Order::lockForUpdate()->find($lockedTable->current_order_id);
                if ($order && in_array($order->status, ['completed', 'cancelled'])) {
                    $order = null;
                }
            }

            if (! $order) {
                $order = Order::where('shipping_address', (string) $lockedTable->id)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->latest()
                    ->lockForUpdate()
                    ->first();
            }

            if (! $order) {
                abort(422, 'Bàn này chưa có đơn hàng hoạt động để thêm món.');
            }

            $preparedItems = [];
            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $product = Product::lockForUpdate()->findOrFail((int) $item['product_id']);
                $quantity = (int) $item['quantity'];

                if ($product->stock < $quantity) {
                    abort(422, "Món '{$product->name}' không đủ số lượng.");
                }

                $product->decrement('stock', $quantity);
                $linePrice = (float) $product->price;
                $subtotal += $linePrice * $quantity;

                $preparedItems[] = [
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price' => $linePrice,
                    'cost_price' => $product->cost_price ?? 0,
                ];
            }

            $order->items()->createMany($preparedItems);
            $order->update([
                'total' => (float) $order->total + $subtotal,
                'final_total' => (float) $order->final_total + $subtotal,
            ]);

            $lockedTable->update([
                'status' => $lockedTable->status === 'available' ? 'occupied' : $lockedTable->status,
                'current_order_id' => $order->id,
            ]);

            \App\Models\Notification::createNotification(
                "Bàn {$lockedTable->name} gọi thêm món",
                "Đã cộng món mới vào đơn #{$order->id}.",
                "order",
                "/admin/orders/{$order->id}"
            );
            event(new TableWorkflowUpdated($lockedTable->id, $lockedTable->name, $lockedTable->status, 'order_appended', $order->id));

            return [
                'table' => $lockedTable->fresh(['currentOrder']),
                'order' => $order->fresh(['items.product']),
            ];
        });

        return response()->json([
            'message' => 'Đã thêm món vào đơn hiện tại.',
            'table' => $result['table'],
            'order' => $result['order'],
        ]);
    }

    private function assertValidTableSession(Table $table, Request $request): void
    {
        $token = (string) ($request->input('session_token') ?? $request->header('X-Table-Token') ?? '');
        if (! $table->session_token || $table->session_token !== $token) {
            abort(409, 'Bàn này đang có khách, vui lòng chọn bàn khác.');
        }
    }
}
