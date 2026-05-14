<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\PostTopic;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PostTopicPostSeeder extends Seeder
{
    public function run(): void
    {
        /* ════════════════════════════════════════
         | 1. CHỦ ĐỀ BÀI VIẾT (Post Topics)
         ════════════════════════════════════════ */
        $topics = [
            [
                'name'             => 'Kiến thức dinh dưỡng',
                'slug'             => 'kien-thuc-dinh-duong',
                'description'      => 'Các bài viết chia sẻ kiến thức về dinh dưỡng, sức khỏe và chế độ ăn uống lành mạnh.',
                'status'           => 'active',
                'meta_title'       => 'Kiến thức dinh dưỡng | HDG Food Blog',
                'meta_description' => 'Khám phá các bí quyết ăn uống lành mạnh, cân bằng dinh dưỡng và duy trì sức khỏe mỗi ngày từ HDG Food.',
            ],
            [
                'name'             => 'Tin khuyến mãi',
                'slug'             => 'tin-khuyen-mai',
                'description'      => 'Cập nhật các chương trình ưu đãi, khuyến mãi hấp dẫn từ HDG Food.',
                'status'           => 'active',
                'meta_title'       => 'Tin khuyến mãi HDG Food',
                'meta_description' => 'Xem ngay các chương trình ưu đãi, giảm giá và khuyến mãi đặc biệt mới nhất từ HDG Food.',
            ],
            [
                'name'             => 'Giới thiệu món ăn',
                'slug'             => 'gioi-thieu-mon-an',
                'description'      => 'Hành trình khám phá hương vị và câu chuyện đằng sau những món ăn độc đáo tại HDG Food.',
                'status'           => 'active',
                'meta_title'       => 'Giới thiệu món ăn đặc sắc | HDG Food',
                'meta_description' => 'Khám phá những món ăn ngon, hương vị độc đáo và quy trình chế biến tỉ mỉ tại HDG Food.',
            ],
            [
                'name'             => 'Công thức nấu ăn',
                'slug'             => 'cong-thuc-nau-an',
                'description'      => 'Tổng hợp công thức nấu những món ăn ngon, đơn giản dành cho gia đình.',
                'status'           => 'active',
                'meta_title'       => 'Công thức nấu ăn ngon | HDG Food',
                'meta_description' => 'Hàng trăm công thức nấu ăn ngon, đơn giản và dễ thực hiện tại nhà từ HDG Food.',
            ],
            [
                'name'             => 'Câu chuyện HDG',
                'slug'             => 'cau-chuyen-hdg',
                'description'      => 'Những câu chuyện thú vị về hành trình phát triển và con người tại HDG Food.',
                'status'           => 'inactive',
                'meta_title'       => 'Câu chuyện HDG Food',
                'meta_description' => 'Hành trình hình thành và phát triển của thương hiệu HDG Food từ những ngày đầu tiên.',
            ],
        ];

        $createdTopics = [];
        foreach ($topics as $topicData) {
            $createdTopics[] = PostTopic::firstOrCreate(
                ['slug' => $topicData['slug']],
                $topicData
            );
        }

        $this->command->info('✅ Đã seed ' . count($createdTopics) . ' chủ đề bài viết.');

        /* ════════════════════════════════════════
         | 2. BÀI VIẾT (Posts)
         ════════════════════════════════════════ */

        // Lấy admin user (hoặc user đầu tiên)
        $admin = User::where('role', 'admin')->first() ?? User::first();
        $adminId = $admin?->id;

        // Map topic theo slug
        $topicMap = PostTopic::whereIn('slug', array_column($topics, 'slug'))
            ->pluck('id', 'slug')
            ->toArray();

        $posts = [
            /* ── Chủ đề: Kiến thức dinh dưỡng ── */
            [
                'title'            => '10 Thực phẩm giúp tăng cường hệ miễn dịch bạn nên biết',
                'slug'             => '10-thuc-pham-giup-tang-cuong-he-mien-dich',
                'content'          => '<h2>Hệ miễn dịch và tầm quan trọng</h2>
<p>Hệ miễn dịch là "hàng rào" bảo vệ cơ thể khỏi vi khuẩn, virus và các tác nhân gây bệnh. Chế độ ăn uống đóng vai trò quan trọng trong việc duy trì sức đề kháng tự nhiên của cơ thể.</p>
<h2>10 Thực phẩm hàng đầu</h2>
<ul>
  <li><strong>Tỏi</strong> – chứa allicin có tác dụng kháng khuẩn mạnh.</li>
  <li><strong>Gừng</strong> – giảm viêm, tăng cường tuần hoàn máu.</li>
  <li><strong>Cam, quýt</strong> – giàu Vitamin C, kích thích sản xuất bạch cầu.</li>
  <li><strong>Bông cải xanh</strong> – chứa vitamin A, C, E và nhiều chất chống oxy hóa.</li>
  <li><strong>Sữa chua</strong> – bổ sung lợi khuẩn probiotics tốt cho đường ruột.</li>
  <li><strong>Hạnh nhân</strong> – nguồn Vitamin E dồi dào, bảo vệ tế bào.</li>
  <li><strong>Nghệ</strong> – curcumin có tác dụng kháng viêm tuyệt vời.</li>
  <li><strong>Trà xanh</strong> – chứa EGCG, chất chống oxy hóa mạnh.</li>
  <li><strong>Ớt chuông đỏ</strong> – chứa gấp đôi Vitamin C so với cam.</li>
  <li><strong>Cá hồi</strong> – OmHDG-3 giúp giảm viêm và tăng kháng thể.</li>
</ul>
<p>Hãy bổ sung những thực phẩm này vào bữa ăn hàng ngày để có một cơ thể khỏe mạnh!</p>',
                'topic_slug'       => 'kien-thuc-dinh-duong',
                'status'           => 'published',
                'type'             => 'blog',
                'is_featured'      => true,
                'view_count'       => 1234,
                'meta_title'       => '10 Thực phẩm tăng hệ miễn dịch hiệu quả | HDG Food',
                'meta_description' => 'Khám phá 10 thực phẩm tự nhiên giúp tăng cường hệ miễn dịch, bảo vệ sức khỏe mỗi ngày. Được chuyên gia HDG Food tổng hợp và kiểm chứng.',
                'published_at'     => now()->subDays(5),
            ],
            [
                'title'            => 'Protein là gì? Tại sao cơ thể cần protein mỗi ngày?',
                'slug'             => 'protein-la-gi-tai-sao-can-protein',
                'content'          => '<h2>Protein là gì?</h2>
<p>Protein (chất đạm) là một trong ba đại dưỡng chất thiết yếu của cơ thể, bên cạnh carbohydrate và chất béo. Protein được cấu tạo từ các axit amin liên kết với nhau.</p>
<h2>Tại sao cơ thể cần protein?</h2>
<ul>
  <li>Xây dựng và phục hồi cơ bắp</li>
  <li>Hỗ trợ hệ miễn dịch (kháng thể là protein)</li>
  <li>Vận chuyển oxy trong máu (hemoglobin)</li>
  <li>Cung cấp năng lượng khi cần thiết</li>
</ul>
<h2>Nguồn protein tốt</h2>
<p>Thịt gà, cá, trứng, đậu hũ, hạt chia, sữa và các sản phẩm từ sữa đều là những nguồn protein chất lượng cao.</p>',
                'topic_slug'       => 'kien-thuc-dinh-duong',
                'status'           => 'published',
                'type'             => 'blog',
                'is_featured'      => false,
                'view_count'       => 876,
                'meta_title'       => 'Protein là gì? Tầm quan trọng của protein | HDG Food',
                'meta_description' => 'Tìm hiểu về protein, vai trò thiết yếu của chất đạm với cơ thể và các nguồn thực phẩm giàu protein lành mạnh.',
                'published_at'     => now()->subDays(10),
            ],
            [
                'title'            => 'Chế độ ăn uống lành mạnh cho người bận rộn',
                'slug'             => 'che-do-an-uong-lanh-manh-cho-nguoi-ban-ron',
                'content'          => '<h2>Thách thức của cuộc sống hiện đại</h2>
<p>Với nhịp sống bận rộn, nhiều người bỏ bữa hoặc ăn vội các thức ăn nhanh không tốt cho sức khỏe. Nhưng ăn lành mạnh không nhất thiết phải tốn nhiều thời gian.</p>
<h2>Bí quyết ăn uống lành mạnh</h2>
<ul>
  <li>Meal prep cuối tuần – chuẩn bị đồ ăn cho cả tuần</li>
  <li>Luôn có rau củ đã sơ chế sẵn trong tủ lạnh</li>
  <li>Chọn đồ ăn nhẹ lành mạnh như hạt, trái cây</li>
  <li>Uống đủ 2 lít nước mỗi ngày</li>
</ul>',
                'topic_slug'       => 'kien-thuc-dinh-duong',
                'status'           => 'draft',
                'type'             => 'blog',
                'is_featured'      => false,
                'view_count'       => 0,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => null,
            ],

            /* ── Chủ đề: Tin khuyến mãi ── */
            [
                'title'            => 'Flash Sale Cuối Tuần – Giảm 30% Tất Cả Combo',
                'slug'             => 'flash-sale-cuoi-tuan-giam-30-combo',
                'content'          => '<h2>🔥 Flash Sale Chỉ Diễn Ra 48 Giờ!</h2>
<p>HDG Food mang đến cơn lốc ưu đãi cuối tuần với mức giảm giá lên đến <strong>30%</strong> cho tất cả các combo ăn uống.</p>
<h2>Các combo được giảm giá</h2>
<ul>
  <li>Combo Gia Đình (4 người) – Giảm từ 450k còn 315k</li>
  <li>Combo Văn Phòng (2 người) – Giảm từ 220k còn 154k</li>
  <li>Combo Học Sinh (1 người) – Giảm từ 95k còn 66k</li>
</ul>
<h2>Thời gian áp dụng</h2>
<p>Từ 00:00 thứ 7 đến 23:59 chủ nhật hàng tuần. Số lượng có hạn, đặt hàng ngay!</p>',
                'topic_slug'       => 'tin-khuyen-mai',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => true,
                'view_count'       => 2567,
                'meta_title'       => 'Flash Sale Cuối Tuần – Giảm 30% Combo | HDG Food',
                'meta_description' => 'Không bỏ lỡ Flash Sale cuối tuần của HDG Food – Giảm ngay 30% tất cả combo. Chỉ 48 giờ, số lượng có hạn!',
                'published_at'     => now()->subDays(2),
            ],
            [
                'title'            => 'Chương trình tích điểm HDG – Đổi điểm lấy quà tặng hấp dẫn',
                'slug'             => 'chuong-trinh-tich-diem-doi-qua',
                'content'          => '<h2>Tích điểm mỗi ngày – Nhận quà mỗi tuần</h2>
<p>Với mỗi đơn hàng tại HDG Food, bạn sẽ tích lũy điểm thưởng. Điểm này có thể đổi lấy các phần quà hấp dẫn.</p>
<h2>Cách tính điểm</h2>
<ul>
  <li>Mỗi 10.000đ chi tiêu = 1 điểm thưởng</li>
  <li>Double điểm vào thứ 4 hàng tuần</li>
  <li>Triple điểm cho đơn hàng đầu tiên</li>
</ul>
<h2>Đổi điểm lấy gì?</h2>
<p>100 điểm đổi 1 phần ăn miễn phí, 50 điểm đổi 1 ly nước ngọt, 200 điểm đổi combo cao cấp.</p>',
                'topic_slug'       => 'tin-khuyen-mai',
                'status'           => 'published',
                'type'             => 'news',
                'is_featured'      => false,
                'view_count'       => 1102,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => now()->subDays(7),
            ],

            /* ── Chủ đề: Giới thiệu món ăn ── */
            [
                'title'            => 'Cơm Tấm Sườn Bì Chả – Hương Vị Nam Bộ Đậm Đà',
                'slug'             => 'com-tam-suon-bi-cha-huong-vi-nam-bo',
                'content'          => '<h2>Nguồn gốc của Cơm Tấm</h2>
<p>Cơm tấm là món ăn đặc trưng của người miền Nam, xuất phát từ những hạt gạo tấm vỡ trước đây bị coi là phế phẩm nhưng lại có hương vị thơm ngon đặc biệt.</p>
<h2>Bộ ba hoàn hảo: Sườn – Bì – Chả</h2>
<ul>
  <li><strong>Sườn nướng</strong> – ướp đậm đà, nướng than hồng thơm lừng</li>
  <li><strong>Bì heo</strong> – mềm mại, quyện cùng thính gạo rang giòn</li>
  <li><strong>Chả trứng</strong> – béo ngậy, thơm mùi nước mắm</li>
</ul>
<h2>Tại HDG Food</h2>
<p>Chúng tôi giữ nguyên công thức truyền thống, sườn được ướp qua đêm và nướng theo đặt hàng để đảm bảo độ tươi ngon nhất.</p>',
                'topic_slug'       => 'gioi-thieu-mon-an',
                'status'           => 'published',
                'type'             => 'blog',
                'is_featured'      => true,
                'view_count'       => 3401,
                'meta_title'       => 'Cơm Tấm Sườn Bì Chả Đặc Biệt | HDG Food',
                'meta_description' => 'Khám phá hương vị cơm tấm sườn bì chả truyền thống Nam Bộ tại HDG Food – được chế biến theo công thức gia truyền đậm đà, thơm ngon.',
                'published_at'     => now()->subDays(3),
            ],
            [
                'title'            => 'Bún Bò Huế – Cay Nồng Đậm Đà Miền Trung',
                'slug'             => 'bun-bo-hue-cay-nong-dam-da',
                'content'          => '<h2>Bún Bò Huế – Niềm tự hào ẩm thực cố đô</h2>
<p>Bún bò Huế nổi tiếng với nước dùng đậm đà từ xương bò hầm nhiều giờ cùng các gia vị đặc trưng như sả, hả liệu và mắm ruốc Huế.</p>
<h2>Điều gì làm nên sự đặc biệt?</h2>
<ul>
  <li>Nước dùng hầm xương 6-8 tiếng</li>
  <li>Mắm ruốc Huế chính hiệu</li>
  <li>Chả cua, giò heo thái lát</li>
  <li>Rau sống và bắp chuối bào kèm</li>
</ul>
<p>Thưởng thức tô bún bò Huế cay nồng vào buổi sáng sẽ khởi đầu ngày mới thật tuyệt vời!</p>',
                'topic_slug'       => 'gioi-thieu-mon-an',
                'status'           => 'published',
                'type'             => 'blog',
                'is_featured'      => false,
                'view_count'       => 1876,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => now()->subDays(8),
            ],
            [
                'title'            => 'Phở Bò Hà Nội – Tinh Hoa Ẩm Thực Đất Kinh Kỳ',
                'slug'             => 'pho-bo-ha-noi-tinh-hoa-am-thuc',
                'content'          => '<h2>Phở – Linh hồn ẩm thực Việt</h2>
<p>Phở bò Hà Nội không chỉ là một món ăn – đó là biểu tượng văn hóa, là ký ức của hàng triệu người con đất Việt.</p>
<h2>Bí quyết nước dùng trong vắt</h2>
<ul>
  <li>Xương bò trụng sơ loại bỏ tạp chất</li>
  <li>Hầm với hành và gừng nướng thơm</li>
  <li>Hoa hồi, quế, thảo quả tạo hương đặc trưng</li>
  <li>Hớt bọt liên tục để nước trong</li>
</ul>',
                'topic_slug'       => 'gioi-thieu-mon-an',
                'status'           => 'published',
                'type'             => 'blog',
                'is_featured'      => false,
                'view_count'       => 2103,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => now()->subDays(15),
            ],

            /* ── Chủ đề: Công thức nấu ăn ── */
            [
                'title'            => 'Công thức Gà Nướng Mật Ong – Đơn Giản Mà Ngon Bất Ngờ',
                'slug'             => 'cong-thuc-ga-nuong-mat-ong-don-gian',
                'content'          => '<h2>Nguyên liệu cần chuẩn bị</h2>
<ul>
  <li>1 con gà ta (khoảng 1.2kg)</li>
  <li>3 thìa mật ong nguyên chất</li>
  <li>2 thìa nước tương</li>
  <li>1 thìa dầu hào</li>
  <li>Tỏi, gừng, sả băm nhuyễn</li>
</ul>
<h2>Các bước thực hiện</h2>
<ol>
  <li>Ướp gà với hỗn hợp gia vị ít nhất 2 tiếng (tốt nhất qua đêm)</li>
  <li>Làm nóng lò ở 200°C</li>
  <li>Nướng 25 phút, lật mặt và phết thêm mật ong</li>
  <li>Nướng tiếp 15 phút cho đến khi vàng đều</li>
</ol>
<p><em>Mẹo: Để gà không khô, đặt một bát nước vào lò khi nướng.</em></p>',
                'topic_slug'       => 'cong-thuc-nau-an',
                'status'           => 'published',
                'type'             => 'guide',
                'is_featured'      => true,
                'view_count'       => 4521,
                'meta_title'       => 'Công Thức Gà Nướng Mật Ong Thơm Ngon | HDG Food',
                'meta_description' => 'Học ngay cách làm gà nướng mật ong vàng óng, thơm lừng với công thức đơn giản dễ thực hiện từ HDG Food.',
                'published_at'     => now()->subDays(1),
            ],
            [
                'title'            => 'Salad Trái Cây Nhiệt Đới – Thanh Mát Cho Mùa Hè',
                'slug'             => 'salad-trai-cay-nhiet-doi-thanh-mat',
                'content'          => '<h2>Nguyên liệu</h2>
<ul>
  <li>Xoài chín 1 quả</li>
  <li>Thanh long đỏ 1 quả</li>
  <li>Dưa hấu 300g</li>
  <li>Dừa tươi nạo sợi</li>
  <li>Sốt: nước cốt chanh + mật ong + mint</li>
</ul>
<h2>Cách làm</h2>
<ol>
  <li>Cắt trái cây thành miếng vừa ăn</li>
  <li>Làm sốt bằng cách trộn nước chanh, mật ong, lá mint</li>
  <li>Trộn đều trái cây với sốt</li>
  <li>Để lạnh 30 phút trước khi dùng</li>
</ol>',
                'topic_slug'       => 'cong-thuc-nau-an',
                'status'           => 'published',
                'type'             => 'guide',
                'is_featured'      => false,
                'view_count'       => 987,
                'meta_title'       => null,
                'meta_description' => null,
                'published_at'     => now()->subDays(6),
            ],
        ];

        $count = 0;
        foreach ($posts as $postData) {
            $topicSlug = $postData['topic_slug'];
            unset($postData['topic_slug']);

            $postData['topic_id'] = $topicMap[$topicSlug] ?? null;
            $postData['user_id']  = $adminId;

            Post::firstOrCreate(
                ['slug' => $postData['slug']],
                $postData
            );
            $count++;
        }

        $this->command->info('✅ Đã seed ' . $count . ' bài viết.');
    }
}
