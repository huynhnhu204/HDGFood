<?php

namespace App\Jobs;

use App\Models\AutomationCampaignLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class SendAutomationEmailJob implements ShouldQueue
{
    use Queueable;

    public function __construct(private int $campaignLogId)
    {
    }

    public function handle(): void
    {
        $log = AutomationCampaignLog::find($this->campaignLogId);
        if (!$log || !$log->email) {
            return;
        }

        $payload = $log->payload ?? [];
        $subject = $payload['subject'] ?? 'HDG Food - Ưu đãi dành cho bạn';
        $content = $payload['content'] ?? 'HDG Food gửi bạn ưu đãi mới.';

        Mail::send('emails.automation-campaign', [
            'subject' => $subject,
            'title' => $payload['title'] ?? $subject,
            'badge' => $payload['badge'] ?? strtoupper((string) $log->campaign_type),
            'customerName' => $payload['customer_name'] ?? null,
            'content' => $content,
            'ctaLabel' => $payload['cta_label'] ?? 'Khám phá ngay',
            'ctaUrl' => $payload['cta_url'] ?? rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/'),
            'campaignType' => $log->campaign_type,
            'rewardName' => $payload['reward_name'] ?? null,
            'requiredPoints' => (int) ($payload['required_points'] ?? 0),
            'availablePoints' => (int) ($payload['available_points'] ?? 0),
            'voucherAmount' => (float) ($payload['voucher_amount'] ?? 0),
        ], function ($message) use ($log, $subject) {
            $message->to($log->email)->subject($subject);
        });

        $log->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);
    }
}
