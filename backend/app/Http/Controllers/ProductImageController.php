<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductImageController extends Controller
{
    public function index(Product $product)
    {
        $images = $product->images()->get();
        return response()->json(['data' => $images]);
    }

    public function store(Request $request, Product $product)
    {
        $data = $request->validate([
            'images' => 'required|array|min:1|max:20',
            'images.*.url' => 'required|string|max:1000',
            'images.*.path' => 'nullable|string|max:1000',
            'images.*.alt_text' => 'nullable|string|max:255',
            'images.*.is_primary' => 'nullable|boolean',
            'images.*.status' => 'nullable|in:active,archived',
        ]);

        return DB::transaction(function () use ($product, $data) {
            $maxSort = (int) ($product->images()->max('sort_order') ?? -1);
            $primaryIncoming = collect($data['images'])->firstWhere('is_primary', true);

            if ($primaryIncoming) {
                $product->images()->update(['is_primary' => false]);
            }

            $created = [];
            foreach ($data['images'] as $index => $imageData) {
                $created[] = $product->images()->create([
                    'url' => $imageData['url'],
                    'path' => $imageData['path'] ?? null,
                    'alt_text' => $imageData['alt_text'] ?? null,
                    'is_primary' => (bool) ($imageData['is_primary'] ?? false),
                    'status' => $imageData['status'] ?? 'active',
                    'sort_order' => $maxSort + $index + 1,
                ]);
            }

            return response()->json(['data' => $created], 201);
        });
    }

    public function update(Request $request, Product $product, ProductImage $image)
    {
        if ($image->product_id !== $product->id) {
            abort(404);
        }

        $data = $request->validate([
            'alt_text' => 'nullable|string|max:255',
            'is_primary' => 'nullable|boolean',
            'status' => 'nullable|in:active,archived',
            'sort_order' => 'nullable|integer|min:0|max:255',
        ]);

        return DB::transaction(function () use ($product, $image, $data) {
            if (array_key_exists('is_primary', $data) && $data['is_primary']) {
                $product->images()->update(['is_primary' => false]);
            }

            $image->update($data);
            return response()->json(['data' => $image->fresh()]);
        });
    }

    public function reorder(Request $request, Product $product)
    {
        $data = $request->validate([
            'orders' => 'required|array|min:1',
            'orders.*.id' => 'required|integer|exists:product_images,id',
            'orders.*.sort_order' => 'required|integer|min:0|max:255',
        ]);

        return DB::transaction(function () use ($product, $data) {
            foreach ($data['orders'] as $item) {
                ProductImage::where('id', $item['id'])
                    ->where('product_id', $product->id)
                    ->update(['sort_order' => $item['sort_order']]);
            }

            $images = $product->images()->get();
            return response()->json(['data' => $images]);
        });
    }

    public function destroy(Request $request, Product $product, ProductImage $image)
    {
        if ($image->product_id !== $product->id) {
            abort(404);
        }

        $mode = $request->input('mode', 'archive');
        if (!in_array($mode, ['archive', 'delete'], true)) {
            return response()->json(['message' => 'mode không hợp lệ.'], 422);
        }

        $wasPrimary = (bool) $image->is_primary;

        if ($mode === 'delete') {
            $image->delete();
        } else {
            $image->update(['status' => 'archived', 'is_primary' => false]);
        }

        if ($wasPrimary) {
            $next = $product->images()->where('id', '!=', $image->id)->orderBy('sort_order')->first();
            if ($next) {
                $next->update(['is_primary' => true]);
            }
        }

        return response()->json(['message' => 'Thao tác thành công.']);
    }
}
