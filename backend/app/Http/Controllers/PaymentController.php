<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Support\PaymentSupport;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * GET /api/public/payment-info
     * Thông tin chuyển khoản / VietQR (không nhạy cảm).
     */
    public function publicInfo()
    {
        $bank = PaymentSupport::bankConfig();

        return response()->json([
            'data' => [
                'bank_bin' => $bank['bank_bin'],
                'bank_account' => $bank['bank_account'],
                'bank_account_name' => $bank['bank_account_name'],
                'bank_transfer_note_prefix' => $bank['bank_transfer_note_prefix'],
                'configured' => trim((string) $bank['bank_account']) !== '',
            ],
        ]);
    }

    /**
     * GET /api/public/orders/{order}/payment-qr
     */
    public function publicQr(Request $request, Order $order)
    {
        if (! PaymentSupport::needsManualSettlement($order)) {
            return response()->json(['message' => 'Đơn này không cần thanh toán chuyển khoản VietQR.'], 422);
        }

        if (! $this->verifyOrderAccess($request, $order)) {
            return response()->json(['message' => 'Không có quyền xem thông tin thanh toán.'], 403);
        }

        $qrUrl = PaymentSupport::vietQrImageUrl($order);

        return response()->json([
            'data' => [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => (int) round((float) $order->final_total),
                'transfer_reference' => PaymentSupport::transferReference($order),
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'payment_claimed_at' => $order->payment_claimed_at?->toDateTimeString(),
                'qr_image_url' => $qrUrl,
                'bank' => PaymentSupport::bankConfig(),
            ],
        ]);
    }

    /**
     * POST /api/public/orders/{order}/claim-payment
     */
    public function claimPayment(Request $request, Order $order)
    {
        if (! PaymentSupport::needsManualSettlement($order)) {
            return response()->json(['message' => 'Đơn này không yêu cầu xác nhận chuyển khoản.'], 422);
        }

        if (! $this->verifyOrderAccess($request, $order)) {
            return response()->json([
                'message' => 'Không xác nhận được quyền với đơn này. Dùng đúng SĐT khi đặt hàng hoặc đăng nhập tài khoản đã đặt đơn.',
            ], 403);
        }

        if ($order->payment_claimed_at) {
            return response()->json([
                'message' => 'Đã ghi nhận yêu cầu đối soát trước đó. Vui lòng chờ quản trị viên xác nhận.',
                'data' => new OrderResource($order),
            ]);
        }

        $order->update(['payment_claimed_at' => now()]);

        \App\Models\Notification::createNotification(
            "Khách báo đã chuyển khoản #{$order->id}",
            "Đơn {$order->order_number} — {$order->delivery_name} cần đối soát thanh toán.",
            'payment',
            '/admin/orders?payment_pending=1'
        );

        return response()->json([
            'message' => 'Đã gửi xác nhận. Nhà hàng sẽ kiểm tra và cập nhật trong thời gian sớm nhất.',
            'data' => new OrderResource($order->fresh()),
        ]);
    }

    /**
     * POST /api/admin/orders/{order}/confirm-payment
     */
    public function confirmPaymentAdmin(Order $order)
    {
        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'Đơn đã được thanh toán.'], 422);
        }

        if (! PaymentSupport::isOnlineTransfer($order->payment_method) && $order->payment_method !== 'cod') {
            return response()->json(['message' => 'Phương thức thanh toán không hỗ trợ xác nhận thủ công.'], 422);
        }

        $order = PaymentSupport::markOrderPaid($order);

        return response()->json([
            'message' => 'Đã xác nhận thanh toán.',
            'data' => new OrderResource($order->load(['user', 'items.product', 'items.combo', 'cancelRejectReason'])),
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
