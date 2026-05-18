<?php

namespace App\Support;

use App\Models\Order;
use App\Models\Setting;

class PaymentSupport
{
    public static function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (str_starts_with($digits, '84') && strlen($digits) >= 11) {
            $digits = '0'.substr($digits, 2);
        }

        return $digits;
    }

    /** Chuyển khoản VietQR — đối soát thủ công (Mức A) */
    public const MANUAL_TRANSFER_METHODS = ['bank', 'momo'];

    /** Cổng thanh toán tự động (Mức B) */
    public const GATEWAY_METHODS = ['vnpay'];

    /** @deprecated dùng isManualTransfer / isVnpay */
    public const ONLINE_TRANSFER_METHODS = ['bank', 'momo', 'vnpay'];

    public static function isManualTransfer(?string $method): bool
    {
        return in_array((string) $method, self::MANUAL_TRANSFER_METHODS, true);
    }

    public static function isVnpay(?string $method): bool
    {
        return (string) $method === 'vnpay';
    }

    public static function isOnlineTransfer(?string $method): bool
    {
        return self::isManualTransfer($method) || self::isVnpay($method);
    }

    public static function needsManualSettlement(Order $order): bool
    {
        return $order->payment_status === 'unpaid'
            && self::isManualTransfer($order->payment_method);
    }

    public static function markOrderPaid(Order $order): Order
    {
        $updates = ['payment_status' => 'paid'];

        if (! $order->payment_claimed_at && self::isManualTransfer($order->payment_method)) {
            $updates['payment_claimed_at'] = now();
        }

        $order->update($updates);

        if ($order->status === 'pending') {
            $order->update(['status' => 'confirmed']);
        }

        if (self::isVnpay($order->payment_method)) {
            \App\Models\Notification::createNotification(
                "VNPay đã thanh toán #{$order->id}",
                "Đơn {$order->order_number} — đã nhận tiền qua cổng VNPay.",
                'payment',
                "/admin/orders/{$order->id}"
            );
        }

        return $order->fresh();
    }

    public static function bankConfig(): array
    {
        $keys = ['bank_bin', 'bank_account', 'bank_account_name', 'bank_transfer_note_prefix'];
        $fromDb = Setting::query()->whereIn('key', $keys)->pluck('value', 'key');

        return [
            'bank_bin' => $fromDb['bank_bin'] ?? env('PAYMENT_BANK_BIN', 'mbbank'),
            'bank_account' => $fromDb['bank_account'] ?? env('PAYMENT_BANK_ACCOUNT', ''),
            'bank_account_name' => $fromDb['bank_account_name'] ?? env('PAYMENT_BANK_ACCOUNT_NAME', 'HDG FOOD'),
            'bank_transfer_note_prefix' => $fromDb['bank_transfer_note_prefix'] ?? env('PAYMENT_TRANSFER_PREFIX', 'HDGFOOD'),
        ];
    }

    public static function transferReference(Order $order): string
    {
        $prefix = self::bankConfig()['bank_transfer_note_prefix'] ?: 'HDGFOOD';
        $ref = $order->order_number ?: (string) $order->id;

        return strtoupper($prefix).$ref;
    }

    public static function vietQrImageUrl(Order $order, ?int $amount = null): ?string
    {
        $bank = self::bankConfig();
        $account = trim((string) $bank['bank_account']);
        $bin = trim((string) $bank['bank_bin']);

        if ($account === '' || $bin === '') {
            return null;
        }

        $amountValue = $amount ?? (int) round((float) $order->final_total);
        $addInfo = rawurlencode(self::transferReference($order));
        $accountName = rawurlencode((string) $bank['bank_account_name']);

        return "https://img.vietqr.io/image/{$bin}-{$account}-compact2.png"
            . "?amount={$amountValue}&addInfo={$addInfo}&accountName={$accountName}";
    }
}
