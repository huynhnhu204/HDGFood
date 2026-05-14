<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $faker    = Faker::create('vi_VN');
        $users    = User::where('role', 'user')->get();
        $products = Product::where('stock', '>', 0)->get();

        if ($users->isEmpty() || $products->isEmpty()) {
            return;
        }

        $phonePrefixes = ['032','033','034','035','036','037','038','039',
                          '070','076','077','078','079','086','096','097','098'];

        // Số bàn thực tế của quán ăn
        $tables = ['Bàn 1','Bàn 2','Bàn 3','Bàn 4','Bàn 5','Bàn 6',
                   'Bàn 7','Bàn 8','Bàn VIP 1','Bàn VIP 2','Mang về','Đặt online'];

        // Ghi chú thực tế của khách
        $notes = [
            'Ít cay', 'Không hành', 'Thêm đá', 'Không đường',
            'Ít ngọt', 'Thêm topping trân châu', 'Không rau mùi',
            'Chín kỹ', 'Tái chín', null, null, null, // null = không có ghi chú
        ];

        // Trạng thái với trọng số thực tế cho quán ăn
        $statusWeights = [
            'pending'    => 2,
            'confirmed'  => 2,
            'preparing'  => 3,
            'ready'      => 2,
            'serving'    => 3,
            'completed'  => 10,
            'cancelled'  => 2,
        ];

        // Phương thức thanh toán theo trạng thái
        $paymentMethods = ['cash', 'card', 'momo', 'banking'];

        for ($i = 0; $i < 25; $i++) {
            $prefix    = $phonePrefixes[array_rand($phonePrefixes)];
            $phone     = $prefix . $faker->numerify('#######');
            $status    = $this->weightedRandom($statusWeights);
            $table     = $tables[array_rand($tables)];
            $note      = $notes[array_rand($notes)];
            
            // Tạo thời gian hợp lý: đơn cũ hơn có nhiều khả năng hoàn thành
            $daysAgo   = rand(0, 30);
            $createdAt = Carbon::now()->subDays($daysAgo)->subHours(rand(0, 23))->subMinutes(rand(0, 59));
            
            // Logic trạng thái hợp lý theo thời gian
            if ($daysAgo > 7) {
                // Đơn cũ hơn 7 ngày: chỉ completed hoặc cancelled
                $status = $faker->randomElement(['completed', 'completed', 'completed', 'cancelled']);
            } elseif ($daysAgo > 2) {
                // Đơn 2-7 ngày: chủ yếu completed
                $status = $faker->randomElement(['completed', 'completed', 'completed', 'cancelled']);
            } elseif ($daysAgo > 0) {
                // Đơn 1-2 ngày: đa dạng nhưng thiên về hoàn thành
                $status = $faker->randomElement(['completed', 'completed', 'serving', 'ready', 'cancelled']);
            } else {
                // Đơn hôm nay: đa dạng trạng thái
                $status = $this->weightedRandom($statusWeights);
            }

            // Chọn sản phẩm có stock
            $availableProducts = $products->where('stock', '>', 0);
            if ($availableProducts->isEmpty()) continue;
            
            $numProducts = rand(1, min(4, $availableProducts->count()));
            $selectedProducts = $availableProducts->random($numProducts);
            
            $subtotal = 0;
            $orderItems = [];

            foreach ($selectedProducts as $product) {
                $maxQty = min(5, $product->stock);
                if ($maxQty < 1) continue;

                $qty      = rand(1, $maxQty);
                $subtotal += $product->price * $qty;
                
                $orderItems[] = [
                    'product_id' => $product->id,
                    'quantity'   => $qty,
                    'price'      => $product->price,
                ];
            }

            if (empty($orderItems)) continue;

            // Tính discount hợp lý (0-20% cho một số đơn)
            $discountPercent = $faker->randomElement([0, 0, 0, 5, 10, 15, 20]);
            $discountAmount  = round($subtotal * $discountPercent / 100, 2);
            $finalTotal      = $subtotal - $discountAmount;

            // Payment status logic hợp lý
            $paymentStatus = match($status) {
                'completed' => 'paid',
                'cancelled' => $faker->randomElement(['unpaid', 'refunded']),
                'serving', 'ready' => $faker->randomElement(['paid', 'unpaid']),
                'preparing', 'confirmed' => $faker->randomElement(['paid', 'unpaid', 'unpaid']),
                'pending' => 'unpaid',
            };

            // Payment method chỉ có khi đã thanh toán
            $paymentMethod = ($paymentStatus === 'paid') 
                ? $paymentMethods[array_rand($paymentMethods)] 
                : null;

            $customer = $users->random();

            $order = Order::create([
                'user_id'                   => $customer->id,
                'customer_email_snapshot'    => $customer->email,
                'order_number'              => 'ORD' . date('ymd') . '-' . uniqid(),
                'delivery_name'             => $faker->name(),
                'delivery_phone'            => $phone,
                'notes'                     => $note,
                'total'           => $subtotal,
                'discount_amount' => $discountAmount,
                'final_total'     => $finalTotal,
                'status'          => $status,
                'payment_status'  => $paymentStatus,
                'payment_method'  => $paymentMethod,
                'shipping_address' => $table,
                'shipping_fee'    => 0,
                'created_at'      => $createdAt,
                'updated_at'      => $createdAt,
            ]);

            foreach ($orderItems as $item) {
                OrderItem::create([
                    'order_id'   => $order->id,
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                    'price'      => $item['price'],
                    'created_at' => $createdAt,
                    'updated_at' => $createdAt,
                ]);
            }
        }
    }

    private function weightedRandom(array $weights): string
    {
        $total = array_sum($weights);
        $rand  = rand(1, $total);
        $cum   = 0;
        foreach ($weights as $key => $w) {
            $cum += $w;
            if ($rand <= $cum) return $key;
        }
        return array_key_first($weights);
    }
}
