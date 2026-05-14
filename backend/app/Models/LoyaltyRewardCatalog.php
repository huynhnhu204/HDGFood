<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyRewardCatalog extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'points_cost',
        'voucher_amount',
        'min_order_amount',
        'voucher_valid_days',
        'monthly_limit',
        'is_active',
    ];

    protected $casts = [
        'voucher_amount' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function redemptions()
    {
        return $this->hasMany(LoyaltyRedemption::class, 'reward_catalog_id');
    }
}
