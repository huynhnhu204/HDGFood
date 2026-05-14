<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'email', 'deleted_original_email', 'password', 'role', 'phone', 'address',
        'province_code', 'district_code', 'ward_code',
        'tier', 'total_spent', 'total_orders', 'is_active',
        'google_id', 'avatar',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
        'total_spent'       => 'decimal:2',
        'is_active'         => 'boolean',
        'deleted_at'        => 'datetime',
        /** At-rest encryption (APP_KEY); không đổi key production nếu đã có bản ghi đã đóng TK */
        'deleted_original_email' => 'encrypted',
    ];

    // Tier thresholds (tổng tiền đã chi)
    const TIERS = [
        'regular' => 0,
        'silver'  => 1_000_000,
        'gold'    => 3_000_000,
        'vip'     => 5_000_000,
    ];

    // Discount % theo tier — chỉ áp dụng khi bill >= 1.000.000đ
    const DISCOUNTS = [
        'regular' => 0,
        'silver'  => 5,
        'gold'    => 10,
        'vip'     => 15,
    ];

    // Đơn tối thiểu để được giảm tier
    const TIER_MIN_ORDER = 1_000_000;

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function voucherUsages()
    {
        return $this->hasMany(VoucherUsage::class);
    }

    public function wishlists()
    {
        return $this->hasMany(Wishlist::class);
    }

    public function wishedProducts()
    {
        return $this->belongsToMany(Product::class, 'wishlists')->withTimestamps();
    }

    public function loyaltyPointTransactions()
    {
        return $this->hasMany(LoyaltyPointTransaction::class);
    }

    public function loyaltyRedemptions()
    {
        return $this->hasMany(LoyaltyRedemption::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function discountPercent(): int
    {
        return self::DISCOUNTS[$this->tier] ?? 0;
    }

    /**
     * Tính tier discount cho một đơn hàng cụ thể
     * Chỉ áp dụng khi subtotal >= TIER_MIN_ORDER
     */
    public function calcTierDiscount(float $subtotal): float
    {
        if ($subtotal < self::TIER_MIN_ORDER) return 0;
        $percent = $this->discountPercent();
        if ($percent === 0) return 0;
        return round($subtotal * ($percent / 100), 2);
    }

    /**
     * Tính lại tier dựa trên total_spent
     */
    public function recalculateTier(): void
    {
        $spent = (float) $this->total_spent;
        $tier  = 'regular';
        foreach (self::TIERS as $t => $min) {
            if ($spent >= $min) $tier = $t;
        }
        $this->update(['tier' => $tier]);
    }
}
