<?php

namespace App\Http\Controllers;

use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    private const DEFAULT_CATEGORY_ID = 1;

    public function index(Request $request)
    {
        $query = Category::withCount('products')
            ->with('parent:id,name')
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->status === 'active', fn($q) => $q->where('is_active', true))
            ->when($request->status === 'hidden', fn($q) => $q->where('is_active', false))
            ->when($request->position, fn($q) => $q->where('position', $request->position))
            ->when($request->has_promotion, function($q) {
                $q->whereHas('products', function($pq) {
                    $pq->where('is_active', true)
                       ->where(function($qq) {
                           $qq->whereNotNull('sale_price')->where('sale_price', '>', 0)
                              ->orWhereHas('activePromotion');
                       });
                });
            })
            ->orderBy('position')
            ->orderBy('name');

        if ($request->has('per_page')) {
            return CategoryResource::collection($query->paginate($request->per_page ?? 20));
        }

        return CategoryResource::collection($query->get());
    }

    public function show(Category $category)
    {
        $category->loadCount('products')->load(['parent:id,name', 'products' => fn($q) => $q->with('category:id,name')->limit(50)]);
        return new CategoryResource($category);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255|unique:categories',
            'parent_id'   => 'nullable|exists:categories,id',
            'description' => 'nullable|string',
            'image'       => 'nullable|string',
            'is_active'   => 'sometimes|boolean',
            'position'    => 'sometimes|integer|min:0',
        ]);

        $data['slug']      = Str::slug($data['name']);
        $data['is_active'] = $data['is_active'] ?? true;
        $category = Category::create($data);

        return new CategoryResource($category->loadCount('products')->load('parent:id,name'));
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'parent_id'   => 'nullable|exists:categories,id',
            'description' => 'nullable|string',
            'image'       => 'nullable|string',
            'is_active'   => 'sometimes|boolean',
            'position'    => 'sometimes|integer|min:0',
        ]);

        // Không cho chọn chính nó làm cha
        if (isset($data['parent_id']) && $data['parent_id'] == $category->id) {
            return response()->json(['message' => 'Không thể chọn chính danh mục này làm cha.'], 422);
        }

        // Không tạo vòng lặp: parent không được là con của category này
        if (isset($data['parent_id']) && $data['parent_id']) {
            $ancestor = Category::find($data['parent_id']);
            while ($ancestor) {
                if ($ancestor->parent_id == $category->id) {
                    return response()->json(['message' => 'Không thể tạo vòng lặp danh mục.'], 422);
                }
                $ancestor = $ancestor->parent_id ? Category::find($ancestor->parent_id) : null;
            }
        }

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category->update($data);

        return new CategoryResource($category->loadCount('products')->load('parent:id,name'));
    }

    public function destroy(Request $request, Category $category)
    {
        if ((int) $category->id === self::DEFAULT_CATEGORY_ID) {
            return response()->json(['message' => 'Không thể xóa danh mục mặc định.'], 422);
        }

        // Nếu còn sản phẩm
        if ($category->products()->count() > 0) {
            if ($request->move_to) {
                if ((int) $request->move_to === (int) $category->id) {
                    return response()->json(['message' => 'Danh mục chuyển đến không hợp lệ.'], 422);
                }
                if (!Category::whereKey($request->move_to)->exists()) {
                    return response()->json(['message' => 'Danh mục chuyển đến không tồn tại.'], 422);
                }
                // Chuyển sản phẩm sang danh mục khác
                $category->products()->update(['category_id' => $request->move_to]);
            } else {
                return response()->json([
                    'message'        => 'Danh mục còn sản phẩm.',
                    'products_count' => $category->products()->count(),
                    'requires_action' => true,
                ], 422);
            }
        }

        // Chuyển danh mục con lên cha
        $category->children()->update(['parent_id' => $category->parent_id]);
        $category->delete();

        return response()->json(['message' => 'Đã xóa danh mục.']);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'integer|exists:categories,id']);
        $ids = collect($request->ids)->map(fn($id) => (int) $id)->values();
        if ($ids->contains(self::DEFAULT_CATEGORY_ID)) {
            return response()->json(['message' => 'Không thể xóa danh mục mặc định trong thao tác hàng loạt.'], 422);
        }

        $hasProducts = Category::whereIn('id', $ids)->whereHas('products')->exists();
        if ($hasProducts) {
            return response()->json([
                'message' => 'Có danh mục vẫn đang chứa sản phẩm. Vui lòng chuyển danh mục trước khi xóa.',
            ], 422);
        }

        $deleted = Category::whereIn('id', $ids)->delete();
        return response()->json(['message' => "Đã xóa {$deleted} danh mục."]);
    }

    public function toggle(Category $category)
    {
        $category->update(['is_active' => !$category->is_active]);
        return new CategoryResource($category->loadCount('products'));
    }

    public function reorder(Request $request)
    {
        $request->validate([
            'orders'           => 'required|array',
            'orders.*.id'      => 'required|integer|exists:categories,id',
            'orders.*.position' => 'required|integer|min:0',
        ]);

        foreach ($request->orders as $item) {
            Category::where('id', $item['id'])->update(['position' => $item['position']]);
        }

        return response()->json(['message' => 'Đã cập nhật thứ tự.']);
    }

    public function checkSlug(Request $request)
    {
        $slug    = $request->query('slug', '');
        $exclude = $request->query('exclude'); // id để bỏ qua khi edit

        $query = Category::where('slug', $slug);
        if ($exclude) $query->where('id', '!=', $exclude);

        if ($query->exists()) {
            return response()->json(['available' => false, 'message' => 'Slug đã tồn tại.'], 409);
        }

        return response()->json(['available' => true, 'message' => 'Slug có thể dùng.']);
    }
}
