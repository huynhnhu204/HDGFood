# HDG FOOD — Hệ thống web quản lý nhà hàng

**HDG FOOD** là dự án fullstack mô phỏng hệ sinh thái vận hành nhà hàng/quán ăn: khách đặt món online hoặc tại bàn, admin quản trị toàn bộ nghiệp vụ, backend API Laravel phục vụ dữ liệu thống nhất.

| Thông tin | Chi tiết |
|-----------|----------|
| Sinh viên | Dương Đào Huỳnh Như |
| MSSV | 2122110580 |
| Repository | [github.com/huynhnhu204/HDGFood](https://github.com/huynhnhu204/HDGFood) |
| Mục đích | Đồ án / học tập — phát triển hệ thống web quản lý nhà hàng thực tế |

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Tính năng Client (khách hàng)](#2-tính-năng-client-khách-hàng)
3. [Tính năng Admin (quản trị)](#3-tính-năng-admin-quản-trị)
4. [Backend API](#4-backend-api)
5. [Công nghệ sử dụng](#5-công-nghệ-sử-dụng)
6. [Cấu trúc thư mục](#6-cấu-trúc-thư-mục)
7. [Cài đặt & chạy dự án](#7-cài-đặt--chạy-dự-án)
8. [Biến môi trường](#8-biến-môi-trường)
9. [Tài khoản demo](#9-tài-khoản-demo)
10. [Thanh toán thử nghiệm (VNPay Sandbox)](#10-thanh-toán-thử-nghiệm-vnpay-sandbox)
11. [Giao hàng & bản đồ](#11-giao-hàng--bản-đồ)
12. [Ghi chú vận hành](#12-ghi-chú-vận-hành)
13. [Cập nhật gần đây](#13-cập-nhật-gần-đây)

---

## 1. Tổng quan kiến trúc

```text
┌─────────────────┐     REST API (JSON)      ┌──────────────────┐
│  Next.js 15     │ ◄──────────────────────► │  Laravel 12 API  │
│  App Router     │     Sanctum Auth         │  MySQL + Storage │
│  Port :3000     │                          │  Port :8000      │
└─────────────────┘                          └──────────────────┘
        │                                              │
   (client) + (admin)                          Pusher / Mail / VNPay
```

- **Frontend**: một codebase Next.js, tách route group `(client)` và `(admin)`.
- **Backend**: API RESTful, xác thực Sanctum, upload file qua `storage/app/public`.
- **Realtime**: Pusher cho cập nhật trạng thái bàn (dine-in).
- **Thanh toán**: VNPay Sandbox, VietQR, COD.
- **Giao hàng**: ghim vị trí Leaflet, kiểm tra bán kính Haversine, đơn tối thiểu.

---

## 2. Tính năng Client (khách hàng)

### Trang chủ & thực đơn
- Banner slider, danh mục nhanh, khuyến mãi nổi bật, combo, gợi ý món, blog, đánh giá.
- Danh sách sản phẩm: lọc danh mục, khoảng giá, sắp xếp, tìm kiếm live (`LiveSearch`).
- Chi tiết sản phẩm: album ảnh, topping/tùy chọn, ghi chú, thêm giỏ, mua ngay, sản phẩm liên quan.

### Giỏ hàng & checkout
- State giỏ hàng (Zustand), đồng bộ giá/tồn kho trước khi đặt (`/cart/sync`).
- **Giao hàng**: chọn "Giao cho tôi" / "Đặt hộ", ghim vị trí trên bản đồ, xác nhận địa chỉ, tự điền Tỉnh/Quận/Phường.
- **Tại bàn (dine-in)**: chọn bàn, session token, cộng dồn đơn đang mở, gọi thanh toán tại quầy.
- Tính bill thống nhất: combo, hạng thành viên (tier), voucher, điểm thưởng, phí ship.
- Đơn giao hàng tối thiểu **100.000₫** (chưa tính phí ship).
- Thanh toán: VNPay, VietQR, COD.

### Tài khoản & tương tác
- Đăng ký / đăng nhập / quên mật khẩu (email + OTP).
- OAuth Google, Facebook (tùy cấu hình).
- Hồ sơ, wishlist, lịch sử đơn, đánh giá sản phẩm.
- **Foodie AI**: trợ lý chat gợi ý món (Gemini API).

### Nội dung
- Blog theo chủ đề, SEO metadata, OpenGraph.
- Trang About, Contact, Policy, Promotions, Combos.

---

## 3. Tính năng Admin (quản trị)

| Module | Chức năng chính |
|--------|-----------------|
| Dashboard | KPI, doanh thu, thống kê đơn/sản phẩm |
| Sản phẩm | CRUD, ảnh/album, topping, dinh dưỡng, clone, cập nhật nhanh |
| Danh mục | CRUD, sắp xếp |
| Combo | Nhóm lựa chọn, tính giá động |
| Đơn hàng | Theo dõi, cập nhật trạng thái, chi tiết, POS tạo/sửa đơn |
| Kho | Phiếu nhập, inventory log, điều chỉnh tồn |
| Khuyến mãi & Voucher | Gắn sản phẩm, điều kiện đơn tối thiểu |
| Blog | Bài viết, chủ đề, thumbnail, SEO |
| Banner | CRUD, vị trí hiển thị |
| Bàn ăn | Trạng thái bàn, phiên khách, workflow realtime |
| Thành viên | Quản lý user, tier loyalty |
| Cài đặt | Thông tin quán, GPS quán, bán kính giao hàng, đơn tối thiểu, VNPay/VietQR |
| Thùng rác | `/admin/trash` — khôi phục / xóa vĩnh viễn (soft delete) |

---

## 4. Backend API

File route chính: `backend/routes/api.php`

### Public (không cần đăng nhập)
- Sản phẩm, danh mục, combo, khuyến mãi, voucher validate
- Blog, banner, policy, menu
- Giỏ hàng sync, đặt đơn khách (`POST /orders/guest`)
- Bàn ăn: danh sách, claim session, trạng thái, đơn hiện tại
- Giao hàng: `GET /public/delivery/config`, `GET /public/delivery/check`
- Thanh toán: VNPay create/return/ipn, VietQR, claim payment
- Foodie AI chat, ước tính ship

### Authenticated (`auth:sanctum`)
- Profile, đơn hàng, review, wishlist
- Hủy đơn (theo policy)

### Admin (`auth:sanctum` + role admin)
- CRUD toàn bộ module, thùng rác, báo cáo, import/export

---

## 5. Công nghệ sử dụng

### Backend
| Công nghệ | Phiên bản / Ghi chú |
|-----------|---------------------|
| PHP | ^8.2 |
| Laravel | ^12 |
| MySQL | 8.x |
| Laravel Sanctum | API token |
| Laravel Socialite | OAuth |
| Pusher | Realtime bàn ăn |
| Google Gemini | Foodie Assistant |

### Frontend
| Công nghệ | Phiên bản / Ghi chú |
|-----------|---------------------|
| Next.js | ^15 (App Router) |
| React | ^19 |
| TypeScript | strict |
| Tailwind CSS | UI |
| Zustand | Cart, auth state |
| Framer Motion | Animation |
| Leaflet + react-leaflet | Bản đồ giao hàng |
| Axios | HTTP client |
| Pusher JS | Realtime client |
| Sonner | Toast notifications |

---

## 6. Cấu trúc thư mục

```text
TTTN_2122110580_update/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/   # API controllers
│   │   ├── Http/Resources/     # JSON transformers
│   │   ├── Models/             # Eloquent models
│   │   └── Services/           # OmsService, DeliveryRadiusService, ...
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/api.php
│   └── .env.example
│
├── frontend/                   # Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── (client)/       # Trang khách: /, /products, /checkout, ...
│   │   │   └── (admin)/        # Trang admin: /admin/...
│   │   ├── components/
│   │   │   └── checkout/       # DeliveryMapPicker, AddressForm, ...
│   │   ├── services/           # API service layer
│   │   ├── store/              # Zustand stores
│   │   ├── lib/                # checkout-bill, reverseGeocode, ...
│   │   └── types/
│   └── package.json
│
└── README.md
```

---

## 7. Cài đặt & chạy dự án

### Yêu cầu
- PHP 8.2+, Composer
- Node.js 18+, npm
- MySQL 8+
- (Tùy chọn) Pusher, Gemini API, VNPay Sandbox

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Chỉnh DB_* trong .env
php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve
```

API mặc định: **http://127.0.0.1:8000**

### Frontend

```bash
cd frontend
npm install
```

Tạo `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Tùy chọn — realtime bàn ăn
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=ap1
```

Chạy dev:

```bash
npm run dev
```

Web mặc định: **http://localhost:3000**

### Kiểm tra nhanh sau cài đặt

| URL | Mô tả |
|-----|-------|
| http://localhost:3000 | Trang chủ client |
| http://localhost:3000/admin | Đăng nhập admin |
| http://localhost:3000/checkout | Thanh toán |
| http://127.0.0.1:8000/api/public/delivery/config | Cấu hình giao hàng |

---

## 8. Biến môi trường

### Backend (`backend/.env`) — các nhóm quan trọng

```env
# Database
DB_DATABASE=HDG_food
DB_USERNAME=root
DB_PASSWORD=

# Frontend CORS / Sanctum
FRONTEND_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000

# Giao hàng (có thể chỉnh thêm trong Admin → Cài đặt)
# store_latitude, store_longitude, delivery_radius_km, delivery_min_order_amount

# VNPay Sandbox
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_RETURN_URL=http://127.0.0.1:8000/api/payment/vnpay/return
VNPAY_IPN_URL=http://127.0.0.1:8000/api/payment/vnpay/ipn

# VietQR
PAYMENT_BANK_BIN=mbbank
PAYMENT_BANK_ACCOUNT=
PAYMENT_BANK_ACCOUNT_NAME=HDG FOOD

# Foodie AI
GEMINI_API_KEY=

# Pusher (realtime)
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=ap1
```

Kiểm tra VNPay: `php artisan vnpay:probe`

---

## 9. Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | `admin@hdgfood.com` | `password` |
| Khách | `user1@example.com` … `user10@example.com` | `password` |

---

## 10. Thanh toán thử nghiệm (VNPay Sandbox)

Dùng khi test luồng VNPay trên môi trường sandbox:

| Trường | Giá trị |
|--------|---------|
| Ngân hàng | NCB |
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | NGUYEN VAN A |
| Ngày phát hành | 07/15 |
| OTP | `123456` |

> IPN local cần tunnel (ngrok) nếu muốn server tự nhận callback thanh toán.

---

## 11. Giao hàng & bản đồ

Luồng giao hàng được triển khai đầy đủ trên nhánh preview:

1. Quán cố định tọa độ GPS (mặc định Q.1, TP.HCM) — cấu hình trong **Admin → Cài đặt**.
2. Khách ghim vị trí trên bản đồ Leaflet hoặc dùng GPS.
3. API kiểm tra khoảng cách Haversine — chỉ giao trong bán kính (mặc định **25 km**).
4. Reverse geocode (OpenStreetMap Nominatim) → tự điền địa chỉ Tỉnh/Quận/Phường.
5. Đơn giao hàng tối thiểu **≥ 100.000₫** (giá món, chưa ship).
6. Phí ship: tiêu chuẩn 15.000₫ / hỏa tốc 30.000₫.

**API liên quan:**
- `GET /api/public/delivery/config` — tọa độ quán, bán kính, đơn tối thiểu
- `GET /api/public/delivery/check?lat=&lng=` — kiểm tra trong vùng giao

**File frontend chính:**
- `frontend/src/components/checkout/DeliveryMapPicker.tsx`
- `frontend/src/components/checkout/AddressForm.tsx`
- `frontend/src/lib/checkout-bill.ts`

---

## 12. Ghi chú vận hành

- **Ảnh không hiển thị**: chạy `php artisan storage:link` trong `backend/`.
- **Đổi schema lớn**: `php artisan migrate:fresh --seed` (môi trường dev).
- **Lỗi Next.js `routes-manifest.json`**: xóa `frontend/.next`, restart `npm run dev`.
- **GEMINI_API_KEY**: format `AIza...` nếu dùng Foodie AI.
- **Thùng rác**: mặc định giữ 30 ngày (`TRASH_RETENTION_DAYS`).

---

## 13. Cập nhật gần đây

### Nhánh `feature/delivery-checkout-preview`
- Giao hàng: bản đồ Leaflet, bán kính 25km, xác nhận vị trí GPS.
- Tự điền địa chỉ Tỉnh/Quận/Phường sau khi ghim & lưu.
- Đơn giao hàng tối thiểu 100.000₫ (frontend + backend).
- UI checkout: `CheckoutDeliveryPanel`, tab Giao cho tôi / Đặt hộ / Tại bàn.
- Cải thiện `LiveSearch`, animation fly-to-cart.

### Đã có trên `main`
- Thanh toán VNPay Sandbox + VietQR + COD.
- Thùng rác admin (soft delete) + khôi phục.
- Checkout bill thống nhất (`checkout-bill.ts`), dine-in cộng dồn đơn bàn.
- OAuth, loyalty tier, combo động, Foodie Assistant.

---

## License & liên hệ

Dự án phục vụ mục đích học tập / đồ án.  
Repository: [https://github.com/huynhnhu204/HDGFood](https://github.com/huynhnhu204/HDGFood)
