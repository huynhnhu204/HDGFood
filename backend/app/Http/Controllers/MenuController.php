<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use App\Models\MenuItem;
use App\Models\Category;
use App\Models\PostTopic;
use App\Models\Post;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\Builder;

class MenuController extends Controller
{
    // ----------------------------------------------------------------------
    // GET /api/menus  (public)
    // GET /api/admin/menus  (admin)
    // ----------------------------------------------------------------------

    public function index(Request $request)
    {
        $query = Menu::query();

        if ($request->filled('position')) {
            $query->where('position', $request->position);
        }

        $isPublicMenusEndpoint = $request->is('api/menus');

        if ($request->has('status')) {
            $this->applyMenuStatusFilter($query, $request->input('status'));
        } elseif ($isPublicMenusEndpoint) {
            // GET /api/menus: luôn chỉ trả menu đang bật (kể cả khi có Bearer token)
            $this->scopeActiveMenus($query);
        } elseif (! $request->bearerToken()) {
            $this->scopeActiveMenus($query);
        }

        if ($request->filled('q')) {
            $query->where('name', 'like', '%' . $request->q . '%');
        }

        $menus = $query->with([
            'parentItems' => function ($q) {
                $q->where('is_active', 1)->orderBy('sort_order');
            },
            'parentItems.children' => function ($q) {
                $q->where('is_active', 1)->orderBy('sort_order');
            },
        ])->orderBy('sort_order')->orderBy('id')->get();

        if ($isPublicMenusEndpoint) {
            foreach ($menus as $menu) {
                if (!$menu instanceof Menu) {
                    continue;
                }

                $visibleParents = $menu->parentItems
                    ->filter(fn($item) => $item instanceof MenuItem && $this->isVisibleReference($item))
                    ->values();

                foreach ($visibleParents as $parent) {
                    if (!$parent instanceof MenuItem) {
                        continue;
                    }
                    $children = $parent->children
                        ->filter(fn($child) => $child instanceof MenuItem && $this->isVisibleReference($child))
                        ->values();
                    $parent->setRelation('children', $children);
                }

                $menu->setRelation('parentItems', $visibleParents);
            }
        }

        return response()->json($menus);
    }

    /**
     * Menu đang hoạt động: cột status có thể là enum ('active') hoặc tinyint (1) tùy DB.
     */
    protected function scopeActiveMenus(Builder $query): void
    {
        $query->where(function ($q) {
            $q->where('status', 'active')
                ->orWhere('status', 1)
                ->orWhere('status', '1');
        });
    }

    protected function scopeInactiveMenus(Builder $query): void
    {
        $query->where(function ($q) {
            $q->where('status', 'inactive')
                ->orWhere('status', 0)
                ->orWhere('status', '0');
        });
    }

    protected function applyMenuStatusFilter(Builder $query, mixed $status): void
    {
        if ($status === null || $status === '') {
            return;
        }
        if (in_array($status, [1, '1', 'active', true], true) || $status === 'active') {
            $this->scopeActiveMenus($query);
        } elseif (in_array($status, [0, '0', 'inactive', false], true) || $status === 'inactive') {
            $this->scopeInactiveMenus($query);
        }
    }

    protected function isMenuActiveValue(mixed $status): bool
    {
        return in_array($status, [1, '1', 'active', true], true);
    }

    // ----------------------------------------------------------------------
    // GET /api/admin/menus/{id}
    // ----------------------------------------------------------------------

    public function show(int $id)
    {
        $menu      = Menu::with(['parentItems.children.children'])->findOrFail($id);
        $flatItems = MenuItem::where('menu_id', $id)->orderBy('sort_order')->get();

        return response()->json([
            'menu'  => $menu,
            'items' => $flatItems,
        ]);
    }

