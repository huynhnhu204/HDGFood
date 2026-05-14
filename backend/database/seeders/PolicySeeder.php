<?php

namespace Database\Seeders;

use App\Models\Policy;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Chính sách hiển thị trên storefront (footer / trang policy).
 */
class PolicySeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('email', 'admin@hdgfood.vn')->value('id');

        $rows = [
            [
                'title' => 'Điều khoản sử dụng',
                'slug' => 'dieu-khoan-su-dung',
                'icon' => 'file-text',
                'category' => 'general',
                'order' => 1,
                'content' => '<p>Nội dung điều khoản sử dụng dịch vụ đặt món và website HDG Food. Khách hàng đồng ý tuân thủ các quy định khi truy cập và đặt hàng.</p>',
            ],
            [
                'title' => 'Chính sách bảo mật',
                'slug' => 'chinh-sach-bao-mat',
                'icon' => 'shield',
                'category' => 'general',
                'order' => 2,
                'content' => '<p>Chúng tôi cam kết bảo vệ thông tin cá nhân theo quy định. Dữ liệu chỉ dùng để xử lý đơn hàng và hỗ trợ khách hàng.</p>',
            ],
            [
                'title' => 'Chính sách giao hàng',
                'slug' => 'chinh-sach-giao-hang',
                'icon' => 'truck',
                'category' => 'shipping',
                'order' => 10,
                'content' => '<p>Thời gian giao hàng và phạm vi áp dụng do cửa hàng quy định theo từng khu vực. Phí ship có thể thay đổi theo đơn.</p>',
            ],
            [
                'title' => 'Chính sách đổi trả',
                'slug' => 'chinh-sach-doi-tra',
                'icon' => 'refresh-ccw',
                'category' => 'order',
                'order' => 20,
                'content' => '<p>Khiếu nại về chất lượng món ăn vui lòng liên hệ trong vòng 24 giờ kể từ khi nhận hàng. Đơn đã xác nhận hoàn thành có thể không áp dụng đổi trả tùy loại món.</p>',
            ],
        ];

        foreach ($rows as $row) {
            Policy::updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'title' => $row['title'],
                    'icon' => $row['icon'],
                    'category' => $row['category'],
                    'content' => $row['content'],
                    'order' => $row['order'],
                    'is_active' => true,
                    'last_updated_by' => $adminId,
                ]
            );
        }
    }
}
