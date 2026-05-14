<?php

namespace App\Services;

use App\Models\LoyaltyPointTransaction;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyRewardCatalog;
use App\Models\Order;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LoyaltyService
{
    private const TIER_MULTIPLIER = [
        'regular' => 1.0,
        'silver' => 1.1,
        'gold' => 1.25,
        'vip' => 1.5,
    ];

    public function earnPointsForCompletedOrder(Order $order): ?LoyaltyPointTransaction
    {
        if (!$order->user_id || $order->status !== 'completed') {
            return null;
        }

        $exists = LoyaltyPointTransaction::where('order_id', $order->id)
            ->where('type', 'earn')
            ->exists();
        if ($exists) {
            return null;
        }

        $user = $order->user ?? User::find($order->user_id);
        if (!$user) {
            return null;
        }

        $basePoints = (int) floor(((float) $order->final_total) / 10000); // 10k = 1 point
        $multiplier = self::TIER_MULTIPLIER[$user->tier] ?? 1.0;
        $points = max(1, (int) floor($basePoints * $multiplier));

        return LoyaltyPointTransaction::create([
            'user_id' => $user->id,
            'order_id' => $order->id,
            'type' => 'earn',
            'points' => $points,
            'source' => 'order_completed',
            'note' => "Earn points from order #{$order->id}",
            'meta' => [
                'tier' => $user->tier,
                'multiplier' => $multiplier,
                'base_points' => $basePoints,
            ],
        ]);
    }

    public function getPointsSummary(User $user): array
    {
        $earned = (int) LoyaltyPointTransaction::where('user_id', $user->id)
            ->where('type', 'earn')
            ->sum('points');
        $redeemed = abs((int) LoyaltyPointTransaction::where('user_id', $user->id)
            ->where('type', 'redeem')
            ->sum('points'));
        $adjust = (int) LoyaltyPointTransaction::where('user_id', $user->id)
            ->where('type', 'adjust')
            ->sum('points');
        $available = max(0, $earned - $redeemed + $adjust);

        return [
            'earned' => $earned,
            'redeemed' => $redeemed,
            'adjustment' => $adjust,
            'available' => $available,
        ];
    }

    public function redeemReward(User $user, LoyaltyRewardCatalog $reward): LoyaltyRedemption
    {
        return DB::transaction(function () use ($user, $reward) {
            if (!$reward->is_active) {
                abort(422, 'Phần quà hiện không khả dụng.');
            }

            if ($reward->monthly_limit) {
                $usedThisMonth = LoyaltyRedemption::where('user_id', $user->id)
                    ->where('reward_catalog_id', $reward->id)
                    ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])
                    ->count();
                if ($usedThisMonth >= $reward->monthly_limit) {
                    abort(422, 'Bạn đã dùng hết lượt đổi quà trong tháng.');
                }
            }

            $summary = $this->getPointsSummary($user);
            if ($summary['available'] < $reward->points_cost) {
                abort(422, 'Bạn không đủ điểm để đổi phần quà này.');
            }

            $code = 'LOYALTY' . strtoupper(Str::random(6));
            $voucher = Voucher::create([
                'code' => $code,
                'name' => 'Loyalty Reward - ' . $reward->name,
                'description' => 'Voucher đổi từ điểm thưởng.',
                'discount_type' => 'amount',
                'discount_value' => $reward->voucher_amount,
                'max_discount' => null,
                'min_order_amount' => $reward->min_order_amount,
                'apply_to' => 'all',
                'usage_limit' => 1,
                'usage_per_user' => 1,
                'used_count' => 0,
                'start_date' => now(),
                'end_date' => now()->addDays(max(1, $reward->voucher_valid_days)),
                'tier_restriction' => 'all',
                'is_active' => true,
            ]);

            $pointTx = LoyaltyPointTransaction::create([
                'user_id' => $user->id,
                'type' => 'redeem',
                'points' => -abs((int) $reward->points_cost),
                'source' => 'reward_redeem',
                'note' => "Redeem reward: {$reward->name}",
                'meta' => [
                    'reward_catalog_id' => $reward->id,
                    'voucher_id' => $voucher->id,
                ],
            ]);

            return LoyaltyRedemption::create([
                'user_id' => $user->id,
                'reward_catalog_id' => $reward->id,
                'voucher_id' => $voucher->id,
                'point_transaction_id' => $pointTx->id,
                'points_used' => (int) $reward->points_cost,
                'status' => 'success',
            ]);
        });
    }
}
