<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Http\Resources\UserResource;
use App\Models\Wishlist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    /**
     * GET /api/profile
     * Lấy thông tin cá nhân + thống kê
     */
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => new UserResource($user),
            'stats' => [
                'total_orders'  => $user->orders()->count(),
                'total_spent'   => (float) $user->total_spent,
                'wishlist_count' => $user->wishlists()->count(),
            ],
        ]);
    }

    /**
     * PUT /api/profile
     * Cập nhật thông tin cá nhân
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'phone'         => 'nullable|string|max:20',
            'address'       => 'nullable|string|max:500',
            'province_code' => 'nullable|string|max:50',
            'ward_code'     => 'nullable|string|max:50',
            'email'         => ['required', 'email', Rule::unique('users')->ignore($user->id)],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Cập nhật thông tin thành công.',
            'user'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * POST /api/profile/avatar
     * Upload/cap nhat avatar cho user hien tai
     */
    public function updateAvatar(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp,gif|max:4096',
        ]);

        if ($user->avatar && !str_starts_with($user->avatar, 'http')) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return response()->json([
            'message' => 'Cập nhật avatar thành công.',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    /**
     * PUT /api/profile/password
     * Đổi mật khẩu
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:6|confirmed',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Mật khẩu hiện tại không chính xác.',
                'errors'  => ['current_password' => ['Mật khẩu hiện tại không chính xác.']],
            ], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json([
            'message' => 'Đổi mật khẩu thành công.',
        ]);
    }

    /**
     * GET /api/profile/orders
     * Lấy danh sách đơn hàng của user hiện tại
     */
    public function orders(Request $request)
    {
        $orders = $request->user()
            ->orders()
            ->with(['items.product', 'cancelRejectReason'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 10);

        return OrderResource::collection($orders);
    }

    /**
     * GET /api/profile/wishlist
     * Lấy danh sách wishlist
     */
    public function wishlist(Request $request)
    {
        $wishlist = $request->user()
            ->wishlists()
            ->with('product')
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 12);

        return response()->json($wishlist);
    }

    /**
     * POST /api/profile/wishlist
     * Thêm sản phẩm vào wishlist
     */
    public function addToWishlist(Request $request)
    {
        $request->validate(['product_id' => 'required|exists:products,id']);

        $user = $request->user();
        $existing = $user->wishlists()->where('product_id', $request->product_id)->first();

        if ($existing) {
            return response()->json(['message' => 'Sản phẩm đã có trong danh sách yêu thích.'], 409);
        }

        $user->wishlists()->create(['product_id' => $request->product_id]);

        return response()->json(['message' => 'Đã thêm vào yêu thích.'], 201);
    }

    /**
     * DELETE /api/profile/wishlist/{productId}
     * Xóa sản phẩm khỏi wishlist
     */
    public function removeFromWishlist(Request $request, int $productId)
    {
        $request->user()->wishlists()->where('product_id', $productId)->delete();

        return response()->json(['message' => 'Đã xóa khỏi yêu thích.']);
    }
}
