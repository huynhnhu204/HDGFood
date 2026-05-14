<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;

class SocialAuthController extends Controller
{
    /**
     * GET /api/auth/google/redirect
     * Trả về URL để frontend redirect sang Google
     */
    public function redirectToGoogle()
    {
        /** @var \Laravel\Socialite\Two\GoogleProvider $provider */
        $provider = Socialite::driver('google');
        $url = $provider->stateless()->redirect()->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * POST /api/auth/google/callback
     * Nhận token từ frontend (Google One Tap / OAuth code)
     * và tạo/đăng nhập user
     */
    public function handleGoogleCallback(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        try {
            // Frontend đang gửi Google Identity Services "credential" (ID token JWT).
            // Socialite::userFromToken() yêu cầu OAuth access token, nên phải verify ID token thủ công.
            $payload = $this->verifyGoogleIdToken($request->token);
        } catch (\Exception $e) {
            $message = 'Token Google không hợp lệ.';
            if (config('app.debug')) {
                $message .= ' ' . $e->getMessage();
            }
            return response()->json(['message' => $message], 401);
        }

        if (!is_array($payload) || empty($payload['sub']) || empty($payload['email'])) {
            return response()->json(['message' => 'Token Google không hợp lệ.'], 401);
        }

        // Tìm hoặc tạo user
        $user = User::where('google_id', $payload['sub'])
            ->orWhere('email', $payload['email'])
            ->first();

        if ($user) {
            // Cập nhật google_id nếu chưa có
            if (!$user->google_id) {
                $user->update([
                    'google_id' => $payload['sub'],
                    'avatar'    => $payload['picture'] ?? null,
                ]);
            }
        } else {
            // Tạo user mới từ Google
            $user = User::create([
                'name'      => $payload['name'] ?? ($payload['email'] ?? 'Google User'),
                'email'     => $payload['email'],
                'google_id' => $payload['sub'],
                'avatar'    => $payload['picture'] ?? null,
                'password'  => null,
                'role'      => 'user',
                'email_verified_at' => now(),
            ]);
        }

        // Kiểm tra tài khoản có bị khóa không
        if (!$user->is_active) {
            return response()->json(['message' => 'Tài khoản đã bị khóa hoặc đã đóng.'], 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('google_auth')->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập Google thành công.',
            'user'    => new UserResource($user),
            'token'   => $token,
        ]);
    }

    private function verifyGoogleIdToken(string $idToken): array
    {
        $clientId = config('services.google.client_id');
        if (!$clientId) {
            throw new \RuntimeException('Missing GOOGLE_CLIENT_ID');
        }

        $jwks = Cache::remember('google_oauth_jwks', 3600, function () {
            $res = Http::timeout(10)->get('https://www.googleapis.com/oauth2/v3/certs');
            if (!$res->ok()) {
                throw new \RuntimeException('Cannot fetch Google certs');
            }
            return $res->json();
        });

        $keys = JWK::parseKeySet($jwks);
        $previousLeeway = JWT::$leeway;
        JWT::$leeway = 120; // Allow small server/client clock skew for nbf/iat validation.
        try {
            $decoded = JWT::decode($idToken, $keys);
        } finally {
            JWT::$leeway = $previousLeeway;
        }
        $payload = json_decode(json_encode($decoded), true);

        $iss = $payload['iss'] ?? null;
        if (!in_array($iss, ['accounts.google.com', 'https://accounts.google.com'], true)) {
            throw new \RuntimeException('Invalid iss');
        }

        $aud = $payload['aud'] ?? null;
        if ($aud !== $clientId) {
            throw new \RuntimeException('Invalid aud');
        }

        // exp is validated by JWT::decode, but keep a defensive check.
        if (isset($payload['exp']) && is_numeric($payload['exp']) && (int)$payload['exp'] < time()) {
            throw new \RuntimeException('Token expired');
        }

        return $payload;
    }
}
