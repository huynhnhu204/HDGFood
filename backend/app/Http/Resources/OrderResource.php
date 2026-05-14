<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Support\OrderCancelPolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    private const STATUS_LABELS = [
        'pending'    => 'Chờ xác nhận',
        'confirmed'  => 'Đã xác nhận',
        'preparing'  => 'Đang chế biến',
        'ready'      => 'Sẵn sàng',
        'serving'    => 'Đang phục vụ',
        'completed'  => 'Hoàn thành',
        'cancelled'  => 'Đã hủy',
    ];

    public function toArray(Request $request): array
    {
        $dbSubtotal = (float) ($this->total ?? 0);
        $dbFinal = (float) ($this->final_total ?? 0);
        $itemsSum = $this->sumItemsSubtotal();
        $subtotal = $dbSubtotal > 0 ? $dbSubtotal : $itemsSum;

        $discount = (float) ($this->discount_amount ?? 0);
        $shipping = (float) ($this->shipping_fee ?? 0);
        $totalPrice = $dbFinal > 0 ? $dbFinal : max(0.0, $subtotal - $discount) + $shipping;
        $cancelPolicy = OrderCancelPolicy::evaluate($this->resource);

        $isAdmin = $request->user()?->isAdmin() === true;
        $profileRemoved = $this->user_id === null && $this->customer_account_detached_at !== null;
        $emailSnapshot = $this->customer_email_snapshot;
        $sameEmailActiveCustomer = false;
        if ($isAdmin && $profileRemoved && $emailSnapshot) {
            $sameEmailActiveCustomer = User::query()
                ->where('role', 'user')
                ->whereNull('deleted_at')
                ->where('email', $emailSnapshot)
                ->exists();
        }

        return [
            'id'                    => $this->id,
            'order_number'          => $this->order_number,
            'customer_name'         => $this->delivery_name,
            'customer_phone'        => $this->delivery_phone,
            'table_number'          => $this->shipping_address, // Dùng shipping_address làm table_number
            'note'                  => $this->notes,
            'status'                => $this->status,
            'status_label'          => self::STATUS_LABELS[$this->status] ?? $this->status,
            'cancel_policy'         => $cancelPolicy,
            'cancel_reason'         => $this->cancel_reason,
            'cancel_reject_reason_code' => $this->cancel_reject_reason_code,
            'cancel_reject_reason_label' => $this->cancelRejectReason?->label,
            'cancelled_at'          => $this->cancelled_at?->toDateTimeString(),
            'customer_profile_removed' => $this->user_id === null && $this->customer_account_detached_at !== null,
            'is_guest_order' => $this->user_id === null && $this->customer_account_detached_at === null,
            'customer_email_snapshot' => $isAdmin ? $emailSnapshot : null,
            'same_email_active_customer_exists' => $isAdmin ? $sameEmailActiveCustomer : false,
            'is_user_cancelled'     => (bool) $this->is_user_cancelled,
            'payment_status'        => $this->payment_status,
            'payment_method'        => $this->payment_method,
            'subtotal'              => $subtotal,
            'subtotal_formatted'    => number_format($subtotal, 0, ',', '.') . '₫',
            'promotion_discount'    => 0,
            'promotion_discount_formatted' => '0₫',
            'tier_discount'         => 0,
            'tier_discount_formatted' => '0₫',
            'voucher_discount'      => $discount,
            'voucher_discount_formatted' => number_format($discount, 0, ',', '.') . '₫',
            'voucher_code'          => $this->voucher_code,
            'total_price'           => $totalPrice,
            'total_price_formatted' => number_format($totalPrice, 0, ',', '.') . '₫',
            'shipping_fee'          => $shipping,
            'shipping_fee_formatted' => number_format($shipping, 0, ',', '.') . '₫',
            'total_cost'            => round($this->total_cost, 2),
            'total_profit'          => round($this->total_profit, 2),
            'created_at'            => $this->created_at->format('d/m/Y H:i'),
            'updated_at'            => $this->updated_at->format('d/m/Y H:i'),
            'user'                  => $this->when(
                $this->relationLoaded('user'),
                fn () => $this->user ? new UserResource($this->user) : null
            ),
            'items'                 => OrderItemResource::collection($this->whenLoaded('items')),
            'voucher'               => $this->whenLoaded('voucher', fn() => $this->voucher ? new VoucherResource($this->voucher) : null),
        ];
    }

    /** Cộng dòng hàng khi cột total đơn = 0 (dữ liệu cũ / lỗi ghi DB). */
    private function sumItemsSubtotal(): float
    {
        if (! $this->relationLoaded('items') || $this->items->isEmpty()) {
            return 0.0;
        }

        return (float) $this->items->sum(fn ($item) => (float) $item->price * (int) $item->quantity);
    }
}
