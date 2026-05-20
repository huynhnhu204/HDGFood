# HDG FOOD - He thong web quan ly nha hang

HDG FOOD la he thong web fullstack cho mo hinh nha hang/quan an, gom:
- Client site cho khach dat mon, xem blog, xem khuyen mai, quan ly gio hang.
- Admin site cho van hanh: quan ly san pham, bai viet, don hang, kho, banner, voucher, ban an, nguoi dung...
- Backend API Laravel phuc vu du lieu cho ca 2 phia.

README nay duoc viet lai de mo ta ro "web hien co dang dung de lam gi" va cac chuc nang dang co.

---

## 1) Tong quan chuc nang he thong

### 1.1 Client (khach hang)
- Trang chu hien thi danh muc nhanh, khuyen mai noi bat, goi y mon, combo, blog, danh gia.
- Danh sach san pham va loc/nang cao:
  - loc theo danh muc, khoang gia, sap xep, tim kiem.
  - ho tro che do luoi/bang.
- Trang chi tiet san pham:
  - xem nhieu anh (anh chinh + album tu admin).
  - chon tuy bien/topping, so luong, ghi chu.
  - them vao gio, mua ngay, san pham lien quan, da xem gan day.
- Gio hang:
  - luu state phia client, dong bo UI realtime.
  - ho tro che do dat online hoac an tai ban.
- Luong ban an:
  - chon ban khi dine-in.
  - luu table session token, theo doi trang thai ban.
- Blog/tin tuc:
  - danh sach blog, theo chu de, trang chi tiet bai viet.
  - SEO metadata va OpenGraph cho bai viet.
- Trang bo sung: about, contact, policy, promotions, combos, profile.

### 1.2 Admin (quan tri van hanh)
- Dashboard tong quan KPI, doanh thu, so lieu don hang/san pham.
- Quan ly san pham:
  - CRUD san pham, anh chinh, album anh, option/topping, thong tin dinh duong.
  - clone san pham, cap nhat nhanh trang thai.
- Quan ly danh muc.
- Quan ly don hang:
  - theo doi va chuyen trang thai don.
  - xem chi tiet, cap nhat xu ly don.
- Quan ly kho:
  - phieu nhap, inventory log, dieu chinh ton.
- Quan ly khuyen mai, voucher.
- Quan ly bai viet/blog:
  - CRUD bai viet, thumbnail, SEO (meta title/description), chu de bai viet.
- Quan ly banner.
- Quan ly ban an va phien ban.
- Quan ly thanh vien/nguoi dung.
- **Thung rac** (`/admin/trash`): khoi phuc hoac xoa vinh vien ban ghi da xoa.
- **Thanh toan don**: VNPay Sandbox, VietQR, doi soat trang thai thanh toan tren don hang.

### 1.3 Backend API
- Cung cap REST API cho toan bo module.
- Validation request, auth, relation data, pagination/filter/sort.
- Xu ly upload file (anh san pham, thumbnail bai viet...).
- Tinh toan cac thong tin phu tro (gia cuoi, rating, sold count, promotion active...).

---

## 2) Chuc nang theo module (chi tiet)

### 2.1 Module san pham
- Muc dich:
  - Hien thi menu cho khach.
  - Cho admin quan ly thong tin mon an va ton kho.
- Hien co:
  - san pham co category, gia, ton kho, mo ta ngan/dai, anh.
  - option/value (vd: size, topping), gia cong them.
  - image gallery (product_images) de hien thi nhieu anh o trang chi tiet.
  - lay danh sach theo sort (best selling, gia tang/giam, moi nhat...).
  - co danh gia/rating trung binh va reviews count.

### 2.2 Module don hang
- Muc dich:
  - Quan ly vong doi don tu dat den hoan thanh.
- Hien co:
  - tao/quan ly don va chi tiet item.
  - cap nhat trang thai don o admin.
  - thong ke so lieu theo don.

### 2.3 Module kho
- Muc dich:
  - Theo doi ton kho theo nhap/xuat/dieu chinh.
- Hien co:
  - inventory logs.
  - phieu nhap.
  - cap nhat stock va lich su bien dong.

### 2.4 Module khuyen mai + voucher
- Muc dich:
  - Tang chuyen doi va kich cau dat mon.
- Hien co:
  - promotion gan voi san pham.
  - voucher cho don hang.
  - frontend co khu vuc khuyen mai hot, co loc/sap xep.

### 2.5 Module blog/noi dung
- Muc dich:
  - Truyen thong thuong hieu, SEO organic, chia se noi dung.
- Hien co:
  - post topic + post.
  - thumbnail bai viet upload tu admin.
  - listing + detail + related posts.
  - ho tro metadata/OpenGraph/schema.

