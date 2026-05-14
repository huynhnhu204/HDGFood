<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Chặn khách (role user) đã khóa hoặc đã đóng TK (soft-delete) khỏi API sau đăng nhập.
 * Admin bỏ qua. Logout giữ ngoài middleware này để client vẫn xóa phiên khi cần.
 */
class EnsureCustomerAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isAdmin()) {
            return $next($request);
        }

        if (! $user->is_active || $user->trashed()) {
            $user->tokens()->delete();

            return response()->json([
                'message' => $user->trashed()
                    ? 'Tài khoản đã đóng. Vui lòng đăng nhập lại nếu bạn đăng ký tài khoản mới.'
                    : 'Tài khoản đã bị khóa.',
                'reason' => 'account_disabled',
            ], 403);
        }

        return $next($request);
    }
}
