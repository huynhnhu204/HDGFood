<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // Cho phép admin mở chi tiết khách đã đóng (soft-deleted) qua /admin/users/{user}
        Route::bind('user', function (string $value) {
            return User::withTrashed()->whereKey($value)->firstOrFail();
        });

        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            $frontendUrl = rtrim(env('FRONTEND_URL', 'http://localhost:3000'), '/');
            return $frontendUrl . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);
        });
    }
}
