<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoyaltyRedemption extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'reward_catalog_id',
        'voucher_id',
        'point_transaction_id',
        'points_used',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function rewardCatalog()
    {
        return $this->belongsTo(LoyaltyRewardCatalog::class, 'reward_catalog_id');
    }

    public function voucher()
    {
        return $this->belongsTo(Voucher::class);
    }

    public function pointTransaction()
    {
        return $this->belongsTo(LoyaltyPointTransaction::class, 'point_transaction_id');
    }
}
