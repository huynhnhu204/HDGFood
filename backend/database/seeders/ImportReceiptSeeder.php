<?php

namespace Database\Seeders;

use App\Models\ImportReceipt;
use App\Models\ImportReceiptItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class ImportReceiptSeeder extends Seeder
{
    private const SUPPLIERS = [
        'Công ty TNHH Thực Phẩm Tươi Sạch Miền Nam',
        'Hải Sản Biển Đông',
        'Thực Phẩm ABC Food',
        'Vựa Rau Sạch Xanh',
        'Thịt Trùm Gia Đình',
    ];

    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $products = Product::all();

        foreach ($products as $product) {
            $numReceipts = rand(1, 3);

            for ($i = 0; $i < $numReceipts; $i++) {
                $importPrice = $product->cost_price * (0.93 + mt_rand() / mt_getrandmax() * 0.07);
                $importPrice = max(1000, round($importPrice, -2));
                $quantity = rand(5, 30);
                $subtotal = $quantity * $importPrice;

                $receipt = ImportReceipt::create([
                    'code'         => 'IMP' . date('ymd') . '-' . uniqid(),
                    'user_id'      => $admin?->id ?? 1,
                    'supplier'     => self::SUPPLIERS[array_rand(self::SUPPLIERS)],
                    'total_amount' => $subtotal,
                    'note'         => 'Nhập hàng thường kỳ',
                    'imported_at'  => now()->subDays(rand(1, 60)),
                    'status'       => 'completed',
                ]);

                ImportReceiptItem::create([
                    'import_receipt_id' => $receipt->id,
                    'product_id'        => $product->id,
                    'quantity'         => $quantity,
                    'import_price'     => $importPrice,
                    'subtotal'        => $subtotal,
                ]);
            }
        }
    }
}
