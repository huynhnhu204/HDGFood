<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * GET /api/users/search?q=... — tìm nhanh khách hàng theo SĐT/tên
     */
    public function search(Request $request)
    {
        $q = $request->get('q', '');
        if (strlen($q) < 2) return response()->json(['data' => []]);

        $users = User::where('role', 'user')
            ->where('is_active', true)
            ->where(fn($query) =>
                $query->where('phone', 'like', "%{$q}%")
                      ->orWhere('name',  'like', "%{$q}%")
                      ->orWhere('email', 'like', "%{$q}%")
            )
            ->limit(8)
            ->get(['id', 'name', 'email', 'phone', 'address', 'tier', 'total_spent', 'total_orders']);

        return response()->json(['data' => $users]);
    }

    public function index(Request $request)
    {
        $query = User::withCount('orders')
            ->withSum(['orders as spent_sum' => fn($q) => $q->where('status', 'completed')], 'final_total')
            ->where('role', 'user');

        if ($request->boolean('only_trashed')) {
            $query->onlyTrashed();
        }

        $paginator = $query
            ->when($request->search, fn($q) => $q->where(function ($q2) use ($request) {
                $q2->where('name', 'like', "%{$request->search}%")
                   ->orWhere('phone', 'like', "%{$request->search}%")
                   ->orWhere('email', 'like', "%{$request->search}%")
                   ->orWhere('deleted_original_email', 'like', "%{$request->search}%");
            }))
            ->when($request->tier, fn($q) => $q->where('tier', $request->tier))
            ->when($request->status === 'active',   fn($q) => $q->where('is_active', true))
            ->when($request->status === 'inactive', fn($q) => $q->where('is_active', false))
            ->orderByDesc('total_spent')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'data' => UserResource::collection(collect($paginator->items())),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page'    => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    public function show(User $user)
    {
        $user->loadCount('orders')
             ->load(['orders' => fn($q) => $q->latest()->limit(10)->with('items.product:id,name')]);
        return response()->json(['data' => new UserResource($user)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|unique:users',
            'phone'   => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'password'=> 'required|string|min:6',
        ]);

        $data['role']     = 'user';
        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);

        return response()->json(['data' => new UserResource($user)], 201);
    }

    public function update(Request $request, User $user)
    {
        if ($user->trashed()) {
            return response()->json([
                'message' => 'Tài khoản đã đóng. Không chỉnh sửa được — hãy khôi phục trước.',
            ], 422);
        }

        $data = $request->validate([
            'name'      => 'sometimes|string|max:255',
            'phone'     => 'nullable|string|max:20',
            'address'   => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'tier'      => 'sometimes|in:regular,silver,gold,vip',
        ]);

        $user->update($data);
        return response()->json(['data' => new UserResource($user->fresh())]);
    }

    /**
     * Đóng tài khoản khách: xóa mềm + ẩn danh email để email có thể đăng ký lại.
     * Khác với “khóa” (is_active): đơn hàng & lịch sử vẫn giữ theo user_id.
     */
    public function destroy(User $user)
    {
        if ($user->role !== 'user') {
            return response()->json(['message' => 'Không thể đóng tài khoản này.'], 403);
        }

        if ($user->trashed()) {
            return response()->json(['message' => 'Tài khoản đã được đóng trước đó.'], 422);
        }

        DB::transaction(function () use ($user) {
            $original = $user->email;
            $placeholder = 'deleted.u' . $user->id . '.' . Str::lower(Str::random(10)) . '@closed.invalid';

            $user->tokens()->delete();

            $user->update([
                'deleted_original_email' => $original,
                'email'                  => $placeholder,
                'google_id'              => null,
                'is_active'              => false,
            ]);

            $user->delete();
        });

        return response()->json([
            'message' => 'Đã đóng tài khoản (xóa mềm). Email gốc có thể được dùng để đăng ký tài khoản mới.',
        ]);
    }

    /**
     * POST /api/admin/users/{user}/restore — mở lại tài khoản đã đóng (nếu email gốc còn trống).
     */
    public function restore(User $user)
    {
        if ($user->role !== 'user') {
            return response()->json(['message' => 'Không áp dụng cho tài khoản này.'], 403);
        }

        if (! $user->trashed()) {
            return response()->json(['message' => 'Tài khoản chưa bị đóng.'], 422);
        }

        $original = $user->deleted_original_email;
        if (! $original) {
            return response()->json(['message' => 'Không có email gốc để khôi phục.'], 422);
        }

        if (User::where('email', $original)->where('id', '!=', $user->id)->exists()) {
            return response()->json([
                'message' => 'Email gốc đã được dùng bởi tài khoản khác. Không thể khôi phục tự động.',
            ], 422);
        }

        DB::transaction(function () use ($user, $original) {
            $user->restore();
            $user->update([
                'email'                  => $original,
                'deleted_original_email' => null,
                'is_active'              => true,
            ]);
        });

        return response()->json([
            'message' => 'Đã khôi phục tài khoản.',
            'data'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * GET /api/users/{user}/orders — lịch sử đơn hàng của khách
     */
    public function orders(User $user, Request $request)
    {
        $orders = $user->orders()
            ->with(['items.product:id,name,image'])
            ->latest()
            ->paginate($request->per_page ?? 10);

        return OrderResource::collection($orders);
    }

    /**
     * POST /api/users/{user}/recalculate-tier
     */
    public function recalculateTier(User $user)
    {
        if ($user->trashed()) {
            return response()->json(['message' => 'Tài khoản đã đóng — không cập nhật tier.'], 422);
        }

        // Tính lại total_spent từ đơn completed
        $spent = $user->orders()->where('status', 'completed')->sum('final_total');
        $count = $user->orders()->where('status', 'completed')->count();
        $user->update(['total_spent' => $spent, 'total_orders' => $count]);
        $user->recalculateTier();

        return response()->json([
            'data' => new UserResource($user->fresh()),
            'message' => "Tier: {$user->tier}",
        ]);
    }
}
