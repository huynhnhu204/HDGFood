<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OmsService;
use Illuminate\Http\Request;
use App\Models\User;

class OrderController extends Controller
{
    private OmsService $omsService;

    public function __construct(OmsService $omsService)
    {
        $this->omsService = $omsService;
    }

    public function index(Request $request)
    {
        $query = Order::with(['user', 'items.product', 'items.combo', 'cancelRejectReason'])->latest();

        // User chỉ xem đơn của mình
        $query->where('user_id', $request->user()->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return OrderResource::collection(
            $query->paginate(min((int) $request->get('per_page', 15), 100))
        );
    }

    public function indexAdmin(Request $request)
    {
        $query = Order::with(['user', 'items.product', 'items.combo', 'cancelRejectReason'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) =>
                $q->where('delivery_name', 'like', "%{$s}%")
                  ->orWhere('delivery_phone', 'like', "%{$s}%")
                  ->orWhere('shipping_address', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
                  ->orWhere('order_number', 'like', "%{$s}%")
            );
        }

        if ((int) $request->get('cancel_requests', 0) === 1) {
            $query->whereNotNull('cancel_requested_at')
                ->whereNotIn('status', ['cancelled', 'completed']);
        }

        return OrderResource::collection(
            $query->paginate(min((int) $request->get('per_page', 15), 100))
        );
    }

    public function showAdmin(Request $request, Order $order)
    {
        return new OrderResource($order->load(['user', 'items.product', 'items.combo', 'cancelRejectReason']));
    }

    public function show(Request $request, Order $order)
    {
        if (! $request->user()->isAdmin() && $order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Không có quyền truy cập.'], 403);
        }
        return new OrderResource($order->load(['user', 'items.product', 'items.combo', 'cancelRejectReason']));
    }

    /**
     * Store (Tạo Hóa đơn mới) điều hướng sang lớp OmsService
     */
    public function store(Request $request)
    {
        return $this->createOrderFromRequest($request, $request->user());
    }

    /**
     * Store (Tạo đơn cho khách chưa đăng nhập)
     */
    public function storeGuest(Request $request)
    {
        return $this->createOrderFromRequest($request, null);
    }

    private function createOrderFromRequest(Request $request, ?User $requestUser)
    {
        $data = $request->validate([
            'items'                => 'required|array|min:1',
            'items.*.type'         => 'nullable|in:product,combo',
            'items.*.product_id'   => 'nullable|exists:products,id',
            'items.*.combo_id'     => 'nullable|exists:combos,id',
            'items.*.selections'   => 'nullable|array',
            'items.*.quantity'     => 'required|integer|min:1',
            'customer_name'        => 'required|string|max:255',
            'customer_phone'       => 'required|string|max:20',
            'table_number'         => 'nullable|string|max:50',
            'table_session_token'  => 'nullable|string|max:120',
            'shipping_address'     => 'nullable|string|max:500',
            'shipping_method'      => 'nullable|string|max:50',
            'payment_method'       => 'nullable|string|max:50',
            'shipping_fee'         => 'nullable|numeric|min:0',
            'note'                 => 'nullable|string|max:500',
            'voucher_code'         => 'nullable|string',
            'user_id'              => 'nullable|exists:users,id',
        ]);

        foreach ($data['items'] as $idx => $item) {
            $type = $item['type'] ?? 'product';
            if ($type === 'combo' && empty($item['combo_id'])) {
                return response()->json(['message' => "Dòng hàng #" . ($idx + 1) . ' thiếu combo_id.'], 422);
            }
            if ($type === 'product' && empty($item['product_id'])) {
                return response()->json(['message' => "Dòng hàng #" . ($idx + 1) . ' thiếu product_id.'], 422);
            }
        }

        $order = $this->omsService->createOrder($data, $requestUser);

        \App\Models\Notification::createNotification(
            "Đơn hàng mới #{$order->id}",
            "Khách hàng {$order->customer_name} vừa đặt một đơn hàng mới.",
            "order",
            "/admin/orders"
        );

        return new OrderResource($order->load(['user', 'items.product', 'items.combo', 'voucher']));
    }

    /**
     * Cập nhật thông tin đơn hàng (Admin only)
     * Chỉ cho phép sửa khi đơn chưa completed/cancelled
     */
    public function update(Request $request, Order $order)
    {
        if (in_array($order->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Không thể sửa đơn đã kết thúc.'], 422);
        }

        $data = $request->validate([
            'customer_name'  => 'sometimes|string|max:255',
            'customer_phone' => 'sometimes|string|max:20',
            'table_number'   => 'nullable|string|max:50',
            'note'           => 'nullable|string|max:500',
        ]);

        // Map tên trường frontend sang backend
        $updateData = [];
        if (isset($data['customer_name'])) {
            $updateData['delivery_name'] = $data['customer_name'];
        }
        if (isset($data['customer_phone'])) {
            $updateData['delivery_phone'] = $data['customer_phone'];
        }
        if (isset($data['table_number'])) {
            $updateData['shipping_address'] = $data['table_number'];
        }
        if (isset($data['note'])) {
            $updateData['notes'] = $data['note'];
        }

        $order->update($updateData);

        return new OrderResource($order->fresh()->load(['user', 'items.product', 'items.combo', 'cancelRejectReason']));
    }

    /**
     * Xóa đơn hàng (Admin only) và trả kho
     */
    public function destroy(Order $order)
    {
        $this->omsService->destroyOrder($order);

        return response()->json(['message' => 'Đã xóa đơn hàng và trả tồn kho về trạng thái chuẩn.']);
    }

    /**
     * Cập nhật trạng thái đơn hàng (Admin only)
     * Flow: pending → confirmed → preparing → ready → serving → completed
     */
    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,preparing,ready,serving,completed,cancelled',
            'cancel_reason' => 'nullable|string|max:255',
        ]);

