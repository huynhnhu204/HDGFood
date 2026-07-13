<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'customer_account_detached_at',
        'order_number',
        'total',
        'discount_amount',
        'final_total',
        'status',
        'payment_status',
        'payment_method',
        'payment_claimed_at',
        'vnpay_txn_ref',
        'shipping_address',
        'notes',
        'cancel_reason',
        'cancel_reject_reason_code',
        'cancelled_at',
        'cancel_requested_at',
        'is_user_cancelled',
        'promotion_id',
        'voucher_id',
        'voucher_code',
        'delivery_name',
        'delivery_phone',
        'customer_email_snapshot',
        'delivery_address',
        'delivery_province_code',
        'delivery_district_code',
        'delivery_ward_code',
        'delivery_latitude',
        'delivery_longitude',
        'delivery_distance_km',
        'shipping_fee',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'total'           => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_total'     => 'decimal:2',
        'shipping_fee'    => 'decimal:2',
        'delivery_latitude' => 'decimal:7',
        'delivery_longitude' => 'decimal:7',
        'delivery_distance_km' => 'decimal:2',
        'cancelled_at' => 'datetime',
        'cancel_requested_at' => 'datetime',
        'payment_claimed_at' => 'datetime',
        'is_user_cancelled' => 'boolean',
        'customer_account_detached_at' => 'datetime',
    ];

    public function user()    { return $this->belongsTo(User::class); }
    public function items()   { return $this->hasMany(OrderItem::class); }
    public function voucher() { return $this->belongsTo(Voucher::class); }
    public function cancelRejectReason() { return $this->belongsTo(CancelRejectReason::class, 'cancel_reject_reason_code', 'code'); }

    /**
     * Accessor: Tổng giá vốn của đơn hàng
     * Validates: Requirements 11.4, 11.5
     */
    public function getTotalCostAttribute(): float
    {
        return $this->items->sum(function ($item) {
            return ($item->cost_price ?? 0) * $item->quantity;
        });
    }

    /**
     * Accessor: Tổng lợi nhuận của đơn hàng
     * Validates: Requirements 11.1, 11.2
     */
    public function getTotalProfitAttribute(): float
    {
        return $this->items->sum(function ($item) {
            if (!$item->cost_price) return 0;
            return ($item->price - $item->cost_price) * $item->quantity;
        });
    }
}
