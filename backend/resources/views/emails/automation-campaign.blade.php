<!doctype html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'HDG Food Automation' }}</title>
</head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="padding:20px 24px;background:linear-gradient(135deg,#111827,#1f2937);color:#fff;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.85;">HDG Food Automation</div>
            <h2 style="margin:8px 0 0;font-size:24px;line-height:1.3;font-weight:800;">
                {{ $title ?? 'Ưu đãi dành cho bạn' }}
            </h2>
            @if(!empty($badge))
                <span style="display:inline-block;margin-top:10px;padding:5px 10px;border-radius:999px;background:rgba(237,42,42,.18);border:1px solid rgba(255,255,255,.2);font-size:11px;font-weight:700;letter-spacing:.06em;">
                    {{ $badge }}
                </span>
            @endif
        </div>

        <div style="padding:24px;">
            <p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#334155;">
                Xin chào <strong>{{ $customerName ?: 'bạn' }}</strong>,
            </p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#334155;">
                {{ $content }}
            </p>

            @if(($campaignType ?? '') === 'loyalty_eligible_reward')
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px 18px;margin-bottom:18px;">
                    <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:8px;">
                        <span style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9a3412;font-weight:700;">Phần quà</span>
                        <strong style="color:#9a3412;font-size:14px;">{{ $rewardName ?: 'Loyalty Reward' }}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:8px;">
                        <span style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9a3412;font-weight:700;">Điểm cần</span>
                        <strong style="color:#9a3412;font-size:14px;">{{ number_format($requiredPoints ?? 0, 0, ',', '.') }}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:8px;">
                        <span style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9a3412;font-weight:700;">Điểm hiện có</span>
                        <strong style="color:#dc2626;font-size:14px;">{{ number_format($availablePoints ?? 0, 0, ',', '.') }}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;">
                        <span style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9a3412;font-weight:700;">Giá trị voucher</span>
                        <strong style="color:#dc2626;font-size:16px;">{{ number_format($voucherAmount ?? 0, 0, ',', '.') }}đ</strong>
                    </div>
                </div>
            @endif

            @if(!empty($ctaUrl))
                <div style="margin:22px 0;">
                    <a href="{{ $ctaUrl }}"
                       style="display:inline-block;background:#ed2a2a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">
                        {{ $ctaLabel ?? 'Xem ngay' }}
                    </a>
                </div>
            @endif

            <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">
                Cảm ơn bạn đã đồng hành cùng HDG Food.
            </p>
        </div>

        <div style="padding:14px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#94a3b8;font-size:12px;">
            Email tự động từ hệ thống HDG Food.
        </div>
    </div>
</body>
</html>