    // ----------------------------------------------------------------------
    // POST /api/admin/menus
    // Payload: { name, position, items[] }
    // ----------------------------------------------------------------------

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'position'              => 'required|in:header,footer,mobile,other',
            'sort_order'            => 'nullable|integer|min:0',
            'items'                 => 'nullable|array',
            'items.*.title'         => 'required|string|max:255',
            'items.*.type'          => 'required|in:custom,category,topic,page,post,group,product',
            'items.*.reference_id'  => 'nullable|integer',
            'items.*.url'           => 'nullable|string',
            'items.*.parent_id'     => 'nullable',
            'items.*.sort_order'    => 'required|integer',
            'items.*.temp_id'       => 'nullable',
            'items.*.is_active'     => 'sometimes|boolean',
            'items.*.created_at'    => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $menu = Menu::create([
                'name'       => $validated['name'],
                'position'   => $validated['position'],
                'sort_order' => $validated['sort_order'] ?? 0,
                'status'     => 'active',
            ]);

            if (!empty($validated['items'])) {
                $idMap = [];

                // Pass 1: create items
                foreach ($validated['items'] as $itemData) {
                    $this->assertReferenceIsValid($itemData['type'], $itemData['reference_id'] ?? null);

                    $url = $itemData['url'] ?? null;
                    if (!empty($itemData['reference_id']) && $itemData['type'] !== 'custom') {
                        $url = $this->generateUrl($itemData['type'], $itemData['reference_id']) ?? $url;
                    }

                    $item = MenuItem::create([
                        'menu_id'      => $menu->id,
                        'title'        => $itemData['title'],
                        'type'         => $itemData['type'],
                        'reference_id' => $itemData['reference_id'] ?? null,
                        'url'          => $url,
                        'sort_order'   => $itemData['sort_order'],
                        'is_active'    => $itemData['is_active'] ?? true,
                        'created_at'   => !empty($itemData['created_at']) ? Carbon::parse($itemData['created_at']) : now(),
                    ]);

                    if (!empty($itemData['temp_id'])) {
                        $idMap[$itemData['temp_id']] = $item->id;
                    }
                }

                // Pass 2: set parent_id
                foreach ($validated['items'] as $itemData) {
                    if (!empty($itemData['parent_id']) && !empty($itemData['temp_id'])) {
                        $realId       = $idMap[$itemData['temp_id']] ?? null;
                        $realParentId = $idMap[$itemData['parent_id']] ?? $itemData['parent_id'];

                        if ($realId && $realParentId) {
                            MenuItem::where('id', $realId)->update(['parent_id' => $realParentId]);
                        }
                    }
                }
            }

