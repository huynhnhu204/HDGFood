<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\PostTopic;
use App\Models\User;
use Illuminate\Database\Seeder;

class PostTopicPostSeeder extends Seeder
{
    public function run(): void
    {
        $topics = [
            [
                'name'             => 'Tin khuyến mãi',
                'slug'             => 'tin-khuyen-mai',
                'description'      => 'Cập nhật các chương trình ưu đãi, voucher và flash sale mới nhất của HDG Food.',
                'status'           => 'active',
                'meta_title'       => 'Tin khuyến mãi | HDG Food',
                'meta_description' => 'Theo dõi các chương trình khuyến mãi, voucher và ưu đãi hấp dẫn tại HDG Food.',
            ],
            [
                'name'             => 'Thông báo hệ thống',
                'slug'             => 'thong-bao-he-thong',
                'description'      => 'Thông báo bảo trì, thay đổi chính sách và cập nhật quan trọng của website HDG Food.',
                'status'           => 'active',
                'meta_title'       => 'Thông báo hệ thống | HDG Food',
                'meta_description' => 'Nắm bắt nhanh các thông báo mới nhất liên quan đến website HDG Food.',
            ],
            [
                'name'             => 'Cập nhật tính năng',
                'slug'             => 'cap-nhat-tinh-nang',
                'description'      => 'Giới thiệu các tính năng mới giúp đặt món và quản lý đơn hàng tiện lợi hơn.',
                'status'           => 'active',
                'meta_title'       => 'Cập nhật tính năng mới | HDG Food',
                'meta_description' => 'Theo dõi các bản cập nhật tính năng mới trên website HDG Food.',
            ],
            [
                'name'             => 'Hướng dẫn sử dụng',
                'slug'             => 'huong-dan-su-dung',
                'description'      => 'Hướng dẫn đặt món, theo dõi đơn hàng, thanh toán và sử dụng voucher trên website.',
                'status'           => 'active',
                'meta_title'       => 'Hướng dẫn sử dụng website HDG Food',
                'meta_description' => 'Các bài viết hướng dẫn chi tiết cách sử dụng website HDG Food.',
            ],
            [
                'name'             => 'Câu chuyện HDG',
                'slug'             => 'cau-chuyen-hdg',
                'description'      => 'Các thông tin nội bộ, định hướng phát triển và hành trình nâng cấp dịch vụ HDG Food.',
                'status'           => 'active',
                'meta_title'       => 'Câu chuyện HDG Food',
                'meta_description' => 'Theo dõi hành trình phát triển và các cột mốc quan trọng của HDG Food.',
            ],
        ];

        $createdTopics = [];
        foreach ($topics as $topicData) {
            $createdTopics[] = PostTopic::updateOrCreate(
                ['slug' => $topicData['slug']],
                $topicData
            );
        }

        $this->command->info('✅ Đã seed ' . count($createdTopics) . ' chủ đề bài viết.');

        $admin = User::where('role', 'admin')->first() ?? User::first();
        $adminId = $admin?->id;

        $topicMap = PostTopic::whereIn('slug', array_column($topics, 'slug'))
            ->pluck('id', 'slug')
            ->toArray();

        $posts = [
            [
                'title'            => 'Flash Sale cuối tuần: giảm đến 30% combo',
                'slug'             => 'flash-sale-cuoi-tuan-giam-den-30-combo',
                'content'          => '<h2>Ưu đãi cuối tuần đã quay lại</h2>
<p>Từ 00:00 Thứ 7 đến 23:59 Chủ nhật, HDG Food áp dụng giảm giá đến <strong>30%</strong> cho các combo bán chạy.</p>
<h2>Áp dụng</h2>
<ul>
  <li>Combo Văn Phòng 2 người</li>
  <li>Set Gia Đình 4 người</li>
  <li>Một số combo theo khung giờ vàng 11:00 - 13:00</li>
</ul>
<p>Khách hàng có thể đặt trực tiếp trên website để nhận ưu đãi tự động tại bước thanh toán.</p>',
                'topic_slug'       => 'tin-khuyen-mai',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => true,
                'view_count'       => 2400,
                'meta_title'       => 'Flash Sale cuối tuần giảm đến 30% combo | HDG Food',
                'meta_description' => 'Cập nhật chương trình Flash Sale cuối tuần với nhiều combo giảm sâu trên website HDG Food.',
                'published_at'     => now()->subDays(2),
            ],
            [
                'title'            => 'Voucher thành viên mới: WELCOME10 đã hoạt động',
                'slug'             => 'voucher-thanh-vien-moi-welcome10-da-hoat-dong',
                'content'          => '<h2>Ưu đãi dành cho khách hàng mới</h2>
<p>Mã <strong>WELCOME10</strong> chính thức áp dụng cho tài khoản mới đăng ký trên website HDG Food.</p>
<h2>Điều kiện</h2>
<ul>
  <li>Giảm 10% tối đa 30.000đ</li>
  <li>Áp dụng cho đơn từ 50.000đ</li>
  <li>Mỗi tài khoản sử dụng 1 lần</li>
</ul>
<p>Mã được kiểm tra tự động tại bước thanh toán.</p>',
                'topic_slug'       => 'tin-khuyen-mai',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => false,
                'view_count'       => 1500,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => now()->subDays(7),
            ],
            [
                'title'            => 'Thông báo bảo trì hệ thống vào 02:00 sáng Chủ nhật',
                'slug'             => 'thong-bao-bao-tri-he-thong-02h-sang-chu-nhat',
                'content'          => '<h2>Lịch bảo trì định kỳ</h2>
<p>Website HDG Food sẽ bảo trì từ <strong>02:00 đến 03:30</strong> sáng Chủ nhật để nâng cấp hiệu năng và ổn định hệ thống thanh toán.</p>
<h2>Ảnh hưởng</h2>
<ul>
  <li>Tạm thời không tạo đơn mới trong thời gian bảo trì</li>
  <li>Đơn đã tạo trước đó vẫn được lưu an toàn</li>
  <li>Sau bảo trì, hệ thống hoạt động bình thường</li>
</ul>',
                'topic_slug'       => 'thong-bao-he-thong',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => false,
                'view_count'       => 920,
                'meta_title'       => 'Thông báo bảo trì hệ thống HDG Food',
                'meta_description' => 'Thông tin lịch bảo trì hệ thống website HDG Food và thời gian ảnh hưởng dự kiến.',
                'published_at'     => now()->subDays(1),
            ],
            [
                'title'            => 'Ra mắt giao diện quản lý đơn hàng mới trên website',
                'slug'             => 'ra-mat-giao-dien-quan-ly-don-hang-moi',
                'content'          => '<h2>Cập nhật giao diện mới</h2>
<p>HDG Food đã nâng cấp giao diện quản lý đơn hàng nhằm giúp khách hàng theo dõi trạng thái đơn trực quan hơn.</p>
<h2>Điểm mới</h2>
<ul>
  <li>Timeline trạng thái đơn rõ ràng theo từng bước</li>
  <li>Hiển thị phương thức thanh toán ngay trên đầu trang</li>
  <li>Tối ưu hiển thị trên thiết bị di động</li>
</ul>',
                'topic_slug'       => 'cap-nhat-tinh-nang',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => false,
                'view_count'       => 1180,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => now()->subDays(4),
            ],
            [
                'title'            => 'Hướng dẫn áp mã giảm giá khi thanh toán',
                'slug'             => 'huong-dan-ap-ma-giam-gia-khi-thanh-toan',
                'content'          => '<h2>Cách nhập mã giảm giá</h2>
<ol>
  <li>Thêm sản phẩm vào giỏ và vào trang thanh toán</li>
  <li>Nhập mã voucher tại ô "Mã giảm giá"</li>
  <li>Nhấn "Áp dụng" để hệ thống tính lại tổng tiền</li>
</ol>
<h2>Lưu ý</h2>
<p>Mỗi voucher có điều kiện tối thiểu đơn hàng, giới hạn số lần dùng hoặc giới hạn theo hạng thành viên.</p>',
                'topic_slug'       => 'huong-dan-su-dung',
                'status'           => 'published',
                'type'             => 'guide',
                'is_featured'      => false,
                'view_count'       => 860,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => now()->subDays(3),
            ],
            [
                'title'            => 'Cập nhật quy trình thanh toán tại bàn (dine-in)',
                'slug'             => 'cap-nhat-quy-trinh-thanh-toan-tai-ban',
                'content'          => '<h2>Điểm cải tiến</h2>
<p>Hệ thống dine-in mới chỉ thanh toán theo <strong>giỏ hàng hiện tại</strong>, tránh cộng nhầm tổng bill của cả bàn.</p>
<h2>Lợi ích</h2>
<ul>
  <li>Khách dễ tách bill khi gọi nhiều lượt</li>
  <li>Nhân viên đối soát nhanh hơn</li>
  <li>Giảm sai lệch số tiền thanh toán</li>
</ul>',
                'topic_slug'       => 'cap-nhat-tinh-nang',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => false,
                'view_count'       => 740,
                'meta_title'       => 'Cập nhật quy trình thanh toán tại bàn | HDG Food',
                'meta_description' => 'Thông báo cải tiến luồng thanh toán dine-in trên website HDG Food.',
                'published_at'     => now()->subDays(5),
            ],
            [
                'title'            => 'Thông báo nâng cấp tính năng theo dõi đơn hàng',
                'slug'             => 'thong-bao-nang-cap-tinh-nang-theo-doi-don-hang',
                'content'          => '<h2>Nâng cấp mới</h2>
<p>Trang theo dõi đơn hàng đã được bổ sung trạng thái chi tiết và thông tin thanh toán rõ ràng hơn.</p>
<h2>Khách hàng nhận được gì?</h2>
<ul>
  <li>Dễ theo dõi tiến trình xử lý đơn</li>
  <li>Biết ngay đơn đã thanh toán hay chưa</li>
  <li>Giảm thao tác liên hệ hỗ trợ thủ công</li>
</ul>',
                'topic_slug'       => 'thong-bao-he-thong',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => false,
                'view_count'       => 620,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => now()->subDays(6),
            ],
            [
                'title'            => 'Hướng dẫn đăng ký tài khoản mới trong 1 phút',
                'slug'             => 'huong-dan-dang-ky-tai-khoan-moi-trong-1-phut',
                'content'          => '<h2>Đăng ký nhanh trên HDG Food</h2>
<p>Bạn chỉ cần email hoặc số điện thoại là có thể tạo tài khoản để theo dõi đơn hàng và nhận ưu đãi thành viên.</p>
<h2>Các bước thực hiện</h2>
<ol>
  <li>Truy cập trang <strong>/register</strong></li>
  <li>Nhập họ tên, email/số điện thoại, mật khẩu</li>
  <li>Xác nhận và đăng nhập để bắt đầu đặt món</li>
</ol>
<p>Tài khoản mới có thể nhận mã chào mừng nếu đủ điều kiện chương trình.</p>',
                'topic_slug'       => 'huong-dan-su-dung',
                'status'           => 'published',
                'type'             => 'guide',
                'is_featured'      => false,
                'view_count'       => 980,
                'meta_title'       => 'Hướng dẫn đăng ký tài khoản mới | HDG Food',
                'meta_description' => 'Tạo tài khoản HDG Food nhanh chóng để theo dõi đơn và nhận ưu đãi thành viên.',
                'published_at'     => now()->subDays(8),
            ],
            [
                'title'            => 'Mở đăng ký chương trình thành viên HDG Rewards',
                'slug'             => 'mo-dang-ky-chuong-trinh-thanh-vien-hdg-rewards',
                'content'          => '<h2>HDG Rewards đã mở đăng ký</h2>
<p>Khách hàng có tài khoản có thể tham gia chương trình thành viên để tích điểm và đổi ưu đãi theo hạng.</p>
<h2>Quyền lợi chính</h2>
<ul>
  <li>Tích điểm theo giá trị đơn hàng</li>
  <li>Nhận voucher theo hạng thành viên</li>
  <li>Ưu tiên thông báo các chiến dịch khuyến mãi mới</li>
</ul>
<p>Đăng nhập tài khoản để kích hoạt và theo dõi điểm ngay trên hồ sơ cá nhân.</p>',
                'topic_slug'       => 'tin-khuyen-mai',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => true,
                'view_count'       => 1710,
                'meta_title'       => 'Mở đăng ký HDG Rewards | HDG Food',
                'meta_description' => 'Tham gia chương trình thành viên HDG Rewards để tích điểm và nhận ưu đãi hấp dẫn.',
                'published_at'     => now()->subDays(9),
            ],
            [
                'title'            => 'Thông báo cập nhật chính sách bảo mật tài khoản',
                'slug'             => 'thong-bao-cap-nhat-chinh-sach-bao-mat-tai-khoan',
                'content'          => '<h2>Cập nhật chính sách bảo mật</h2>
<p>HDG Food điều chỉnh chính sách bảo mật nhằm tăng cường an toàn cho tài khoản người dùng khi đăng nhập và thanh toán.</p>
<h2>Nội dung chính</h2>
<ul>
  <li>Bổ sung hướng dẫn đặt mật khẩu mạnh</li>
  <li>Làm rõ phạm vi sử dụng dữ liệu đơn hàng</li>
  <li>Cập nhật kênh hỗ trợ khi phát hiện truy cập bất thường</li>
</ul>
<p>Vui lòng đọc bản chính sách mới tại trang Chính sách để tiếp tục sử dụng dịch vụ.</p>',
                'topic_slug'       => 'thong-bao-he-thong',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => false,
                'view_count'       => 530,
                'meta_title'       => 'Cập nhật chính sách bảo mật tài khoản | HDG Food',
                'meta_description' => 'Thông báo cập nhật chính sách bảo mật mới nhất trên website HDG Food.',
                'published_at'     => now()->subDays(10),
            ],
        ];

        $count = 0;
        foreach ($posts as $postData) {
            $topicSlug = $postData['topic_slug'];
            unset($postData['topic_slug']);

            $postData['topic_id'] = $topicMap[$topicSlug] ?? null;
            $postData['user_id']  = $adminId;

            Post::updateOrCreate(
                ['slug' => $postData['slug']],
                $postData
            );
            $count++;
        }

        $this->command->info('✅ Đã seed ' . $count . ' bài viết.');
    }
}
