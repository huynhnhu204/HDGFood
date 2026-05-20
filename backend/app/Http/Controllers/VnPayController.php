<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\VnPayService;
use App\Support\PaymentSupport;
use Illuminate\Http\Request;

class VnPayController extends Controller
{
    public function __construct(private VnPayService $vnPay) {}

    /**
     * POST — Tạo URL thanh toán VNPay (khách / guest).
     */
    public function createPayment(Request $request, Order $order)
    {
        if (! $this->vnPay->isConfigured()) {
            return response()->json(['message' => 'VNPay chưa được cấu hình trên server.'], 503);
        }

        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'Đơn đã thanh toán.'], 422);
        }

        if (! $this->verifyOrderAccess($request, $order)) {
            return response()->json(['message' => 'Không có quyền thanh toán đơn này.'], 403);
        }

        if ($order->payment_method !== 'vnpay') {
            $order->update(['payment_method' => 'vnpay']);
            $order->refresh();
        }

        $minAmount = (int) config('vnpay.min_amount', 1000);
        if ((float) $order->final_total < $minAmount) {
            return response()->json([
                'message' => 'Số tiền đơn tối thiểu '.number_format($minAmount, 0, ',', '.').'đ để thanh toán VNPay.',
            ], 422);
        }

        $built = $this->vnPay->buildPaymentUrl($order, (string) $request->ip());
        $order->update(['vnpay_txn_ref' => $built['txn_ref']]);

        $payload = [
            'payment_url' => $built['url'],
            'txn_ref' => $built['txn_ref'],
        ];

        if (config('app.debug')) {
            $payload['vnpay_check'] = [
                'tmn_code' => config('vnpay.tmn_code'),
                'return_url' => config('vnpay.return_url'),
                'probe_command' => 'php artisan vnpay:probe --order='.$order->id,
            ];
        }

        return response()->json(['data' => $payload]);
    }

    /**
     * GET — VNPay redirect khách sau thanh toán.
     */
    public function returnUrl(Request $request)
    {
        $frontend = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');
        $orderId = '';
        $status = 'failed';

        if ($this->vnPay->verifyRequest($request)) {
            $order = $this->vnPay->findOrderByCallback($request);
            if ($order) {
                $orderId = (string) $order->id;
                if ($this->vnPay->isPaymentSuccess($request) && $this->vnPay->amountMatches($order, $request)) {
                    PaymentSupport::markOrderPaid($order);
                    $status = 'success';
                } elseif ($order->payment_status === 'paid') {
                    $status = 'success';
                }
            }
        }

        $query = http_build_query(array_filter([
            'order_id' => $orderId,
            'status' => $status,
            'vnp_ResponseCode' => $request->input('vnp_ResponseCode'),
        ]));

        return redirect($frontend.'/checkout/vnpay-return?'.$query);
    }

    /**
     * GET — IPN (server-to-server). Đăng ký URL này trên Merchant VNPay Sandbox.
     */
    public function ipn(Request $request)
    {
        if (! $this->vnPay->verifyRequest($request)) {
            return response('RspCode=97&Message=Invalid Checksum', 200)
                ->header('Content-Type', 'text/plain');
        }

        $order = $this->vnPay->findOrderByCallback($request);
        if (! $order) {
            return response('RspCode=01&Message=Order not found', 200)
                ->header('Content-Type', 'text/plain');
        }

        if (! $this->vnPay->amountMatches($order, $request)) {
            return response('RspCode=04&Message=Invalid amount', 200)
                ->header('Content-Type', 'text/plain');
        }

        if ($this->vnPay->isPaymentSuccess($request)) {
            if ($order->payment_status !== 'paid') {
                PaymentSupport::markOrderPaid($order);
            }

            return response('RspCode=00&Message=Confirm Success', 200)
                ->header('Content-Type', 'text/plain');
        }

        return response('RspCode=00&Message=Confirm Success', 200)
            ->header('Content-Type', 'text/plain');
    }

    /**
     * GET — Frontend gọi để kiểm tra trạng thái sau redirect.
     */
    public function checkStatus(Request $request, Order $order)
    {
        if (! $this->verifyOrderAccess($request, $order)) {
            return response()->json(['message' => 'Không có quyền.'], 403);
        }

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'payment_status' => $order->payment_status,
                'paid' => $order->payment_status === 'paid',
            ],
        ]);
    }

    private function verifyOrderAccess(Request $request, Order $order): bool
    {
        $user = $request->user();
        if ($user && ($user->isAdmin() || $order->user_id === $user->id)) {
            return true;
        }

        $phone = PaymentSupport::normalizePhone((string) $request->input('customer_phone', ''));
        $orderPhone = PaymentSupport::normalizePhone((string) $order->delivery_phone);

        return $phone !== '' && $phone === $orderPhone;
    }
}