            DB::commit();
            return response()->json(['message' => 'Tạo menu thành công', 'menu' => $menu], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lưu thất bại: ' . $e->getMessage()], 500);
        }
    }

    // ----------------------------------------------------------------------
    // PUT /api/admin/menus/{id}
    // ----------------------------------------------------------------------

    public function update(Request $request, Menu $menu)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'position' => 'required|in:header,footer,mobile,other',
            'status'   => 'sometimes|in:0,1,active,inactive',
        ]);

        if (array_key_exists('status', $validated)) {
            $validated['status'] = $this->isMenuActiveValue($validated['status']) ? 'active' : 'inactive';
        }

        $menu->update($validated);
        return response()->json(['message' => 'Cập nhật menu thành công', 'menu' => $menu]);
    }

    // ----------------------------------------------------------------------
    // DELETE /api/admin/menus/{id}  — soft delete (status=0)
    // ----------------------------------------------------------------------

    public function destroy(Menu $menu)
    {
        $menu->update(['status' => 'inactive']);
        return response()->json(['message' => 'Đã đưa Menu vào thùng rác']);
    }

    // ----------------------------------------------------------------------
    // PATCH /api/admin/menus/{id}/restore
    // ----------------------------------------------------------------------

    public function restore(int $id)
    {
        $menu = Menu::findOrFail($id);
        $menu->update(['status' => 'active']);
        return response()->json(['message' => 'Đã khôi phục Menu thành công']);
    }

    // ----------------------------------------------------------------------
    // DELETE /api/admin/menus/{id}/purge  — xóa vĩnh viễn
    // ----------------------------------------------------------------------

    public function purge(int $id)
    {
        $menu = Menu::findOrFail($id);
        $menu->delete();
        return response()->json(['message' => 'Đã xóa vĩnh viễn Menu']);
    }

    // ----------------------------------------------------------------------
    // PATCH /api/admin/menus/{id}/toggle
    // ----------------------------------------------------------------------

    public function toggleStatus(Menu $menu)
    {
        $menu->update(['status' => $this->isMenuActiveValue($menu->status) ? 'inactive' : 'active']);
        return response()->json(['message' => 'Đã cập nhật trạng thái', 'status' => $menu->status]);
    }

    // ----------------------------------------------------------------------
    // GET /api/admin/menus/resources
    // Trả về categories, topics, products, posts để FE dùng khi tạo menu item
    // ----------------------------------------------------------------------

    public function getResources()
    {
        try {
            $categories = Category::select('id', 'name', 'slug')
                ->where('is_active', true)->get();

            $topics = PostTopic::select('id', 'name', 'slug')
                ->where('status', 'active')->get();

            $products = Product::select('id', 'name', 'slug')
                ->where('is_active', true)->orderBy('name')->get();

            $posts = Post::with(['topic:id,slug'])
                ->select('id', 'title', 'slug', 'topic_id')
                ->where('status', 'published')
                ->orderBy('title')
                ->get()
                ->map(function ($p) {
                    return [
                        'id'          => $p->id,
                        'title'       => $p->title,
                        'slug'        => $p->slug,
                        'topic_slug'  => $p->topic?->slug ?? 'uncategorized',
                    ];
                });

            return response()->json([
                'categories' => $categories,
                'topics'     => $topics,
                'pages'      => $posts,
                'products'   => $products,
                'posts'      => $posts,
            ]);
        } catch (\Exception $e) {
            Log::error('MenuController getResources error: ' . $e->getMessage());
            return response()->json([
                'categories' => [],
                'topics'     => [],
                'pages'      => [],
                'products'   => [],
                'posts'      => [],
            ]);
        }
    }

    // ----------------------------------------------------------------------
    // POST /api/admin/menus/store-whole
    // Tạo menu + toàn bộ items trong 1 request (giữ tương thích FE cũ)
    // ----------------------------------------------------------------------
    public function storeWholeMenu(Request $request)
    {
        return $this->store($request);
    }

    // ----------------------------------------------------------------------
    // POST /api/admin/menus/{menu}/sync  — đồng bộ items (dnd-kit)
    // ----------------------------------------------------------------------

    public function syncItems(Request $request, Menu $menu)
    {
        // `required` rejects [] — dùng `present` để cho phép xóa hết mục (items rỗng).
        $validated = $request->validate([
            'items'                => 'present|array',
            'items.*.id'           => 'nullable',
            'items.*.title'        => 'required|string|max:255',
            'items.*.type'         => 'required|in:custom,category,topic,page,post,group,product',
            'items.*.reference_id' => 'nullable|integer',
            'items.*.url'          => 'nullable|string',
            'items.*.parent_id'    => 'nullable',
            'items.*.sort_order'   => 'required|integer',
            'items.*.is_active'    => 'sometimes|boolean',
            'items.*.created_at'   => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $inputItems      = collect($validated['items']);
            $existingItemIds = $menu->items()->pluck('id')->toArray();

            $inputNumericIds = $inputItems->pluck('id')
                ->filter(fn($v) => is_numeric($v) && $v > 0)->toArray();

            MenuItem::whereIn('id', array_diff($existingItemIds, $inputNumericIds))->delete();

            $idMap = [];

            foreach ($inputItems as $itemData) {
                $this->assertReferenceIsValid($itemData['type'], $itemData['reference_id'] ?? null);

                $url = $itemData['url'] ?? null;
                if (!empty($itemData['reference_id']) && $itemData['type'] !== 'custom') {
                    $url = $this->generateUrl($itemData['type'], $itemData['reference_id']) ?? $url;
                }

                $dataToSave = [
                    'menu_id'      => $menu->id,
                    'title'        => $itemData['title'],
                    'type'         => $itemData['type'],
                    'reference_id' => $itemData['reference_id'] ?? null,
                    'url'          => $url,
                    'sort_order'   => $itemData['sort_order'],
                    'is_active'    => $itemData['is_active'] ?? true,
                    'created_at'   => !empty($itemData['created_at']) ? Carbon::parse($itemData['created_at']) : now(),
                ];

                if (!empty($itemData['id']) && is_numeric($itemData['id']) && $itemData['id'] > 0) {
                    $menuItem = MenuItem::find($itemData['id']);
                    if ($menuItem) {
                        $menuItem->update($dataToSave);
                        $idMap[$itemData['id']] = $menuItem->id;
                    }
                } else {
                    $menuItem = MenuItem::create($dataToSave);
                    if (!empty($itemData['id'])) {
                        $idMap[$itemData['id']] = $menuItem->id;
                    }
                }
            }

            // Set parent_id
            foreach ($inputItems as $itemData) {
                $realId = !empty($itemData['id']) ? ($idMap[$itemData['id']] ?? null) : null;
                if ($realId) {
                    $item         = MenuItem::find($realId);
                    $realParentId = !empty($itemData['parent_id'])
                        ? ($idMap[$itemData['parent_id']] ?? $itemData['parent_id'])
                        : null;
                    $item?->update(['parent_id' => $realParentId]);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Đã lưu cấu trúc Menu thành công']);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Lưu thất bại: ' . $e->getMessage()], 500);
        }
    }

    // ----------------------------------------------------------------------
    // Private: tự động sinh URL từ type + reference_id
    // ----------------------------------------------------------------------

    private function generateUrl(string $type, int $referenceId): ?string
    {
        switch ($type) {
            case 'product':
                $item = Product::find($referenceId);
                return $item ? '/products/' . $item->slug : null;

            case 'category':
                $item = Category::find($referenceId);
                return $item ? '/categories/' . $item->slug : null;

            case 'topic':
                $item = PostTopic::find($referenceId);
                return $item ? '/blog/' . $item->slug : null;

            case 'page':
            case 'post':
                $item = Post::with('topic:id,slug')->find($referenceId);
                if (! $item) {
                    return null;
                }
                $topicSlug = $item->topic?->slug ?? 'uncategorized';

                return '/blog/' . $topicSlug . '/' . $item->slug;
        }
        return null;
    }

    private function assertReferenceIsValid(string $type, ?int $referenceId): void
    {
        if (in_array($type, ['custom', 'group'], true)) {
            return;
        }

        if (!$referenceId) {
            throw ValidationException::withMessages([
                'reference_id' => ["Thiếu reference_id cho menu item kiểu '{$type}'."],
            ]);
        }

        $exists = match ($type) {
            'product' => Product::whereKey($referenceId)->exists(),
            'category' => Category::whereKey($referenceId)->exists(),
            'topic' => PostTopic::whereKey($referenceId)->exists(),
            'page', 'post' => Post::whereKey($referenceId)->exists(),
            default => false,
        };

        if (!$exists) {
            throw ValidationException::withMessages([
                'reference_id' => ["reference_id không tồn tại cho kiểu '{$type}'."],
            ]);
        }
    }

    private function isVisibleReference(MenuItem $item): bool
    {
        if (in_array($item->type, ['custom', 'group'], true)) {
            return true;
        }

        if (!$item->reference_id) {
            return false;
        }

        return match ($item->type) {
            'product' => Product::whereKey($item->reference_id)
                ->where('is_active', true)
                ->exists(),
            'category' => Category::whereKey($item->reference_id)
                ->where('is_active', true)
                ->exists(),
            'topic' => PostTopic::whereKey($item->reference_id)
                ->where('status', 'active')
                ->exists(),
            'page', 'post' => Post::whereKey($item->reference_id)
                ->where('status', 'published')
                ->exists(),
            default => false,
        };
    }
}
