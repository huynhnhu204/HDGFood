<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Banner;

class BannerSeeder extends Seeder
{
    public function run(): void
    {
        $banners = [
            [
                'title' => 'Khuyến mãi mùa hè - Giảm giá lên đến 50%',
                'image_path' => 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=400&fit=crop',
                'mobile_image_path' => 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
                'link_url' => '/promotions',
                'position' => 'slider',
                'sort_order' => 1,
                'status' => 'active',
                'start_date' => now(),
                'end_date' => now()->addMonths(3),
            ],
            [
                'title' => 'Món mới ra mắt - Thử ngay hôm nay',
                'image_path' => 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=400&fit=crop',
                'mobile_image_path' => 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
                'link_url' => '/products',
                'position' => 'slider',
                'sort_order' => 2,
                'status' => 'active',
                'start_date' => now(),
                'end_date' => now()->addMonths(2),
            ],
            [
                'title' => 'Giao hàng miễn phí - Đơn từ 200.000đ',
                'image_path' => 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=400&fit=crop',
                'mobile_image_path' => 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop',
                'link_url' => '/products',
                'position' => 'slider',
                'sort_order' => 3,
                'status' => 'active',
                'start_date' => now(),
                'end_date' => now()->addMonths(6),
            ],
            [
                'title' => 'Banner trang chủ giữa',
                'image_path' => 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
                'link_url' => '/about',
                'position' => 'home_center',
                'sort_order' => 1,
                'status' => 'active',
            ],
            [
                'title' => 'Banner sidebar',
                'image_path' => 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=400&fit=crop',
                'link_url' => '/contact',
                'position' => 'sidebar',
                'sort_order' => 1,
                'status' => 'active',
            ],
        ];

        foreach ($banners as $banner) {
            Banner::updateOrCreate(
                ['title' => $banner['title']],
                $banner
            );
        }

        $this->command->info('✅ Đã seed ' . count($banners) . ' banners');
    }
}