### 2.6 Module banner
- Muc dich:
  - Trinh bay noi dung quang ba o cac vi tri.
- Hien co:
  - admin CRUD banner.
  - client slider banner theo vi tri trang.

### 2.7 Module ban an (dine-in)
- Muc dich:
  - Ho tro dat mon tai cho theo so ban.
- Hien co:
  - chon ban va claim session.
  - local storage table_id/session_token.
  - polling trang thai ban va xu ly ket thuc phien.

### 2.8 Module profile/wishlist/review
- Muc dich:
  - Tang trai nghiem nguoi dung da dang nhap.
- Hien co:
  - profile co ban.
  - danh sach yeu thich.
  - review san pham.

---

## 3) Cong nghe dang su dung

### Backend
- Laravel 11, PHP 8.2+, MySQL.
- Eloquent ORM, API Resource, validation, migration/seeder.
- Upload file qua storage public.

### Frontend
- Next.js (App Router), React, TypeScript.
- Tailwind CSS, Framer Motion, Lucide Icons.
- Axios service layer.
- Zustand cho state gio hang/auth va cac state dung chung.

---

## 4) Cau truc thu muc chinh

```text
TTTN_2122110580/
|-- backend/
|   |-- app/
|   |   |-- Http/Controllers
|   |   |-- Http/Resources
|   |   |-- Models
|   |   `-- Services
|   |-- database/
|   |   |-- migrations
|   |   `-- seeders
|   `-- routes/api.php
`-- frontend/
    |-- src/app/
    |   |-- (client)   # client pages
    |   `-- (admin)    # admin pages
    |-- src/components
    |-- src/services
    |-- src/store
    `-- src/types
```

---

## 5) Huong dan cai dat nhanh

### 5.1 Backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```
Backend mac dinh: `http://localhost:8000`

### 5.2 Frontend
```bash
cd frontend
npm install
```
Tao file `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
Chay:
```bash
npm run dev
```
Frontend mac dinh: `http://localhost:3000`

---

## 6) Tai khoan demo

### Admin
- Email: `admin@hdgfood.com`
- Password: `password`

### User
- Email: `user1@example.com` ... `user10@example.com`
- Password: `password`

---

## 7) Ghi chu van hanh

- Neu upload anh khong hien thi, can dam bao da co symlink storage:
```bash
cd backend
php artisan storage:link
```
- Neu doi schema lon, nen migrate fresh + seed de dong bo du lieu mau.
- Neu gap loi hydration tren frontend, kiem tra extension trinh duyet autofill/DOM injector.

---

## 8) Cap nhat gan day (GitHub)

### 8.1 Thanh toan VNPay + VietQR (da co tren `main`)
- Luong checkout tach buoc: gio hang → thanh toan (`/checkout/payment`) → thanh cong / VNPay return.
- Khach chon: **VNPay Sandbox**, **chuyen khoan VietQR**, hoac **COD**.
- VNPay: tao URL thanh toan, callback IPN, trang return; luu `vnpay_txn_ref`, `payment_claimed_at` tren don.
- Admin: badge trang thai thanh toan, card doi soat don, cai dat VNPay/VietQR trong **Cai dat**.
- API: `PaymentController`, `VnPayController`, `PaymentSupport`.

### 8.2 Thung rac admin + soft delete (ban cap nhat moi)
- Xoa mem nhieu thuc the: san pham, danh muc, combo, khuyen mai, voucher, banner, ban, bai viet/chu de, review, chinh sach, menu, thanh vien, anh san pham...
- Trang **`/admin/trash`**: xem theo loai, tim kiem, khoi phuc hoac xoa vinh vien.
- API admin: `GET /api/admin/trash`, `GET /api/admin/trash/summary`, `POST .../restore`, `DELETE ...` (force).
- Danh sach san pham/danh muc admin co tab **Da xoa** (filter `trashed=only`).

### 8.3 Checkout & dat tai ban
- Module `checkout-bill.ts`: tinh bill dong nhat (combo, tier, voucher, diem, phi ship).
- Dat tai ban: hien tong don ban dang mo (tham khao), **chi VNPay/charge so tien gio hien tai**, khong cong nham tong bill ban.
- Gio hang: dong bo state cho dine-in / table session.

### 8.4 VNPay (cai tien them)
- Cau hinh mo rong trong `.env.example` / `config/vnpay.php`.
- Lenh debug: `php artisan vnpay:probe` (kiem tra ket noi sandbox).

**Sau khi pull code moi:**
```bash
cd backend && php artisan migrate
```

---

## 9) Thong tin du an

- Sinh vien: Duong Dao Huynh Nhu
- MSSV: 2122110580
- Muc dich: do an/hoc tap va phat trien he thong web quan ly nha hang.
