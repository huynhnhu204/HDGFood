<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class VnPayService
{
    public function isConfigured(): bool
    {
        return trim((string) config('vnpay.tmn_code')) !== ''
            && trim((string) config('vnpay.hash_secret')) !== '';
    }

    /** Mã tham chiếu: chỉ chữ/số (VNPay Alphanumeric), không trùng trong ngày. */
    public function createTxnRef(Order $order): string
    {
        $ts = Carbon::now('Asia/Ho_Chi_Minh')->format('YmdHis');
        $nonce = str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);

        return 'HDG'.$order->id.$ts.$nonce;
    }

    /**
     * @return array{url: string, txn_ref: string}
     */
    public function buildPaymentUrl(Order $order, string $ipAddress): array
    {
        $txnRef = $this->createTxnRef($order);
        $amount = (int) round((float) $order->final_total * 100);
        $now = Carbon::now('Asia/Ho_Chi_Minh');

        $params = [
            'vnp_Version' => (string) config('vnpay.version', '2.1.0'),
            'vnp_Command' => (string) config('vnpay.command', 'pay'),
            'vnp_TmnCode' => trim((string) config('vnpay.tmn_code')),
            'vnp_Amount' => (string) $amount,
            'vnp_CurrCode' => (string) config('vnpay.curr_code', 'VND'),
            'vnp_TxnRef' => $txnRef,
            'vnp_OrderInfo' => $this->sanitizeOrderInfo('Thanh toan don hang '.$order->id),
            'vnp_OrderType' => (string) config('vnpay.order_type', 'other'),
            'vnp_Locale' => (string) config('vnpay.locale', 'vn'),
            'vnp_ReturnUrl' => trim((string) config('vnpay.return_url')),
            'vnp_IpAddr' => $this->normalizeIp($ipAddress),
            'vnp_CreateDate' => $now->format('YmdHis'),
            'vnp_ExpireDate' => $now->copy()->addMinutes(30)->format('YmdHis'),
        ];

        $bankCode = trim((string) config('vnpay.bank_code', ''));
        if ($bankCode !== '') {
            $params['vnp_BankCode'] = $bankCode;
        }

        [$hashData, $query] = $this->buildHashDataAndQuery($params);
        $secureHash = $this->sign($hashData);

        return [
            'url' => rtrim((string) config('vnpay.url'), '?').'?'.$query.'vnp_SecureHash='.$secureHash,
            'txn_ref' => $txnRef,
        ];
    }

    private function normalizeIp(string $ip): string
    {
        $ip = trim($ip);
        if ($ip === '' || $ip === '::1') {
            return '127.0.0.1';
        }
        if (str_starts_with($ip, '::ffff:')) {
            return substr($ip, 7);
        }

        return $ip;
    }

    /** VNPay: OrderInfo không dấu, không ký tự đặc biệt. */
    private function sanitizeOrderInfo(string $text): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: $text;
        $ascii = preg_replace('/[^a-zA-Z0-9\s\-]/', '', $ascii) ?? $ascii;

        return trim(substr($ascii, 0, 255)) ?: 'Thanh toan HDG Food';
    }

    /**
     * Giống mẫu PHP chính thức VNPay 2.1.0 (sandbox.vnpayment.vn/apis/docs).
     *
     * @return array{0: string, 1: string} [hashData, queryString kết thúc bằng &]
     */
    private function buildHashDataAndQuery(array $params): array
    {
        unset($params['vnp_SecureHash'], $params['vnp_SecureHashType']);

        $filtered = [];
        foreach ($params as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $filtered[(string) $key] = (string) $value;
        }

        ksort($filtered);

        $hashData = '';
        $query = '';
        $i = 0;

        foreach ($filtered as $key => $value) {
            if ($i === 1) {
                $hashData .= '&'.urlencode($key).'='.urlencode($value);
            } else {
                $hashData .= urlencode($key).'='.urlencode($value);
                $i = 1;
            }
            $query .= urlencode($key).'='.urlencode($value).'&';
        }

        return [$hashData, $query];
    }

    private function sign(string $hashData): string
    {
        $algo = strtolower(trim((string) config('vnpay.hash_algo', 'sha512')));
        $secret = trim((string) config('vnpay.hash_secret'));

        return match ($algo) {
            'sha256' => hash_hmac('sha256', $hashData, $secret),
            default => hash_hmac('sha512', $hashData, $secret),
        };
    }

    public function hash(array $params): string
    {
        [$hashData] = $this->buildHashDataAndQuery($params);

        return $this->sign($hashData);
    }

    public function verifyRequest(Request $request): bool
    {
        $input = $request->all();
        $secureHash = (string) ($input['vnp_SecureHash'] ?? '');
        unset($input['vnp_SecureHash'], $input['vnp_SecureHashType']);

        return $secureHash !== '' && hash_equals($this->hash($input), $secureHash);
    }

    public function findOrderByCallback(Request $request): ?Order
    {
        $txnRef = (string) $request->input('vnp_TxnRef', '');

        if ($txnRef === '') {
            return null;
        }

        return Order::query()->where('vnpay_txn_ref', $txnRef)->first();
    }

    public function amountMatches(Order $order, Request $request): bool
    {
        $expected = (int) round((float) $order->final_total * 100);
        $received = (int) $request->input('vnp_Amount', 0);

        return $expected === $received;
    }

    public function isPaymentSuccess(Request $request): bool
    {
        return (string) $request->input('vnp_ResponseCode') === '00'
            && (string) $request->input('vnp_TransactionStatus', '00') === '00';
    }
}
