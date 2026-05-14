<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Review;
use App\Models\Product;
use App\Models\User;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        $products = Product::limit(10)->get();
        $users = User::where('role', 'user')->limit(5)->get();

        if ($products->isEmpty() || $users->isEmpty()) {
            $this->command->warn('⚠️ Cần có products và users trước khi seed reviews');
            return;
        }

        $comments = [
            'Món ăn rất ngon, sẽ quay lại!',
            'Chất lượng tuyệt vời, giá cả hợp lý',
            'Giao hàng nhanh, đóng gói cẩn thận',
            'Vị rất đậm đà, đúng khẩu vị',
            'Phục vụ tận tình, món ăn ngon',
            'Sẽ giới thiệu cho bạn bè',
            'Đồ ăn tươi ngon, sạch sẽ',
            'Rất hài lòng với chất lượng',
            'Giá hơi cao nhưng xứng đáng',
            'Món ăn ngon, nhưng hơi lâu',
        ];

        $count = 0;
        foreach ($products as $product) {
            // Mỗi sản phẩm có 2-4 reviews
            $numReviews = rand(2, 4);
            for ($i = 0; $i < $numReviews; $i++) {
            Review::updateOrCreate(
                ['product_id' => $product->id, 'user_id' => $users->random()->id],
                [
                    'rating'      => rand(3, 5),
                    'content'     => $comments[array_rand($comments)],
                    'is_approved' => true,
                ]
            );
                $count++;
            }
        }

        $this->command->info("✅ Đã seed {$count} reviews");
    }
}
