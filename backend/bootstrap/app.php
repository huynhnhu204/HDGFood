<?php

require_once __DIR__ . '/polyfills.php';

use App\Http\Middleware\AdminMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Đăng ký middleware alias
        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'customer.active' => \App\Http\Middleware\EnsureCustomerAccountActive::class,
        ]);

        // API không redirect khi unauthenticated
        $middleware->redirectGuestsTo(fn() => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Trả về JSON cho tất cả lỗi API thay vì redirect
        $exceptions->shouldRenderJsonWhen(fn($request) => $request->is('api/*'));

        // Xử lý lỗi Unauthenticated — trả JSON 401
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Chưa đăng nhập hoặc phiên đã hết hạn.'], 401);
            }
        });

        // Xử lý upload vượt post_max_size/upload_max_filesize
        $exceptions->render(function (\Illuminate\Http\Exceptions\PostTooLargeException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $maxPost = (string) ini_get('post_max_size');
                $maxUpload = (string) ini_get('upload_max_filesize');

                return response()->json([
                    'message' => "Tệp tải lên quá lớn. Giới hạn hiện tại: post_max_size={$maxPost}, upload_max_filesize={$maxUpload}.",
                ], 413);
            }
        });
    })
    ->create();
