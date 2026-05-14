<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seed đầy đủ dữ liệu demo — chạy sau migrate:
 *
 *   php artisan migrate:fresh --seed
 *
 * Hoặc chỉ seed (không xóa bảng):
 *
 *   php artisan db:seed
 *
 * Thứ tự phụ thuộc FK / logic nghiệp vụ.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            PolicySeeder::class,
            CategoryProductSeeder::class,
            ComboSeeder::class,
            ImportReceiptSeeder::class,
            OrderSeeder::class,
            PromotionVoucherSeeder::class,
            PostTopicPostSeeder::class,
            BannerSeeder::class,
            MenuSeeder::class,
            ReviewSeeder::class,
            NotificationSeeder::class,
            TableSeeder::class,
            ContactSeeder::class,
            SettingSeeder::class,
            LoyaltyAutomationSeeder::class,
        ]);

        $this->command->info('✅ Seed hoàn tất (demo đầy đủ các module).');

        $rows = [
            ['users', \App\Models\User::count()],
            ['categories', \App\Models\Category::count()],
            ['products', \App\Models\Product::count()],
            ['product_options', \App\Models\ProductOption::count()],
            ['combos', \App\Models\Combo::count()],
            ['combo_groups', \App\Models\ComboGroup::count()],
            ['import_receipts', \App\Models\ImportReceipt::count()],
            ['import_receipt_items', \App\Models\ImportReceiptItem::count()],
            ['orders', \App\Models\Order::count()],
            ['order_items', \App\Models\OrderItem::count()],
            ['promotions', \App\Models\Promotion::count()],
            ['vouchers', \App\Models\Voucher::count()],
            ['post_topics', \App\Models\PostTopic::count()],
            ['posts', \App\Models\Post::count()],
            ['policies', \App\Models\Policy::count()],
            ['banners', \App\Models\Banner::count()],
            ['menus', \App\Models\Menu::count()],
            ['menu_items', \App\Models\MenuItem::count()],
            ['reviews', \App\Models\Review::count()],
            ['notifications', \App\Models\Notification::count()],
            ['tables', \App\Models\Table::count()],
            ['contacts', \App\Models\Contact::count()],
            ['settings', \App\Models\Setting::count()],
            ['loyalty_reward_catalogs', \App\Models\LoyaltyRewardCatalog::count()],
            ['loyalty_point_transactions', \App\Models\LoyaltyPointTransaction::count()],
            ['loyalty_redemptions', \App\Models\LoyaltyRedemption::count()],
            ['automation_campaign_logs', \App\Models\AutomationCampaignLog::count()],
        ];

        $this->command->table(['Bảng', 'Số bản ghi'], $rows);
    }
}
