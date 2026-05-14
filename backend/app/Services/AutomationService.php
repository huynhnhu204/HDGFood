<?php

namespace App\Services;

use App\Jobs\SendAutomationEmailJob;
use App\Models\AutomationCampaignLog;
use App\Models\LoyaltyRewardCatalog;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class AutomationService
{
    private function canRunRule(string $rule): bool
    {
        return (bool) Cache::get("automation_rule_enabled:{$rule}", true);
    }

    public function run(): array
    {
        $count = [
            'cart_abandoned' => 0,
            'inactive_user' => 0,
            'reorder_reminder' => 0,
            'loyalty_eligible_reward' => 0,
        ];

        if ($this->canRunRule('cart_abandoned')) {
            $count['cart_abandoned'] = $this->runCartAbandoned();
        }
        if ($this->canRunRule('inactive_user')) {
            $count['inactive_user'] = $this->runInactiveUser();
        }
        if ($this->canRunRule('reorder_reminder')) {
            $count['reorder_reminder'] = $this->runReorderReminder();
        }
        if ($this->canRunRule('loyalty_eligible_reward')) {
            $count['loyalty_eligible_reward'] = $this->runLoyaltyEligibleReward();
        }

        return $count;
    }

    public function setRuleEnabled(string $rule, bool $enabled): void
    {
        Cache::forever("automation_rule_enabled:{$rule}", $enabled);
    }

    public function getRules(): array
    {
        $rules = ['cart_abandoned', 'inactive_user', 'reorder_reminder', 'loyalty_eligible_reward'];
        $result = [];
        foreach ($rules as $rule) {
            $result[] = [
                'rule' => $rule,
                'enabled' => $this->canRunRule($rule),
            ];
        }
        return $result;
    }

    private function runCartAbandoned(): int
    {
        $orders = Order::with('user')
            ->where('status', 'pending')
            ->where('created_at', '<=', now()->subHours(2))
            ->where('created_at', '>=', now()->subDays(2))
            ->whereNotNull('user_id')
            ->get();

        $count = 0;
        foreach ($orders as $order) {
            if (!$order->user?->email) continue;
            $dedupe = 'cart_abandoned:' . $order->id;
            if ($this->existsDedupe($dedupe)) continue;

            $this->queueCampaign(
                user: $order->user,
                campaignType: 'cart_abandoned',
                dedupeKey: $dedupe,
                subject: 'Bạn quên hoàn tất đơn hàng tại HDG Food',
                content: "Đơn #{$order->order_number} vẫn đang chờ thanh toán. Hoàn tất ngay để không bỏ lỡ món yêu thích.",
                extraPayload: [
                    'customer_name' => $order->user->name,
                    'title' => 'Giỏ hàng của bạn vẫn đang chờ',
                    'badge' => 'Cart Abandoned',
                    'cta_label' => 'Hoàn tất đơn ngay',
                    'cta_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/') . '/checkout',
                ]
            );
            $count++;
        }

        return $count;
    }

    private function runInactiveUser(): int
    {
        $users = User::where('role', 'user')
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('total_orders')->orWhere('total_orders', 0)->orWhere('updated_at', '<=', now()->subDays(30));
            })
            ->limit(100)
            ->get();

        $count = 0;
        foreach ($users as $user) {
            if (!$user->email) continue;
            $window = now()->format('Y-m');
            $dedupe = "inactive_user:{$user->id}:{$window}";
            if ($this->existsDedupe($dedupe)) continue;

            $this->queueCampaign(
                user: $user,
                campaignType: 'inactive_user',
                dedupeKey: $dedupe,
                subject: 'HDG Food nhớ bạn - quay lại nhận ưu đãi',
                content: 'Bạn đã lâu chưa quay lại. Hôm nay HDG Food có nhiều món mới và ưu đãi hấp dẫn dành cho bạn.',
                extraPayload: [
                    'customer_name' => $user->name,
                    'title' => 'HDG Food đang có món mới đợi bạn',
                    'badge' => 'Inactive User',
                    'cta_label' => 'Khám phá menu mới',
                    'cta_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/') . '/products',
                ]
            );
            $count++;
        }

        return $count;
    }

    private function runReorderReminder(): int
    {
        $orders = Order::with('user')
            ->where('status', 'completed')
            ->where('created_at', '<=', now()->subDays(21))
            ->where('created_at', '>=', now()->subDays(30))
            ->whereNotNull('user_id')
            ->get();

        $count = 0;
        foreach ($orders as $order) {
            if (!$order->user?->email) continue;
            $dedupe = 'reorder_reminder:' . $order->id;
            if ($this->existsDedupe($dedupe)) continue;

            $this->queueCampaign(
                user: $order->user,
                campaignType: 'reorder_reminder',
                dedupeKey: $dedupe,
                subject: 'Đã đến lúc gọi lại món bạn từng thích',
                content: "Bạn từng yêu thích đơn #{$order->order_number}. Đặt lại hôm nay để thưởng thức nhanh hơn.",
                extraPayload: [
                    'customer_name' => $order->user->name,
                    'title' => 'Gọi lại món bạn từng thích',
                    'badge' => 'Reorder Reminder',
                    'cta_label' => 'Đặt lại ngay',
                    'cta_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/') . '/products',
                ]
            );
            $count++;
        }

        return $count;
    }

    private function runLoyaltyEligibleReward(): int
    {
        $users = User::where('role', 'user')
            ->whereNotNull('email')
            ->limit(200)
            ->get();

        $count = 0;
        foreach ($users as $user) {
            $count += $this->triggerLoyaltyEligibleRewardForUser($user);
        }

        return $count;
    }

    public function triggerLoyaltyEligibleRewardForUser(User $user): int
    {
        if (!$this->canRunRule('loyalty_eligible_reward')) {
            return 0;
        }
        if (!$user->email) {
            return 0;
        }

        $summary = app(LoyaltyService::class)->getPointsSummary($user);
        $availablePoints = (int) ($summary['available'] ?? 0);
        if ($availablePoints <= 0) {
            return 0;
        }

        $eligibleRewards = LoyaltyRewardCatalog::query()
            ->where('is_active', true)
            ->where('points_cost', '<=', $availablePoints)
            ->orderByDesc('points_cost')
            ->get();

        $count = 0;
        $window = now()->format('Y-m');
        foreach ($eligibleRewards as $reward) {
            $dedupe = "loyalty_eligible_reward:{$user->id}:{$reward->id}:{$window}";
            if ($this->existsDedupe($dedupe)) {
                continue;
            }

            $this->queueCampaign(
                user: $user,
                campaignType: 'loyalty_eligible_reward',
                dedupeKey: $dedupe,
                subject: 'Bạn đã đủ điểm đổi quà tại HDG Food',
                content: "Bạn hiện có {$availablePoints} điểm và đã đủ điều kiện đổi quà '{$reward->name}' ({$reward->points_cost} điểm). Vào tài khoản để đổi voucher ngay.",
                extraPayload: [
                    'customer_name' => $user->name,
                    'title' => 'Bạn đã đủ điểm đổi quà',
                    'badge' => 'Loyalty Reward',
                    'reward_name' => $reward->name,
                    'required_points' => (int) $reward->points_cost,
                    'available_points' => $availablePoints,
                    'voucher_amount' => (float) $reward->voucher_amount,
                    'cta_label' => 'Đổi quà ngay',
                    'cta_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/') . '/profile?tab=loyalty',
                ]
            );
            $count++;
        }

        return $count;
    }

    private function existsDedupe(string $dedupeKey): bool
    {
        return AutomationCampaignLog::where('dedupe_key', $dedupeKey)->exists();
    }

    private function queueCampaign(
        User $user,
        string $campaignType,
        string $dedupeKey,
        string $subject,
        string $content,
        array $extraPayload = []
    ): void {
        $payload = array_merge([
            'subject' => $subject,
            'content' => $content,
        ], $extraPayload);

        $log = AutomationCampaignLog::create([
            'user_id' => $user->id,
            'campaign_type' => $campaignType,
            'dedupe_key' => $dedupeKey,
            'channel' => 'email',
            'status' => 'queued',
            'email' => $user->email,
            'scheduled_at' => now(),
            'payload' => $payload,
        ]);

        SendAutomationEmailJob::dispatch($log->id);
    }
}
