<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Http\Request;

class VnPayService
{
    public function isConfigured(): bool
    {
        return trim((string) config('vnpay.tmn_code')) !== ''
            && trim((string) config('vnpay.hash_secret')) !== '';
    }

    public function createTxnRef(Order $order): string
    {
        return 'HDG'.$order->id.'_'.now()->format('YmdHis');
    }

    /**
     * @return array{url: string, txn_ref: string}
     */
    public function buildPaymentUrl(Order $order, string $ipAddress): array
    {
        $txnRef = $this->createTxnRef($order);
        $amount = (int) round((float) $order->final_total * 100);
        $now = now()->timezone('Asia/Ho_Chi_Minh');

        $params = [
            'vnp_Version' => config('vnpay.version'),
            'vnp_Command' => config('vnpay.command'),
            'vnp_TmnCode' => config('vnpay.tmn_code'),
            'vnp_Amount' => (string) $amount,
            'vnp_CurrCode' => config('vnpay.curr_code'),
            'vnp_TxnRef' => $txnRef,
            'vnp_OrderInfo' => $this->sanitizeOrderInfo('Thanh toan don hang #'.$order->id),
            'vnp_OrderType' => config('vnpay.order_type'),
            'vnp_Locale' => config('vnpay.locale'),
            'vnp_ReturnUrl' => config('vnpay.return_url'),
            'vnp_IpAddr' => $ipAddress ?: '127.0.0.1',
            'vnp_CreateDate' => $now->format('YmdHis'),
            'vnp_ExpireDate' => $now->copy()->addMinutes(15)->format('YmdHis'),
        ];

        ksort($params);
        $secureHash = $this->hash($params);

        $query = '';
        foreach ($params as $key => $value) {
            $query .= urlencode((string) $key).'='.urlencode((string) $value).'&';
        }

        return [
            'url' => config('vnpay.url').'?'.$query.'vnp_SecureHash='.$secureHash,
            'txn_ref' => $txnRef,
        ];
    }

    /** VNPay yêu cầu OrderInfo không dấu, không ký tự đặc biệt. */
    private function sanitizeOrderInfo(string $text): string
    {
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: $text;
        $ascii = preg_replace('/[^a-zA-Z0-9\s#\-]/', '', $ascii) ?? $ascii;

        return trim(substr($ascii, 0, 255)) ?: 'Thanh toan HDG Food';
    }

    public function hash(array $params): string
    {
        ksort($params);
        $hashData = '';
        $i = 0;
        foreach ($params as $key => $value) {
            if (in_array($key, ['vnp_SecureHash', 'vnp_SecureHashType'], true)) {
                continue;
            }
            if ($i === 1) {
                $hashData .= '&'.urlencode((string) $key).'='.urlencode((string) $value);
            } else {
                $hashData .= urlencode((string) $key).'='.urlencode((string) $value);
                $i = 1;
            }
        }

        return hash_hmac('sha512', $hashData, (string) config('vnpay.hash_secret'));
    }

    public function verifyRequest(Request $request): bool
    {
        $input = $request->all();
        $secureHash = $input['vnp_SecureHash'] ?? '';
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
