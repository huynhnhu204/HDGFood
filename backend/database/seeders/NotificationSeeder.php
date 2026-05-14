<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Notification;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $notifications = [
            [
                'title' => 'Đơn hàng mới #1001',
                'content' => 'Bạn có đơn hàng mới từ Nguyễn Văn A',
                'type' => 'order',
                'link' => '/admin/orders/1',
                'is_read' => false,
            ],
            [
                'title' => 'Đơn hàng mới #1002',
                'content' => 'Bạn có đơn hàng mới từ Trần Thị B',
                'type' => 'order',
                'link' => '/admin/orders/2',
                'is_read' => false,
            ],
            [
                'title' => 'Sản phẩm sắp hết hàng',
                'content' => 'Bánh mì thịt chỉ còn 5 sản phẩm',
                'type' => 'system',
                'link' => '/admin/products',
                'is_read' => true,
            ],
            [
                'title' => 'Đánh giá mới',
                'content' => 'Có đánh giá mới cho sản phẩm Phở bò',
                'type' => 'system',
                'link' => '/admin/reviews',
                'is_read' => false,
            ],
        ];

        foreach ($notifications as $notification) {
            Notification::updateOrCreate(
                ['title' => $notification['title']],
                $notification
            );
        }

        $this->command->info('✅ Đã seed ' . count($notifications) . ' notifications');
    }
}
