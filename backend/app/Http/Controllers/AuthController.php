<?php

namespace App\Http\Controllers;

use App\Mail\WelcomeCustomerMail;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private const GMAIL_REGEX = '/^[A-Za-z0-9._%+\-]+@gmail\.com$/i';

    /**
     * POST /api/admin/login
     * Dành riêng cho quản trị viên
     */
    public function loginAdmin(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::where('email', $request->email)->first();

        // Tài khoản tạo qua mạng xã hội có thể chưa có mật khẩu để đăng nhập thủ công.
        if ($user && empty($user->password)) {
            return response()->json([
                'message' => 'Tài khoản này chưa có mật khẩu. Vui lòng đăng nhập bằng Google hoặc đặt mật khẩu trước.',
            ], 401);
        }

        // 1. Kiểm tra tồn tại & mật khẩu
        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Thông tin đăng nhập không chính xác.',
            ], 401);
        }

        // 2. Kiểm tra quyền ADMIN
        if (! $user->isAdmin()) {
            return response()->json([
                'message' => 'Tài khoản không có quyền truy cập trang quản trị.',
            ], 403);
        }

        // 3. Tạo token
        $user->tokens()->delete();
        $token = $user->createToken('admin_token')->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập Quản trị viên thành công.',
            'user'    => new UserResource($user),
            'token'   => $token,
        ]);
    }

    /**
     * POST /api/auth/login
     * Dành cho khách hàng
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => ['required', 'email', 'regex:' . self::GMAIL_REGEX],
            'password' => 'required|string|min:6',
        ], [
            'email.regex' => 'Vui lòng sử dụng email Gmail (@gmail.com).',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Địa chỉ email hoặc mật khẩu không chính xác.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Tài khoản đã bị khóa hoặc đã đóng.',
            ], 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập thành công.',
            'user'    => new UserResource($user),
            'token'   => $token,
        ]);
    }

    /**
     * POST /api/auth/register
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => ['required', 'string', 'email', 'max:255', 'unique:users', 'regex:' . self::GMAIL_REGEX],
            'phone'    => 'required|string|max:20',
            'password' => 'required|string|min:6|confirmed',
        ], [
            'email.regex' => 'Vui lòng sử dụng email Gmail (@gmail.com).',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'phone'    => $data['phone'],
            'password' => Hash::make($data['password']),
            'role'     => 'user', 
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        try {
            Mail::to($user->email)->send(new WelcomeCustomerMail($user));
        } catch (\Throwable $e) {
            Log::warning('Send welcome email failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Đăng ký tài khoản thành công.',
            'user'    => new UserResource($user),
            'token'   => $token,
        ], 201);
    }

    /**
     * POST /api/auth/forgot-password
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email', 'regex:' . self::GMAIL_REGEX],
        ], [
            'email.regex' => 'Vui lòng sử dụng email Gmail (@gmail.com).',
        ]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'Chúng tôi đã gửi link đặt lại mật khẩu vào email của bạn.',
            ]);
        }

        return response()->json([
            'message' => 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.',
        ], 422);
    }

    /**
     * POST /api/auth/forgot-password-otp
     */
    public function forgotPasswordOtp(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email', 'regex:' . self::GMAIL_REGEX],
        ], [
            'email.regex' => 'Vui lòng sử dụng email Gmail (@gmail.com).',
        ]);
        $email = strtolower(trim((string) $request->email));
        $user = User::where('email', $email)->first();

        // Không để lộ email có tồn tại hay không.
        if (!$user) {
            return response()->json([
                'message' => 'Nếu email tồn tại, mã OTP đã được gửi.',
            ]);
        }

        $otp = (string) random_int(100000, 999999);
        Cache::put('password_reset_otp:' . $email, $otp, now()->addMinutes(10));

        try {
            Mail::raw(
                "Mã OTP đặt lại mật khẩu của bạn là: {$otp}. Mã có hiệu lực trong 10 phút.",
                function ($message) use ($email) {
                    $message->to($email)->subject('OTP đặt lại mật khẩu HDG Food');
                }
            );
        } catch (\Throwable $e) {
            Log::warning('Send reset OTP failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Không thể gửi OTP lúc này. Vui lòng thử lại sau.',
            ], 422);
        }

        return response()->json([
            'message' => 'OTP đã được gửi tới email của bạn.',
        ]);
    }

    /**
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => ['required', 'email', 'regex:' . self::GMAIL_REGEX],
            'password' => 'required|string|min:6|confirmed',
        ], [
            'email.regex' => 'Vui lòng sử dụng email Gmail (@gmail.com).',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Đặt lại mật khẩu thành công.']);
        }

        return response()->json([
            'message' => 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
        ], 422);
    }

    /**
     * POST /api/auth/reset-password-otp
     */
    public function resetPasswordOtp(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email', 'regex:' . self::GMAIL_REGEX],
            'otp' => 'required|string|size:6',
            'password' => 'required|string|min:6|confirmed',
        ], [
            'email.regex' => 'Vui lòng sử dụng email Gmail (@gmail.com).',
        ]);

        $email = strtolower(trim((string) $request->email));
        $cachedOtp = Cache::get('password_reset_otp:' . $email);

        if (!$cachedOtp || $cachedOtp !== $request->otp) {
            return response()->json([
                'message' => 'OTP không hợp lệ hoặc đã hết hạn.',
            ], 422);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json([
                'message' => 'Không tìm thấy tài khoản tương ứng.',
            ], 404);
        }

        $user->forceFill([
            'password' => Hash::make($request->password),
            'remember_token' => Str::random(60),
        ])->save();

        Cache::forget('password_reset_otp:' . $email);

        return response()->json([
            'message' => 'Đặt lại mật khẩu bằng OTP thành công.',
        ]);
    }

    /**
     * POST /api/auth/logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Đăng xuất thành công.']);
    }

    /**
     * GET /api/auth/me
     */
    public function me(Request $request)
    {
        return new UserResource($request->user());
    }

    /**
     * POST /api/auth/check-email
     */
    public function checkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);
        $exists = User::where('email', $request->email)->exists();
        return response()->json(['exists' => $exists]);
    }

    /**
     * POST /api/auth/check-phone
     */
    public function checkPhone(Request $request)
    {
        $request->validate(['phone' => 'required|string']);
        $exists = User::where('phone', $request->phone)->exists();
        return response()->json(['exists' => $exists]);
    }
}
