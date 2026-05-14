<?php

namespace App\Support;

use App\Models\Order;
use Carbon\CarbonImmutable;

class OrderCancelPolicy
{
    private const CONFIRMED_GRACE_MINUTES = 5;
    private const DELAY_EXCEPTION_MINUTES = 60;

    /**
     * @return array{
     *   can_cancel: bool,
     *   reason: string,
     *   hotline_required: bool,
     *   note: string,
     *   countdown_seconds: int|null,
     *   can_request_manual_cancel: bool
     * }
     */
    public static function evaluate(Order $order): array
    {
        $status = (string) $order->status;
        $now = CarbonImmutable::now();
        $createdAt = $order->created_at ? CarbonImmutable::instance($order->created_at) : $now;
        $minutesSinceCreated = $createdAt->diffInMinutes($now);
        $isDelayed = $minutesSinceCreated >= self::DELAY_EXCEPTION_MINUTES;

        if (in_array($status, ['cancelled', 'completed'], true)) {
            return [
                'can_cancel' => false,
                'reason' => 'Đơn đã kết thúc, không thể hủy.',
                'hotline_required' => false,
                'note' => 'Đơn hoàn tất chuyển sang chính sách khiếu nại/hoàn trả.',
                'countdown_seconds' => null,
                'can_request_manual_cancel' => false,
            ];
        }

        if ($status === 'pending') {
            return [
                'can_cancel' => true,
                'reason' => 'Có thể hủy tự do khi đơn đang chờ xác nhận.',
                'hotline_required' => false,
                'note' => 'Bạn có thể hủy miễn phí khi đơn ở trạng thái Chờ xác nhận.',
                'countdown_seconds' => null,
                'can_request_manual_cancel' => false,
            ];
        }

        if ($status === 'confirmed') {
            $updatedAt = $order->updated_at ? CarbonImmutable::instance($order->updated_at) : $createdAt;
            $minutesSinceConfirm = $updatedAt->diffInMinutes($now);

            if ($minutesSinceConfirm <= self::CONFIRMED_GRACE_MINUTES) {
                $remainingSeconds = max(0, (self::CONFIRMED_GRACE_MINUTES * 60) - $updatedAt->diffInSeconds($now));
                return [
                    'can_cancel' => true,
                    'reason' => 'Đơn vừa xác nhận, vẫn trong thời gian cho phép hủy.',
                    'hotline_required' => false,
                    'note' => 'Sau khi xác nhận, bạn có 5 phút để đổi quyết định.',
                    'countdown_seconds' => $remainingSeconds,
                    'can_request_manual_cancel' => false,
                ];
            }

            if ($isDelayed) {
                return [
                    'can_cancel' => true,
                    'reason' => 'Đơn xử lý chậm quá lâu, cho phép hủy ngoại lệ.',
                    'hotline_required' => false,
                    'note' => 'Ngoại lệ: đơn quá 60 phút và chưa chuyển sang phục vụ có thể hủy.',
                    'countdown_seconds' => null,
                    'can_request_manual_cancel' => true,
                ];
            }

            return [
                'can_cancel' => false,
                'reason' => 'Đã quá thời gian 5 phút sau xác nhận.',
                'hotline_required' => false,
                'note' => 'Đơn đã xác nhận quá 5 phút nên không thể hủy tự động.',
                'countdown_seconds' => 0,
                'can_request_manual_cancel' => true,
            ];
        }

        if ($status === 'preparing') {
            if ($isDelayed) {
                return [
                    'can_cancel' => true,
                    'reason' => 'Đơn xử lý chậm quá lâu, cho phép hủy ngoại lệ.',
                    'hotline_required' => false,
                    'note' => 'Ngoại lệ: đơn quá 60 phút và chưa chuyển sang phục vụ có thể hủy.',
                    'countdown_seconds' => null,
                    'can_request_manual_cancel' => true,
                ];
            }

            return [
                'can_cancel' => false,
                'reason' => 'Đơn đang chế biến, không cho phép tự hủy.',
                'hotline_required' => true,
                'note' => 'Nếu cần hủy ở bước này, vui lòng liên hệ hotline để được hỗ trợ.',
                'countdown_seconds' => null,
                'can_request_manual_cancel' => true,
            ];
        }

        if ($status === 'ready') {
            return [
                'can_cancel' => false,
                'reason' => 'Đơn đã sẵn sàng, không hỗ trợ yêu cầu hủy tự động.',
                'hotline_required' => true,
                'note' => 'Đơn đã sẵn sàng/chuẩn bị phục vụ. Vui lòng liên hệ hotline nếu cần hỗ trợ.',
                'countdown_seconds' => null,
                'can_request_manual_cancel' => false,
            ];
        }

        return [
            'can_cancel' => false,
            'reason' => 'Đơn đang phục vụ/giao, không thể hủy.',
            'hotline_required' => false,
            'note' => 'Đơn đang phục vụ/giao nên không thể hủy.',
            'countdown_seconds' => null,
            'can_request_manual_cancel' => false,
        ];
    }

    /**
     * Lý do từ chối yêu cầu hủy theo từng trạng thái để đảm bảo đúng chính sách.
     *
     * @return array<int, array{code: string, label: string}>
     */
    public static function rejectReasonsForStatus(string $status): array
    {
        return match ($status) {
            'confirmed' => [
                ['code' => 'confirmed_timeout', 'label' => 'Đã quá 5 phút kể từ khi đơn được xác nhận.'],
                ['code' => 'confirmed_prep_started', 'label' => 'Đơn đã được chuyển sang khâu chuẩn bị nguyên liệu.'],
            ],
            'preparing' => [
                ['code' => 'preparing_cooking_started', 'label' => 'Bếp đã bắt đầu chế biến món.'],
                ['code' => 'preparing_stock_issued', 'label' => 'Nguyên liệu đã được xuất kho để chế biến.'],
            ],
            'ready' => [
                ['code' => 'ready_completed', 'label' => 'Món đã hoàn tất và sẵn sàng phục vụ/giao.'],
                ['code' => 'ready_policy_locked', 'label' => 'Đơn đã qua ngưỡng cho phép hủy theo chính sách.'],
            ],
            'serving' => [
                ['code' => 'serving_in_progress', 'label' => 'Đơn đang được phục vụ/giao cho khách.'],
                ['code' => 'serving_policy_locked', 'label' => 'Đơn đã ở trạng thái phục vụ nên không thể hủy.'],
            ],
            default => [
                ['code' => 'default_policy_mismatch', 'label' => 'Yêu cầu hủy không phù hợp chính sách ở trạng thái hiện tại.'],
            ],
        };
    }
}

