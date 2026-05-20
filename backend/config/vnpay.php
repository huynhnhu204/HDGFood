<?php

return [
    'tmn_code' => env('VNPAY_TMN_CODE', ''),
    'hash_secret' => env('VNPAY_HASH_SECRET', ''),
    'url' => env('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
    'return_url' => env('VNPAY_RETURN_URL', env('APP_URL').'/api/payment/vnpay/return'),
    'ipn_url' => env('VNPAY_IPN_URL', env('APP_URL').'/api/payment/vnpay/ipn'),
    'version' => '2.1.0',
    'command' => 'pay',
    'curr_code' => 'VND',
    'locale' => 'vn',
    'order_type' => 'other',
    /** Tùy chọn: VNBANK (ATM nội địa), INTCARD, VNPAYQR — sandbox nên VNBANK để tránh quét QR app NH thật */
    'bank_code' => env('VNPAY_BANK_CODE', ''),
    /** Số tiền đơn tối thiểu (đồng) để tạo URL VNPay */
    'min_amount' => (int) env('VNPAY_MIN_AMOUNT', 1000),
    /** HMACSHA512 (mặc định 2.1.0) hoặc SHA256 nếu Terminal trên merchant VNPay cấu hình SHA256 */
    'hash_algo' => env('VNPAY_HASH_ALGO', 'sha512'),
];
