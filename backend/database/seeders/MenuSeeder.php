<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Menu;
use App\Models\MenuItem;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        // Header Menu
        $homeMenu = Menu::updateOrCreate(
            ['name' => 'Trang chủ', 'position' => 'header'],
            [
                'name'        => 'Trang chủ',
                'position'    => 'header',
                'sort_order'  => 1,
                'status'      => 'active',
            ]
        );

        MenuItem::create([
            'menu_id' => $homeMenu->id,
            'title' => 'Trang chủ',
            'type' => 'custom',
            'url' => '/',
            'sort_order' => 1,
        ]);

        $productsMenu = Menu::updateOrCreate(
            ['name' => 'Thực đơn', 'position' => 'header'],
            [
                'name'        => 'Thực đơn',
                'position'    => 'header',
                'sort_order'  => 2,
                'status'      => 'active',
            ]
        );

        // Sub menu cho Thực đơn
        MenuItem::create([
            'menu_id' => $productsMenu->id,
            'title' => 'Tất cả món ăn',
            'url' => '/products',
            'sort_order' => 1,
        ]);

        MenuItem::create([
            'menu_id' => $productsMenu->id,
            'title' => 'Khuyến mãi',
            'url' => '/promotions',
            'sort_order' => 2,
        ]);

        $aboutMenu = Menu::updateOrCreate(
            ['name' => 'Về chúng tôi', 'position' => 'header'],
            [
                'name'        => 'Về chúng tôi',
                'position'    => 'header',
                'sort_order'  => 3,
                'status'      => 'active',
            ]
        );

        MenuItem::create([
            'menu_id' => $aboutMenu->id,
            'title' => 'Giới thiệu',
            'url' => '/about',
            'sort_order' => 1,
        ]);

        $contactMenu = Menu::updateOrCreate(
            ['name' => 'Liên hệ', 'position' => 'header'],
            [
                'name'        => 'Liên hệ',
                'position'    => 'header',
                'sort_order'  => 4,
                'status'      => 'active',
            ]
        );

        MenuItem::create([
            'menu_id' => $contactMenu->id,
            'title' => 'Liên hệ',
            'type' => 'custom',
            'url' => '/about',
            'sort_order' => 1,
        ]);

        // Footer Menu
        $footerInfo = Menu::updateOrCreate(
            ['name' => 'Thông tin', 'position' => 'footer'],
            [
                'name'        => 'Thông tin',
                'position'    => 'footer',
                'sort_order'  => 1,
                'status'      => 'active',
            ]
        );

        MenuItem::create([
            'menu_id' => $footerInfo->id,
            'title' => 'Về HDG Food',
            'url' => '/about',
            'sort_order' => 1,
        ]);

        MenuItem::create([
            'menu_id' => $footerInfo->id,
            'title' => 'Chính sách bảo mật',
            'url' => '/privacy',
            'sort_order' => 2,
        ]);

        $this->command->info('✅ Đã seed menus và menu items');
    }
}
