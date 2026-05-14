<!doctype html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Don hang da hoan thanh</title>
</head>
<body style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
<div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; padding:24px; border:1px solid #e2e8f0;">
    <h2 style="margin:0 0 12px; color:#111827;">Cam on {{ $customerName }} da ung ho HDG Food!</h2>
    <p style="margin:0 0 10px; color:#374151;">Don hang <strong>#{{ $orderId }}</strong> cua ban da hoan thanh.</p>
    <p style="margin:0 0 10px; color:#374151;">Tong thanh toan: <strong>{{ number_format($total, 0, ',', '.') }}đ</strong></p>
    <p style="margin:0 0 16px; color:#374151;">Phuong thuc thanh toan: <strong>{{ strtoupper($paidMethod) }}</strong></p>
    <p style="margin:0; color:#374151;">Hen gap lai ban trong nhung lan dat mon tiep theo.</p>
    <div style="margin-top:16px; font-size:12px; color:#6b7280;">Email duoc gui tu bo phan quan tri HDG Food.</div>
</div>
</body>
</html>
