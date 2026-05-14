<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\User;
use App\Services\AutomationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AutomationServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_dedupes_cart_abandoned_campaign(): void
    {
        $user = User::factory()->create();
        Order::create([
            'order_number' => 'ORDTEST2001',
            'user_id' => $user->id,
            'total' => 150000,
            'discount_amount' => 0,
            'final_total' => 150000,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'created_at' => now()->subHours(3),
            'updated_at' => now()->subHours(3),
        ]);

        $service = app(AutomationService::class);
        $service->run();
        $service->run();

        $this->assertEquals(
            1,
            \App\Models\AutomationCampaignLog::where('campaign_type', 'cart_abandoned')->count()
        );
    }
}
