<?php

return [
    /*
    |--------------------------------------------------------------------------
    | CORS — Cross-Origin Resource Sharing
    |--------------------------------------------------------------------------
    | Cho phép frontend local gọi API Laravel ở nhiều cổng dev khác nhau.
    | Trong production, vẫn có thể giới hạn thêm bằng FRONTEND_URL.
    |--------------------------------------------------------------------------
    */

    // Áp dụng CORS cho tất cả route /api/* và Sanctum CSRF
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'], // GET, POST, PUT, PATCH, DELETE, OPTIONS

    'allowed_origins' => array_values(array_filter([
        env('FRONTEND_URL'),
    ])),

    // Hỗ trợ Next.js dev khi cổng thay đổi (3000, 3001, 3002, ...)
    'allowed_origins_patterns' => [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
    ],

    // Cho phép tất cả headers (bao gồm Authorization: Bearer ...)
    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    // Cache preflight request trong 2 giờ (giảm số lượng OPTIONS request)
    'max_age' => 7200,

    // Bắt buộc true khi dùng Sanctum token qua cookie
    'supports_credentials' => true,
];
