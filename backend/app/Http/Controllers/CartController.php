<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;

class CartController extends Controller
{
    /**
     * Đồng bộ giỏ hàng từ LocalStorage
     * Kiểm tra giá hiện tại, trạng thái tồn kho và các trường hợp thay đổi.
     * Cực kỳ quan trọng với Local-First (Tránh khách mua giá rẻ lưu cache).
     */
    public function sync(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.productId' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.options' => 'nullable|array',
        ]);

        $localItems = $request->input('items', []);
        $validatedCart = [];
        $errors = [];
        $total = 0;

        foreach ($localItems as $item) {
            $product = Product::with('activePromotion')->find($item['productId']);

            if (!$product) {
                $errors[] = "Sản phẩm {$item['productId']} không còn tồn tại.";
                continue;
            }

            if (!$product->is_available || !$product->is_active) {
                $errors[] = "Món {$product->name} hiện đang ngừng bán.";
                continue;
            }

            if ($product->stock < $item['quantity']) {
                $errors[] = "Món {$product->name} chỉ còn {$product->stock} suất.";
                // Cập nhật quantity theo số lượng còn lại
                if ($product->stock > 0) {
                    $item['quantity'] = $product->stock;
                } else {
                    continue; // Hết hàng thì bỏ qua
                }
            }

            // Tính giá thực tế hiện tại
            $currentFinalPrice = $product->final_price;
            $lineTotal = round($currentFinalPrice * $item['quantity']);
            $total += $lineTotal;

            $validatedCart[] = [
                'id' => $item['id'] ?? $product->id, 
                'productId' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'image' => $product->image,
                'price' => $currentFinalPrice,
                'original_price' => $product->price,
                'quantity' => $item['quantity'],
                'options' => $item['options'] ?? null,
                'line_total' => $lineTotal,
                'is_price_changed' => (isset($item['price']) && $item['price'] != $currentFinalPrice)
            ];
        }

        return response()->json([
            'message' => 'Đồng bộ thành công.',
            'valid_items' => $validatedCart,
            'total' => $total,
            'alerts' => $errors
        ]);
    }

    /**
     * API Add to Cart trực tiếp lên server
     * (Chỉ dùng nếu đi theo hướng Database-First).
     */
    public function add(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'options' => 'nullable|array'
        ]);

        $product = Product::find($request->product_id);

        if ($product->stock < $request->quantity) {
            return response()->json(['message' => 'Số lượng vượt quá tồn kho. Còn lại: ' . $product->stock], 400);
        }

        // Logic lưu vào DB nếu có bảng Carts và CartItems
        // Vì project hiện tại yêu cầu build cơ chế Local-First cực mượt
        // Nên ta ưu tiên phản hồi OK để Client lưu LocalStorage
        return response()->json([
            'message' => 'Trạng thái món được xác nhận.',
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'stock' => $product->stock,
                'price' => $product->final_price,
            ]
        ], 200);
    }
}
