<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Voucher extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'code', 'name', 'description', 'discount_type', 'discount_value', 'max_discount',
        'min_order_amount', 'apply_to', 'usage_limit', 'usage_per_user', 'used_count',
        'start_date', 'end_date', 'tier_restriction', 'is_active',
    ];

    protected $casts = [
        'discount_value'   => 'decimal:2',
        'max_discount'     => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'start_date'       => 'datetime',
        'end_date'         => 'datetime',
        'is_active'        => 'boolean',
    ];

    public function products()
    {
        return $this->belongsToMany(Product::class, 'voucher_products');
    }

    public function usages()
    {
        return $this->hasMany(VoucherUsage::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Kiểm tra voucher có hợp lệ không
     */
    public function isValid(): bool
    {
        if (!$this->is_active) return false;
        
        $now = Carbon::now();
        if (!$now->between($this->start_date, $this->end_date)) return false;

        // Kiểm tra giới hạn sử dụng
        if ($this->usage_limit && $this->used_count >= $this->usage_limit) {
            return false;
        }

        return true;
    }

    /**
     * Kiểm tra user có thể dùng voucher này không
     */
    public function canBeUsedBy(User $user): bool
    {
        if (!$this->isValid()) return false;

        // Kiểm tra tier restriction
        if ($this->tier_restriction !== 'all') {
            $tiers = ['silver', 'gold', 'vip'];
            $requiredIndex = array_search($this->tier_restriction, $tiers);
            $userIndex = array_search($user->tier, $tiers);
            
            if ($userIndex === false || $userIndex < $requiredIndex) {
                return false;
            }
        }

        // Kiểm tra số lần dùng của user
        $userUsageCount = $this->usages()->where('user_id', $user->id)->count();
        if ($userUsageCount >= $this->usage_per_user) {
            return false;
        }

        return true;
    }

    /**
     * Tính số tiền giảm
     */
    public function calculateDiscount(float $subtotal, array $productIds = []): float
    {
        // Kiểm tra đơn tối thiểu
        if ($this->min_order_amount && $subtotal < $this->min_order_amount) {
            return 0;
        }

        // Nếu áp dụng cho sản phẩm cụ thể
        if ($this->apply_to === 'products') {
            $voucherProductIds = $this->products()->pluck('products.id')->toArray();
            $applicableProducts = array_intersect($productIds, $voucherProductIds);
            
            if (empty($applicableProducts)) {
                return 0;
            }
        }

        if ($this->discount_type === 'percent') {
            $discount = $subtotal * ($this->discount_value / 100);
            
            // Áp dụng giảm tối đa nếu có
            if ($this->max_discount) {
                $discount = min($discount, $this->max_discount);
            }
            
            return round($discount, 2);
        }

        return min($this->discount_value, $subtotal);
    }

    /**
     * Scope: Voucher đang hoạt động
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
                     ->where('start_date', '<=', Carbon::now())
                     ->where('end_date', '>=', Carbon::now())
                     ->where(function($q) {
                         $q->whereNull('usage_limit')
                           ->orWhereRaw('used_count < usage_limit');
                     });
    }
}
