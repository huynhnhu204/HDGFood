<?php

namespace App\Http\Controllers;

use App\Http\Resources\VoucherResource;
use App\Models\Voucher;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

use App\Http\Controllers\Concerns\AppliesAdminTrashIndex;

class VoucherController extends Controller
{
    use AppliesAdminTrashIndex;

    public function index(Request $request)
    {
        $query = Voucher::query();

        // Tìm theo tên hoặc code
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => 
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('code', 'like', "%{$s}%")
            );
        }

        // Lọc theo trạng thái
        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->active();
            } elseif ($request->status === 'expired') {
                $query->where(function($q) {
                    $q->where('is_active', false)
                      ->orWhere('end_date', '<', now())
                      ->orWhereRaw('used_count >= usage_limit');
                });
            }
        }

        $this->applyAdminTrashIndexScope($query, $request);

        return VoucherResource::collection(
            $query->latest()->paginate(min((int) $request->get('per_page', 15), 100))
        );
    }

    public function show(Voucher $voucher)
    {
        return new VoucherResource($voucher->load('products'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code'              => 'required|string|max:50|unique:vouchers,code',
            'name'              => 'required|string|max:255',
            'description'       => 'nullable|string',
            'discount_type'     => 'required|in:percent,amount',
            'discount_value'    => 'required|numeric|min:0',
            'max_discount'      => 'nullable|numeric|min:0',
            'min_order_amount'  => 'nullable|numeric|min:0',
            'apply_to'          => 'required|in:all,products',
            'product_ids'       => 'required_if:apply_to,products|array',
            'product_ids.*'     => 'exists:products,id',
            'usage_limit'       => 'nullable|integer|min:1',
            'usage_per_user'    => 'required|integer|min:1',
            'start_date'        => 'required|date',
            'end_date'          => 'required|date|after:start_date',
            'tier_restriction'  => 'required|in:all,silver,gold,vip',
            'is_active'         => 'sometimes|boolean',
        ]);

        // Validate discount
        if ($data['discount_type'] === 'percent' && $data['discount_value'] > 100) {
            return response()->json(['message' => 'Giảm giá % không được vượt quá 100%'], 422);
        }

        // Uppercase code
        $data['code'] = Str::upper($data['code']);

        $productIds = $data['product_ids'] ?? [];
        unset($data['product_ids']);

        $voucher = Voucher::create($data);

        // Attach products nếu apply_to = products
        if ($voucher->apply_to === 'products' && !empty($productIds)) {
            $voucher->products()->attach($productIds);
        }

        return new VoucherResource($voucher->load('products'));
    }

    public function update(Request $request, Voucher $voucher)
    {
        $data = $request->validate([
            'code'              => 'sometimes|string|max:50|unique:vouchers,code,' . $voucher->id,
            'name'              => 'sometimes|string|max:255',
            'description'       => 'nullable|string',
            'discount_type'     => 'sometimes|in:percent,amount',
            'discount_value'    => 'sometimes|numeric|min:0',
            'max_discount'      => 'nullable|numeric|min:0',
            'min_order_amount'  => 'nullable|numeric|min:0',
            'apply_to'          => 'sometimes|in:all,products',
            'product_ids'       => 'required_if:apply_to,products|array',
            'product_ids.*'     => 'exists:products,id',
            'usage_limit'       => 'nullable|integer|min:1',
            'usage_per_user'    => 'sometimes|integer|min:1',
            'start_date'        => 'sometimes|date',
            'end_date'          => 'sometimes|date|after:start_date',
            'tier_restriction'  => 'sometimes|in:all,silver,gold,vip',
            'is_active'         => 'sometimes|boolean',
        ]);

        if (isset($data['discount_type']) && $data['discount_type'] === 'percent' 
            && isset($data['discount_value']) && $data['discount_value'] > 100) {
            return response()->json(['message' => 'Giảm giá % không được vượt quá 100%'], 422);
        }

        if (isset($data['code'])) {
            $data['code'] = Str::upper($data['code']);
        }

        $productIds = $data['product_ids'] ?? null;
        unset($data['product_ids']);

        $voucher->update($data);

        // Sync products
        if ($productIds !== null) {
            if ($voucher->apply_to === 'products') {
                $voucher->products()->sync($productIds);
            } else {
                $voucher->products()->detach();
            }
        }

        return new VoucherResource($voucher->load('products'));
    }

    public function destroy(Voucher $voucher)
    {
        $voucher->delete();
        return response()->json(['message' => 'Đã xóa voucher']);
    }

    public function toggle(Voucher $voucher)
    {
        $voucher->update(['is_active' => !$voucher->is_active]);
        return new VoucherResource($voucher->load('products'));
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array']);
        Voucher::whereIn('id', $request->ids)->delete();
        return response()->json(['message' => 'Đã xóa ' . count($request->ids) . ' voucher']);
    }

    /**
     * Validate voucher code
     */
    public function validate(Request $request)
    {
        $request->validate([
            'code'        => 'required|string',
            'subtotal'    => 'required|numeric|min:0',
            'product_ids' => 'sometimes|array',
        ]);

        $voucher = Voucher::where('code', Str::upper($request->code))->first();

        if (!$voucher) {
            return response()->json(['message' => 'Mã voucher không tồn tại'], 404);
        }

        if (!$voucher->isValid()) {
            return response()->json(['message' => 'Voucher đã hết hạn hoặc đã hết lượt sử dụng'], 422);
        }

        $user = $request->user();
        if ($user && !$voucher->canBeUsedBy($user)) {
            return response()->json(['message' => 'Bạn không thể sử dụng voucher này'], 422);
        }

        $subtotal = round((float) $request->subtotal, 2);

        // Kiểm tra đơn tối thiểu (dùng số đã chuẩn hóa để tránh sai số float)
        if ($voucher->min_order_amount && $subtotal < (float) $voucher->min_order_amount) {
            return response()->json([
                'message' => 'Đơn hàng tối thiểu ' . number_format((float) $voucher->min_order_amount, 0, ',', '.') . '₫'
            ], 422);
        }

        $discount = $voucher->calculateDiscount($subtotal, $request->product_ids ?? []);

        return response()->json([
            'valid'    => true,
            'voucher'  => new VoucherResource($voucher),
            'discount' => $discount,
        ]);
    }

    public function seed()
    {
        try {
            \Illuminate\Support\Facades\Artisan::call('db:seed', [
                '--class' => 'PromotionVoucherSeeder'
            ]);
            return response()->json(['message' => 'Đã tải dữ liệu mẫu thành công!']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi khi tải dữ liệu mẫu: ' . $e->getMessage()], 500);
        }
    }
}