        $order = $this->omsService->changeOrderStatus($order, $data['status'], $data['cancel_reason'] ?? null);

        return new OrderResource($order->fresh()->load(['user', 'items.product', 'items.combo', 'cancelRejectReason']));
    }

    public function cancelByUser(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Không có quyền thao tác đơn này.'], 403);
        }

        $data = $request->validate([
            'cancel_reason' => 'nullable|string|max:255',
            'request_only' => 'nullable|boolean',
        ]);

        $policy = \App\Support\OrderCancelPolicy::evaluate($order);
        $cancelReason = $data['cancel_reason'] ?? null;
        $requestOnly = (bool) ($data['request_only'] ?? false);

        if ($policy['can_cancel'] && !$requestOnly) {
            $order = $this->omsService->changeOrderStatus($order, 'cancelled', $cancelReason, true);
            return response()->json([
                'message' => 'Đã hủy đơn thành công.',
                'data' => new OrderResource($order->fresh()->load(['user', 'items.product', 'items.combo', 'cancelRejectReason'])),
            ]);
        }

        if (!($policy['can_request_manual_cancel'] ?? false)) {
            return response()->json([
                'message' => $policy['reason'] ?? 'Không thể yêu cầu hủy ở trạng thái hiện tại.',
            ], 422);
        }

        $order->update([
            'cancel_requested_at' => now(),
            'cancel_reason' => $cancelReason,
        ]);

        return response()->json([
            'message' => 'Đã gửi yêu cầu hủy. Quản trị viên sẽ phản hồi sớm.',
            'data' => new OrderResource($order->fresh()->load(['user', 'items.product', 'items.combo', 'cancelRejectReason'])),
        ]);
    }

    public function approveCancelRequest(Request $request, Order $order)
    {
        if (!$order->cancel_requested_at) {
            return response()->json(['message' => 'Đơn này chưa có yêu cầu hủy.'], 422);
        }

        $data = $request->validate([
            'admin_note' => 'nullable|string|max:255',
        ]);

        $reason = $order->cancel_reason ?: ($data['admin_note'] ?? 'Duyệt hủy bởi quản trị viên');
        $order = $this->omsService->changeOrderStatus($order, 'cancelled', $reason, true);

        return response()->json([
            'message' => 'Đã duyệt hủy đơn.',
            'data' => new OrderResource($order->fresh()->load(['user', 'items.product', 'items.combo', 'cancelRejectReason'])),
        ]);
    }

    public function rejectCancelRequest(Request $request, Order $order)
    {
        if (!$order->cancel_requested_at) {
            return response()->json(['message' => 'Đơn này chưa có yêu cầu hủy.'], 422);
        }

        $data = $request->validate([
            'reject_reason_code' => 'required|string|max:64',
        ]);

        $allowedReasons = \App\Support\OrderCancelPolicy::rejectReasonsForStatus((string) $order->status);
        $selected = collect($allowedReasons)->firstWhere('code', $data['reject_reason_code']);
        if (!$selected) {
            return response()->json([
                'message' => 'Lý do từ chối không hợp lệ theo chính sách của trạng thái hiện tại.',
                'allowed_reasons' => $allowedReasons,
            ], 422);
        }

        $reason = trim((string) $selected['label']);
        $currentNote = trim((string) ($order->notes ?? ''));
        $rejectNote = "Từ chối yêu cầu hủy: {$reason}";

        $order->update([
            'cancel_requested_at' => null,
            'cancel_reject_reason_code' => $selected['code'],
            'notes' => $currentNote !== '' ? "{$currentNote}\n{$rejectNote}" : $rejectNote,
        ]);

        return response()->json([
            'message' => 'Đã từ chối yêu cầu hủy.',
            'data' => new OrderResource($order->fresh()->load(['user', 'items.product', 'items.combo', 'cancelRejectReason'])),
        ]);
    }

    public function rejectReasonCatalog(Request $request)
    {
        $status = (string) $request->query('status', 'default');
        return response()->json([
            'data' => \App\Support\OrderCancelPolicy::rejectReasonsForStatus($status),
        ]);
    }
}
