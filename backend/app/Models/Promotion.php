<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Promotion extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'name', 'discount_type', 'discount_value',
        'min_order_amount', 'start_date', 'end_date', 'is_active',
    ];

    protected $casts = [
        'discount_value'   => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'start_date'       => 'datetime',
        'end_date'         => 'datetime',
        'is_active'        => 'boolean',
    ];

    public function products()
    {
        return $this->belongsToMany(Product::class, 'promotion_product');
    }

    /**
     * Kiểm tra khuyến mãi có đang chạy không
     */
    public function isRunning(): bool
    {
        if (!$this->is_active) return false;
        
        $now = Carbon::now();
        return $now->between($this->start_date, $this->end_date);
    }

    /**
     * Tính số tiền giảm cho sản phẩm
     */
    public function calculateDiscount(float $price, float $quantity = 1): float
    {
        if (!$this->isRunning()) return 0;

        $subtotal = $price * $quantity;
        
        // Kiểm tra đơn tối thiểu
        if ($this->min_order_amount && $subtotal < $this->min_order_amount) {
            return 0;
        }

        if ($this->discount_type === 'percent') {
            return round($subtotal * ($this->discount_value / 100), 2);
        }

        return min($this->discount_value, $subtotal);
    }

    /**
     * Scope: Khuyến mãi đang chạy
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
                     ->where('start_date', '<=', Carbon::now())
                     ->where('end_date', '>=', Carbon::now());
    }
}
