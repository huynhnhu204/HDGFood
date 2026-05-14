<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductOption;
use App\Models\ProductOptionValue;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategoryProductSeeder extends Seeder
{
    private const CATEGORIES = [
        // name, slug, description, image
        ['Khai vị',     'khai-vi',     'Các món khai vị hấp dẫn, kích thích vị giác trước bữa ăn chính.', 'https://images.unsplash.com/photo-1541014741259-de529411b96a?w=400&h=300&fit=crop'],
        ['Món chính',  'mon-chinh',   'Các món ăn chính đa dạng từ Á đến Âu, phù hợp mọi khẩu vị.',     'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'],
        ['Nước uống',  'nuoc-uong',   'Đồ uống giải khát, trà sữa, nước ép, sinh tố...',               'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop'],
        ['Tráng miệng','trang-mieng', 'Các món tráng miệng ngọt ngào, dessert và kem.',                   'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop'],
        ['Đặc biệt',   'dac-biet',   'Những món đặc biệt chỉ có tại HDG Food, giới hạn theo ngày.',     'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop'],
        ['Combo & Set', 'combo-set', 'Set ăn theo nhóm, combo tiết kiệm cho gia đình và văn phòng.',   'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop'],
    ];

    private const PRODUCTS = [
        // [category_slug, name, price, cost_price, description, image, is_featured, stock]
        // ── Khai vị ──────────────────────────────────────────────────────────────
        ['khai-vi', 'Gỏi cuốn tôm thịt',    45000, 28000, 'Gỏi cuốn tươi giòn với tôm, thịt heo, bún và rau thơm. Chấm nước mắm chua ngọt.',
            'https://images.unsplash.com/photo-1562061209-06c4a5e84edf?w=400&h=300&fit=crop', 0, 80],
        ['khai-vi', 'Chả giò chiên giòn',   55000, 33000, 'Chả giò giòn rụm nhân thịt heo và nấm mèo. Ăn kèm rau sống và nước chấm.',
            'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', 1, 60],
        ['khai-vi', 'Súp cua bắp',           65000, 38000, 'Súp cua béo ngậy với bắp ngọt, nấm và trứng gà.',
            'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', 0, 40],
        ['khai-vi', 'Bánh tráng trộn',       35000, 18000, 'Bánh tráng giòn trộn với khô bò, trứng cút, xoài chua và rau thơm.',
            'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop', 0, 100],
        ['khai-vi', 'Nem chua rán',           40000, 22000, 'Nem chua dai ngon chiên giòn, ăn với rau sống và tương ớt.',
            'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop', 0, 70],

        // ── Món chính ───────────────────────────────────────────────────────────
        ['mon-chinh', 'Bò kho bánh mì',     120000, 72000, 'Bò kho mềm tan, nước dùng đậm đà, ăn với bánh mì nóng giòn.',
            'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&h=300&fit=crop', 1, 40],
        ['mon-chinh', 'Cơm tấm sườn bì chả', 85000, 52000, 'Cơm tấm với sườn nướng, bì chả, trứng chiên và dưa chua.',
            'https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?w=400&h=300&fit=crop', 1, 50],
        ['mon-chinh', 'Phở bò tái nạm',       95000, 58000, 'Tô phở bò nóng hổi với nước dùng hầm xương 8 tiếng, bánh phở mềm dai.',
            'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&h=300&fit=crop', 1, 45],
        ['mon-chinh', 'Bún bò Huế đặc biệt', 90000, 55000, 'Bún bò cay cay với giò heo, sườn, chả cua và rau muống chẻ.',
            'https://images.unsplash.com/photo-1576577445504-6af96477db52?w=400&h=300&fit=crop', 0, 35],
        ['mon-chinh', 'Lẩu Thái hải sản',    350000, 210000, 'Lẩu Thái chua cay với tôm, mực, cá viên, nấm và rau ăn kèm.',
            'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop', 1, 20],
        ['mon-chinh', 'Gà nướng mật ong',    180000, 108000, 'Gà nướng giòn da, lớp mật ong vàng óng, thơm lừng. Ăn kèm khoai tây chiên.',
            'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop', 0, 30],
        ['mon-chinh', 'Bún chả Hà Nội',        75000, 45000, 'Bún chả truyền thống với thịt nướng thơm phức, chả lá lốt và nước mắm pha.',
            'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400&h=300&fit=crop', 0, 55],
        ['mon-chinh', 'Cá hồi áp chảo',       220000, 135000, 'Cá hồi Na Uy áp chảo giòn da, mềm thịt, ăn kèm rau củ hấp và sốt bơ tỏi.',
            'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=300&fit=crop', 0, 25],

        // ── Nước uống ────────────────────────────────────────────────────────────
        ['nuoc-uong', 'Trà sữa trân châu đường đen', 35000, 15000,
            'Trà sữa béo ngậy với trân châu đường đen giòn tan. Đủ size S/M/L.',
            'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400&h=300&fit=crop', 1, 200],
        ['nuoc-uong', 'Trà đào cam sả',        40000, 18000, 'Trà đào thơm mát với cam vàng và sả, giải khát cực đã.',
            'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', 0, 150],
        ['nuoc-uong', 'Cà phê sữa đá',         25000, 12000, 'Cà phê Việt rang mộc pha sữa đặc, thêm đá tổ ong.',
            'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop', 0, 180],
        ['nuoc-uong', 'Sinh tố bơ',            45000, 22000, 'Sinh tố bơ béo ngậy, mịn lướt, thêm sữa đặc và đá xay.',
            'https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?w=400&h=300&fit=crop', 0, 80],
        ['nuoc-uong', 'Nước ép cam ép ổi',     35000, 16000, 'Nước ép cam ổi tươi, giữ nguyên vitamin C, không đường hóa học.',
            'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=300&fit=crop', 0, 100],
        ['nuoc-uong', 'Sữa tươi trà xanh',      38000, 17000, 'Matcha Latte với sữa tươi nguyên chất và kem cheese.',
            'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&h=300&fit=crop', 0, 120],

        // ── Tráng miệng ─────────────────────────────────────────────────────────
        ['trang-mieng', 'Chè khúc bạch',       55000, 28000, 'Chè khúc bạch mát lạnh với nước cốt dừa, hạt sen và long nhãn.',
            'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop', 0, 60],
        ['trang-mieng', 'Bánh flan caramel',    35000, 16000, 'Bánh flan mềm mịn, caramel đắng ngọt tan ngay trong miệng.',
            'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop', 1, 90],
        ['trang-mieng', 'Kem dừa tươi',        45000, 22000, 'Kem dừa làm từ nước cốt dừa tươi, thêm dừa nạo và đường phèn.',
            'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop', 0, 50],
        ['trang-mieng', 'Chè thái đặc biệt',   50000, 25000, 'Ly chè thái đủ topping: thạch, đu đủ, nhãn, dừa, sương sáo.',
            'https://images.unsplash.com/photo-1571006682359-07895345efc4?w=400&h=300&fit=crop', 0, 70],
        ['trang-mieng', 'Bánh chuối nướng',     40000, 20000, 'Bánh chuối nướng giòn bên ngoài, mềm bơi bên trong, thơm mùi chuối.',
            'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&h=300&fit=crop', 0, 40],

        // ── Đặc biệt ────────────────────────────────────────────────────────────
        ['dac-biet', 'Tôm hùm nướng phô mai',  550000, 330000, 'Tôm hùm tươi nướng bơ tỏi, phủ lớp phô mai mozzarella tan chảy.',
            'https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?w=400&h=300&fit=crop', 1, 10],
        ['dac-biet', 'Set lẩu 4 người',        800000, 480000, 'Set lẩu đầy đủ cho 4 người: lẩu Thái, hải sản, rau và nước dùng.',
            'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop', 0, 15],
        ['dac-biet', 'Bò wagyu A5 Nhật Bản',  1200000, 720000, 'Thịt bò Wagyu A5 nhập khẩu Nhật Bản, nướng BBQ cao cấp. Phần 200g.',
            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop', 0, 5],

        // ── Combo & Set ─────────────────────────────────────────────────────────
        ['combo-set', 'Combo văn phòng 2 người', 189000, 110000, '2 phần cơm, 2 món mặn, canh và trà — phù hợp ăn trưa nhanh.',
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop', 1, 40],
        ['combo-set', 'Set gia đình 4 người',    599000, 360000, '4 món mặn, 1 lẩu nhỏ, cơm trắng và salad — đủ cho cả nhà.',
            'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop', 1, 25],
    ];

    public function run(): void
    {
        $categoryIds = [];

        foreach (self::CATEGORIES as $cat) {
            $category = Category::updateOrCreate(
                ['slug' => $cat[1]],
                [
                    'name'        => $cat[0],
                    'slug'        => $cat[1],
                    'description' => $cat[2],
                    'image'       => $cat[3],
                    'is_active'   => true,
                    'position'    => array_search($cat[1], array_column(self::CATEGORIES, 1)),
                ]
            );
            $categoryIds[$cat[1]] = $category->id;
        }

        foreach (self::PRODUCTS as $p) {
            [$catSlug, $name, $price, $costPrice, $desc, $image, $featured, $stock] = $p;

            $product = Product::updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name'            => $name,
                    'slug'            => Str::slug($name),
                    'category_id'      => $categoryIds[$catSlug] ?? null,
                    'price'           => $price,
                    'cost_price'      => $costPrice,
                    'stock'           => $stock,
                    'description'     => $desc,
                    'image'           => $image,
                    'is_active'       => true,
                    'is_featured'     => (bool) $featured,
                    'sold_count'      => 0,
                    'calories'        => rand(50, 800),
                    'protein'         => rand(1, 50),
                    'carbs'           => rand(5, 100),
                    'fat'             => rand(0, 30),
                ]
            );

            // Nước uống: mỗi sản phẩm có size riêng
            if ($catSlug === 'nuoc-uong') {
                $sizeOpt = ProductOption::updateOrCreate(
                    ['product_id' => $product->id, 'name' => 'Size'],
                    ['name' => 'Size', 'is_required' => true]
                );
                foreach (['S' => 0, 'M' => 5000, 'L' => 10000] as $label => $extra) {
                    ProductOptionValue::updateOrCreate(
                        ['product_option_id' => $sizeOpt->id, 'label' => $label],
                        ['price_extra' => $extra]
                    );
                }

                $sugarOpt = ProductOption::updateOrCreate(
                    ['product_id' => $product->id, 'name' => 'Độ đường'],
                    ['name' => 'Độ đường', 'is_required' => false]
                );
                foreach (['100%', '70%', '50%', '30%', 'Không đường'] as $label) {
                    ProductOptionValue::updateOrCreate(
                        ['product_option_id' => $sugarOpt->id, 'label' => $label],
                        ['price_extra' => 0]
                    );
                }

                $iceOpt = ProductOption::updateOrCreate(
                    ['product_id' => $product->id, 'name' => 'Đá'],
                    ['name' => 'Đá', 'is_required' => false]
                );
                foreach (['Nhiều đá', 'Bình thường', 'Ít đá', 'Không đá'] as $label) {
                    ProductOptionValue::updateOrCreate(
                        ['product_option_id' => $iceOpt->id, 'label' => $label],
                        ['price_extra' => 0]
                    );
                }
            }
        }
    }
}
