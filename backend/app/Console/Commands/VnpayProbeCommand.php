<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\VnPayService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class VnpayProbeCommand extends Command
{
    protected $signature = 'vnpay:probe {--order= : Order ID (mặc định: đơn mới nhất)}';

    protected $description = 'Kiểm tra cấu hình VNPay Sandbox (TMN, Return URL, chữ ký)';

    public function handle(VnPayService $vnPay): int
    {
        if (! $vnPay->isConfigured()) {
            $this->error('Thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET trong .env');

            return self::FAILURE;
        }

        $order = $this->resolveOrder();
        if (! $order) {
            return self::FAILURE;
        }

        $this->info('TMN Code: '.config('vnpay.tmn_code'));
        $this->info('Return URL (.env): '.config('vnpay.return_url'));
        $this->info('IPN URL (.env): '.config('vnpay.ipn_url'));
        $this->info('Hash algo: '.config('vnpay.hash_algo', 'sha512'));
        $this->info('Secret length: '.strlen((string) config('vnpay.hash_secret')).' ký tự');
        $this->info('Order #'.$order->id.' final_total: '.number_format((float) $order->final_total).'đ');

        $returnCandidates = array_values(array_unique(array_filter([
            trim((string) config('vnpay.return_url')),
            str_replace('127.0.0.1', 'localhost', (string) config('vnpay.return_url')),
            str_replace('localhost', '127.0.0.1', (string) config('vnpay.return_url')),
        ])));

        $anySuccess = false;
        $lastFailure = null;

        foreach ($returnCandidates as $returnUrl) {
            $built = $this->buildProbeUrl($order, $returnUrl);
            $probe = $this->probePaymentUrl($built['url']);

            $this->newLine();
            $this->line("Return URL: {$returnUrl}");
            $this->line("TxnRef: {$built['txn_ref']}");
            $this->line("HTTP: {$probe['http_code']}");
            $this->line('Redirect: '.($probe['location'] ?: '(không)'));

            if ($probe['success']) {
                $anySuccess = true;
                $this->info('→ Chữ ký OK — VNPay mở trang thanh toán.');
                if ($returnUrl !== config('vnpay.return_url')) {
                    $this->warn('→ Cập nhật VNPAY_RETURN_URL trong .env và Terminal portal cho khớp URL này.');
                }
                $this->newLine();
                $this->line('Mở URL sau trên Chrome (đơn thử, không refresh tab cũ):');
                $this->line($built['url']);

                break;
            }

            $lastFailure = $probe;
            if (preg_match('/code=(\d+)/', $probe['location'], $m)) {
                $this->warn('→ Lỗi code='.$m[1].' ('.$this->codeHint($m[1]).')');
            } elseif ($probe['http_code'] === 403) {
                $this->warn('→ HTTP 403 (bỏ qua, thử URL khác hoặc mở trên trình duyệt).');
            }
        }

        if ($anySuccess) {
            $this->newLine();
            $this->info('Kết luận: cấu hình chữ ký đúng. Đặt đơn mới trên web → thanh toán VNPay ngay.');

            return self::SUCCESS;
        }

        $this->newLine();
        $this->error('Tất cả Return URL thử đều thất bại.');
        if ($lastFailure && preg_match('/code=(\d+)/', $lastFailure['location'], $m) && $m[1] === '70') {
            $this->printSignatureFixSteps();
        }

        return self::FAILURE;
    }

    private function resolveOrder(): ?Order
    {
        $orderId = $this->option('order');
        $order = $orderId
            ? Order::find($orderId)
            : Order::query()->latest('id')->first();

        if (! $order) {
            $this->error('Không tìm thấy đơn hàng để thử.');
        }

        return $order;
    }

    /**
     * @return array{url: string, txn_ref: string}
     */
    private function buildProbeUrl(Order $order, string $returnUrl): array
    {
        $vnPay = app(VnPayService::class);
        $amount = (int) round((float) $order->final_total * 100);
        $now = Carbon::now('Asia/Ho_Chi_Minh');
        $txnRef = 'HDG'.$order->id.$now->format('YmdHis').str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT);

        $params = [
            'vnp_Version' => (string) config('vnpay.version', '2.1.0'),
            'vnp_Command' => (string) config('vnpay.command', 'pay'),
            'vnp_TmnCode' => trim((string) config('vnpay.tmn_code')),
            'vnp_Amount' => (string) $amount,
            'vnp_CurrCode' => (string) config('vnpay.curr_code', 'VND'),
            'vnp_TxnRef' => $txnRef,
            'vnp_OrderInfo' => 'Thanh toan don hang '.$order->id,
            'vnp_OrderType' => (string) config('vnpay.order_type', 'other'),
            'vnp_Locale' => (string) config('vnpay.locale', 'vn'),
            'vnp_ReturnUrl' => $returnUrl,
            'vnp_IpAddr' => '127.0.0.1',
            'vnp_CreateDate' => $now->format('YmdHis'),
            'vnp_ExpireDate' => $now->copy()->addMinutes(30)->format('YmdHis'),
        ];

        ksort($params);
        $hashData = '';
        $query = '';
        $i = 0;
        foreach ($params as $key => $value) {
            if ($i === 1) {
                $hashData .= '&'.urlencode((string) $key).'='.urlencode((string) $value);
            } else {
                $hashData .= urlencode((string) $key).'='.urlencode((string) $value);
                $i = 1;
            }
            $query .= urlencode((string) $key).'='.urlencode((string) $value).'&';
        }

        $secret = trim((string) config('vnpay.hash_secret'));
        $hash = hash_hmac('sha512', $hashData, $secret);

        return [
            'url' => rtrim((string) config('vnpay.url'), '?').'?'.$query.'vnp_SecureHash='.$hash,
            'txn_ref' => $txnRef,
        ];
    }

    /**
     * @return array{http_code: int, location: string, success: bool}
     */
    private function probePaymentUrl(string $url): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ]);
        $raw = (string) curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $location = (string) (curl_getinfo($ch, CURLINFO_REDIRECT_URL) ?: '');
        curl_close($ch);

        if ($location === '' && preg_match('/^Location:\s*(.+)$/mi', $raw, $m)) {
            $location = trim($m[1]);
            if (str_starts_with($location, '/')) {
                $location = 'https://sandbox.vnpayment.vn'.$location;
            }
        }

        $success = $httpCode >= 300 && $httpCode < 400
            && $location !== ''
            && ! str_contains($location, 'Error.html');

        return [
            'http_code' => $httpCode,
            'location' => $location,
            'success' => $success,
        ];
    }

    private function codeHint(string $code): string
    {
        return match ($code) {
            '70' => 'Sai chữ ký — Secret/Return URL trên portal chưa khớp .env',
            '15' => 'Hết hạn giao dịch — đặt đơn mới',
            '72' => 'Sai TMN Code',
            default => 'xem bảng mã lỗi VNPay',
        };
    }

    private function printSignatureFixSteps(): void
    {
        $this->newLine();
        $this->line('Sửa lỗi 70 (theo email VNPay Sandbox):');
        $this->line('1. https://sandbox.vnpayment.vn/merchantv2/ → Sửa Terminal '.config('vnpay.tmn_code'));
        $this->line('2. Bấm Tạo lại / copy Chuỗi bí mật MỚI → dán vào VNPAY_HASH_SECRET (không có dấu cách, không ngoặc kép)');
        $this->line('3. Return URL trên portal PHẢI TRÙNG .env (thử cả localhost và 127.0.0.1):');
        $this->line('   '.config('vnpay.return_url'));
        $this->line('4. IPN: '.config('vnpay.ipn_url').' — GET, HMACSHA512');
        $this->line('5. php artisan config:clear && đặt đơn MỚI trên web');
    }
}
