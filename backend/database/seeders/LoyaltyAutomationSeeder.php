<?php

namespace Database\Seeders;

use App\Models\AutomationCampaignLog;
use App\Models\LoyaltyPointTransaction;
use App\Models\LoyaltyRedemption;
use App\Models\LoyaltyRewardCatalog;
use App\Models\Order;
use App\Models\User;
use App\Models\Voucher;
use Illuminate\Database\Seeder;

class LoyaltyAutomationSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedRewardCatalogs();
        $this->seedTransactionsAndRedemptions();
        $this->seedAutomationLogs();
    }

    private function seedRewardCatalogs(): void
    {
        $catalogs = [
            [
                'name' => 'Voucher 20K',
                'description' => 'Doi 200 diem lay voucher 20.000d',
                'points_cost' => 200,
                'voucher_amount' => 20000,
                'min_order_amount' => 80000,
                'voucher_valid_days' => 15,
                'monthly_limit' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'Voucher 50K',
                'description' => 'Doi 500 diem lay voucher 50.000d',
                'points_cost' => 500,
                'voucher_amount' => 50000,
                'min_order_amount' => 150000,
                'voucher_valid_days' => 20,
                'monthly_limit' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'Voucher 80K',
                'description' => 'Doi 800 diem lay voucher 80.000d',
                'points_cost' => 800,
                'voucher_amount' => 80000,
                'min_order_amount' => 220000,
                'voucher_valid_days' => 25,
                'monthly_limit' => 2,
                'is_active' => true,
            ],
        ];

        foreach ($catalogs as $catalog) {
            LoyaltyRewardCatalog::updateOrCreate(
                ['name' => $catalog['name']],
                $catalog
            );
        }
    }

    private function seedTransactionsAndRedemptions(): void
    {
        $users = User::where('role', 'user')->take(3)->get();
        if ($users->isEmpty()) {
            return;
        }

        $voucher = Voucher::first();
        $reward50k = LoyaltyRewardCatalog::where('name', 'Voucher 50K')->first();

        foreach ($users as $index => $user) {
            $completedOrder = Order::where('user_id', $user->id)
                ->where('status', 'completed')
                ->latest('id')
                ->first();

            LoyaltyPointTransaction::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'type' => 'earn',
                    'source' => 'order_completed',
                ],
                [
                    'order_id' => $completedOrder?->id,
                    'points' => 200 + ($index * 100),
                    'note' => 'Seed earn points from completed order',
                    'meta' => [
                        'seed' => true,
                        'order_number' => $completedOrder?->order_number,
                    ],
                ]
            );
        }

        $targetUser = $users->first();
        if (!$targetUser || !$reward50k) {
            return;
        }

        $redeemTx = LoyaltyPointTransaction::updateOrCreate(
            [
                'user_id' => $targetUser->id,
                'type' => 'redeem',
                'source' => 'reward_redeem',
            ],
            [
                'order_id' => null,
                'points' => -500,
                'note' => 'Seed redeem Voucher 50K',
                'meta' => [
                    'seed' => true,
                    'reward_catalog' => $reward50k->name,
                    'voucher_id' => $voucher?->id,
                ],
            ]
        );

        LoyaltyRedemption::updateOrCreate(
            [
                'user_id' => $targetUser->id,
                'reward_catalog_id' => $reward50k->id,
            ],
            [
                'voucher_id' => $voucher?->id,
                'point_transaction_id' => $redeemTx->id,
                'points_used' => 500,
                'status' => 'success',
            ]
        );
    }

    private function seedAutomationLogs(): void
    {
        $users = User::where('role', 'user')->take(3)->get();
        if ($users->isEmpty()) {
            return;
        }

        $campaigns = ['cart_abandoned', 'inactive_user', 'reorder_reminder'];

        foreach ($users as $i => $user) {
            $campaignType = $campaigns[$i % count($campaigns)];
            $dedupeKey = 'seed:' . $campaignType . ':user:' . $user->id . ':' . now()->format('Ym');

            AutomationCampaignLog::updateOrCreate(
                ['dedupe_key' => $dedupeKey],
                [
                    'user_id' => $user->id,
                    'campaign_type' => $campaignType,
                    'channel' => 'email',
                    'status' => $i === 2 ? 'failed' : ($i === 1 ? 'queued' : 'sent'),
                    'email' => $user->email,
                    'scheduled_at' => now(),
                    'sent_at' => $i === 0 ? now() : null,
                    'payload' => [
                        'seed' => true,
                        'subject' => 'Campaign ' . $campaignType,
                    ],
                ]
            );
        }
    }
}
