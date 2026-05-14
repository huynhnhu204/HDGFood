<?php

namespace Tests\Feature;

use App\Models\LoyaltyRewardCatalog;
use App\Models\Order;
use App\Models\User;
use App\Services\LoyaltyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoyaltyServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_earns_points_once_per_completed_order(): void
    {
        $user = User::factory()->create(['tier' => 'regular']);
        $order = Order::create([
            'order_number' => 'ORDTEST1001',
            'user_id' => $user->id,
            'total' => 200000,
            'discount_amount' => 0,
            'final_total' => 200000,
            'status' => 'completed',
            'payment_status' => 'paid',
        ]);

        $service = app(LoyaltyService::class);
        $service->earnPointsForCompletedOrder($order);
        $service->earnPointsForCompletedOrder($order);

        $this->assertDatabaseCount('loyalty_point_transactions', 1);
    }

    public function test_user_can_redeem_reward_and_get_voucher(): void
    {
        $user = User::factory()->create(['tier' => 'gold']);

        // Seed available points via earn transactions.
        $service = app(LoyaltyService::class);
        \App\Models\LoyaltyPointTransaction::create([
            'user_id' => $user->id,
            'type' => 'earn',
            'points' => 1000,
            'source' => 'test',
        ]);

        $reward = LoyaltyRewardCatalog::create([
            'name' => 'Voucher 50K',
            'points_cost' => 500,
            'voucher_amount' => 50000,
            'min_order_amount' => 100000,
            'voucher_valid_days' => 30,
            'is_active' => true,
        ]);

        $redemption = $service->redeemReward($user, $reward);

        $this->assertNotNull($redemption->voucher_id);
        $this->assertDatabaseHas('loyalty_point_transactions', [
            'user_id' => $user->id,
            'type' => 'redeem',
            'points' => -500,
        ]);
    }
}
