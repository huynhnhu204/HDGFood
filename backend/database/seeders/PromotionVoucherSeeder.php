<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Promotion;
use App\Models\Voucher;
use Illuminate\Database\Seeder;

class PromotionVoucherSeeder extends Seeder
{
    public function run(): void
    {
        $this->createPromotions();
        $this->createVouchers();
    }

    private function createPromotions(): void
    {
        // 1. Khuyến mãi % trên sản phẩm — đang chạy
        $traSua = Product::where('slug', 'tra-sua-tran-chau-duong-den')->first();
        if ($traSua) {
            Promotion::updateOrCreate(
                ['name' => 'Trà sữa tháng 4 - Giảm 10%'],
                [
                    'discount_type'   => 'percent',
                    'discount_value'  => 10,
                    'start_date'      => now()->subDays(2),
                    'end_date'        => now()->addDays(10),
                    'is_active'       => true,
                ]
            )->products()->sync([$traSua->id]);
        }

        // 2. Giảm tiền mặt trên sản phẩm
        $phoBo = Product::where('slug', 'pho-bo-tai-nam')->first();
        if ($phoBo) {
            Promotion::updateOrCreate(
                ['name' => 'Phở bò — Giảm 5.000đ'],
                [
                    'discount_type'   => 'amount',
                    'discount_value'  => 5000,
                    'start_date'      => now()->subDays(5),
                    'end_date'        => now()->addDays(20),
                    'is_active'       => true,
                ]
            )->products()->sync([$phoBo->id]);
        }

        // 3. Giảm % có đơn tối thiểu
        $comTam = Product::where('slug', 'com-tam-suon-bi-cha')->first();
        if ($comTam) {
            Promotion::updateOrCreate(
                ['name' => 'Cơm tấm — Giảm 15% (đơn từ 80.000đ)'],
                [
                    'discount_type'       => 'percent',
                    'discount_value'      => 15,
                    'min_order_amount'    => 80000,
                    'start_date'         => now()->subDays(3),
                    'end_date'           => now()->addDays(14),
                    'is_active'          => true,
                ]
            )->products()->sync([$comTam->id]);
        }

        // 4. Giảm tiền mặt cho đơn hàng lớn
        $lauThai = Product::where('slug', 'lau-thai-hai-san')->first();
        if ($lauThai) {
            Promotion::updateOrCreate(
                ['name' => 'Lẩu Thái — Giảm 50.000đ (đơn từ 300.000đ)'],
                [
                    'discount_type'       => 'amount',
                    'discount_value'      => 50000,
                    'min_order_amount'    => 300000,
                    'start_date'         => now()->subDays(1),
                    'end_date'           => now()->addDays(7),
                    'is_active'          => true,
                ]
            )->products()->sync([$lauThai->id]);
        }
    }

    private function createVouchers(): void
    {
        // 1. WELCOME10 — Chào mừng thành viên mới
        Voucher::updateOrCreate(
            ['code' => 'WELCOME10'],
            [
                'name'              => 'Chào mừng thành viên mới',
                'description'       => 'Giảm 10% cho đơn hàng đầu tiên, tối đa 30.000đ',
                'discount_type'     => 'percent',
                'discount_value'    => 10,
                'max_discount'      => 30000,
                'min_order_amount'  => 50000,
                'usage_limit'       => 200,
                'usage_per_user'    => 1,
                'start_date'        => now(),
                'end_date'          => now()->addMonths(3),
                'tier_restriction'  => 'all',
                'is_active'         => true,
            ]
        );

        // 2. SALE20 — Flash Sale cuối tuần
        Voucher::updateOrCreate(
            ['code' => 'SALE20'],
            [
                'name'              => 'Flash Sale cuối tuần',
                'description'       => 'Giảm 20% cho đơn từ 100.000đ, tối đa 50.000đ',
                'discount_type'     => 'percent',
                'discount_value'    => 20,
                'max_discount'      => 50000,
                'min_order_amount'  => 100000,
                'usage_limit'       => 100,
                'usage_per_user'    => 2,
                'start_date'        => now(),
                'end_date'          => now()->addDays(14),
                'tier_restriction'  => 'all',
                'is_active'         => true,
            ]
        );

        // 3. FREESHIP — Miễn phí giao hàng
        Voucher::updateOrCreate(
            ['code' => 'FREESHIP'],
            [
                'name'              => 'Miễn phí giao hàng',
                'description'       => 'Giảm 20.000đ phí giao hàng cho mọi đơn',
                'discount_type'     => 'amount',
                'discount_value'    => 20000,
                'min_order_amount'  => 100000,
                'usage_limit'       => 500,
                'usage_per_user'    => 3,
                'start_date'        => now(),
                'end_date'          => now()->addMonths(2),
                'tier_restriction'  => 'all',
                'is_active'         => true,
            ]
        );

        // 4. GOLD10 — Dành cho khách Gold+
        Voucher::updateOrCreate(
            ['code' => 'GOLD10'],
            [
                'name'              => 'Ưu đãi Khách Hàng Vàng',
                'description'       => 'Giảm 10% cho thành viên Gold trở lên, không giới hạn',
                'discount_type'     => 'percent',
                'discount_value'    => 10,
                'max_discount'      => 100000,
                'min_order_amount'  => 150000,
                'usage_limit'       => null,
                'usage_per_user'    => 10,
                'start_date'        => now(),
                'end_date'          => now()->addMonths(6),
                'tier_restriction'  => 'gold',
                'is_active'         => true,
            ]
        );

        // 5. DRINK30 — Giảm 30% cho đồ uống
        $nuocUong = Product::whereHas('category', fn($q) => $q->where('slug', 'nuoc-uong'))->pluck('id');
        if ($nuocUong->isNotEmpty()) {
            $voucher = Voucher::updateOrCreate(
                ['code' => 'DRINK30'],
                [
                    'name'              => 'Ưu đãi đồ uống — Giảm 30%',
                    'description'       => 'Giảm 30% cho tất cả đồ uống, tối đa 20.000đ',
                    'discount_type'     => 'percent',
                    'discount_value'    => 30,
                    'max_discount'      => 20000,
                    'min_order_amount'  => null,
                    'usage_limit'       => 300,
                    'usage_per_user'    => 5,
                    'start_date'        => now(),
                    'end_date'          => now()->addDays(30),
                    'tier_restriction'  => 'all',
                    'apply_to'          => 'products',
                    'is_active'         => true,
                ]
            );
            $voucher->products()->sync($nuocUong->toArray());
        }

        // 6. TETHOLIDAY — Đã hết hạn (dùng để test)
        Voucher::updateOrCreate(
            ['code' => 'TETHOLIDAY'],
            [
                'name'              => 'Tết Nguyên Đán 2026',
                'description'       => 'Giảm 25% mọi món, tối đa 200.000đ — Đã hết hạn',
                'discount_type'     => 'percent',
                'discount_value'    => 25,
                'max_discount'      => 200000,
                'min_order_amount'  => 200000,
                'usage_limit'       => null,
                'usage_per_user'    => 3,
                'start_date'        => now()->subMonths(2),
                'end_date'          => now()->subDays(1),
                'tier_restriction'  => 'all',
                'is_active'         => false,
            ]
        );
    }
}
