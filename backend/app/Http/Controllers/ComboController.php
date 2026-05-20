<?php

namespace App\Http\Controllers;

use App\Models\Combo;
use App\Models\ComboGroup;
use App\Models\ComboProduct;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

use App\Http\Controllers\Concerns\AppliesAdminTrashIndex;

class ComboController extends Controller
{
    use AppliesAdminTrashIndex;
    // ==================== PUBLIC ENDPOINTS ====================

    /**
     * List all active combos
     */
    public function index(Request $request)
    {
        $query = Combo::where('is_active', true)
            ->with(['groups' => function ($q) {
                $q->orderBy('sort_order');
            }, 'groups.comboProducts.product'])
            ->where(function ($q) {
                $q->whereNull('start_date')
                    ->orWhere('start_date', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', now());
            });

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $combos = $query->orderBy('created_at', 'desc')->get();

        // Add computed fields (use dynamic prices)
        foreach ($combos as $combo) {
            $combo->append(['is_running']);
            // Override with dynamic calculated prices
            $combo->base_price = $combo->getDynamicBasePrice();
            $combo->final_price = $combo->getDynamicFinalPrice();
            $combo->total_base_price = $combo->base_price;
            $combo->total_discount = $combo->base_price - $combo->final_price;

            // Transform comboProducts -> products for frontend
            foreach ($combo->groups as $group) {
                $group->products = $group->comboProducts->map(function ($cp) {
                    return [
                        'id' => $cp->id,
                        'combo_group_id' => $cp->combo_group_id,
                        'product_id' => $cp->product->id,
                        'name' => $cp->product->name,
                        'slug' => $cp->product->slug,
                        'image' => $cp->product->image,
                        'price' => $cp->product->price,
                        'final_price' => $cp->product->final_price ?? $cp->product->price,
                        'quantity' => $cp->quantity ?? 1,
                        'price_override' => $cp->price_override,
                        'effective_price' => (float) ($cp->price_override ?? $cp->product->final_price ?? 0),
                    ];
                });
                unset($group->comboProducts);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $combos,
        ]);
    }

    /**
     * Get single combo detail
     */
    public function show($id)
    {
        $combo = Combo::with(['groups' => function ($q) {
            $q->orderBy('sort_order');
        }, 'groups.comboProducts.product'])
            ->find($id);

        if (!$combo) {
            return response()->json(['success' => false, 'message' => 'Combo not found'], 404);
        }

        $combo->append(['is_running']);

        // Use dynamic calculated prices
        $combo->base_price = $combo->getDynamicBasePrice();
        $combo->final_price = $combo->getDynamicFinalPrice();
        $combo->total_base_price = $combo->base_price;
        $combo->total_discount = $combo->base_price - $combo->final_price;

        // Transform products for frontend (comboProducts -> products)
        foreach ($combo->groups as $group) {
            $group->products = $group->comboProducts->map(function ($cp) {
                return [
                    'id' => $cp->id,
                    'combo_group_id' => $cp->combo_group_id,
                    'product_id' => $cp->product->id,
                    'name' => $cp->product->name,
                    'slug' => $cp->product->slug,
                    'image' => $cp->product->image,
                    'price' => $cp->product->price,
                    'final_price' => $cp->product->final_price ?? $cp->product->price,
                    'quantity' => $cp->quantity ?? 1,
                    'price_override' => $cp->price_override,
                    'effective_price' => (float) ($cp->price_override ?? $cp->product->final_price ?? 0),
                ];
            });
            // Remove original comboProducts from response
            unset($group->comboProducts);
        }

        return response()->json(['success' => true, 'data' => $combo]);
    }

    /**
     * Calculate combo price for specific selections
     */
    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'combo_id'    => 'required|integer|exists:combos,id',
            'selections'  => 'required|array|min:1',
            'selections.*.group_id'  => 'required|integer|exists:combo_groups,id',
            'selections.*.product_ids'=> 'required|array|min:1',
        ]);

        $combo = Combo::with(['groups' => function ($q) {
            $q->orderBy('sort_order');
        }, 'groups.comboProducts.product'])
            ->find($validated['combo_id']);

        if (!$combo) {
            return response()->json(['success' => false, 'message' => 'Combo not found'], 404);
        }

        if (!$combo->is_running) {
            return response()->json(['success' => false, 'message' => 'Combo is not active or has expired'], 400);
        }

        // Transform comboProducts -> _items for validation
        foreach ($combo->groups as $group) {
            $itemsArray = $group->comboProducts->map(function ($cp) {
                return [
                    'id' => $cp->id,
                    'combo_group_id' => $cp->combo_group_id,
                    'product_id' => $cp->product->id,
                    'name' => $cp->product->name,
                    'slug' => $cp->product->slug,
                    'image' => $cp->product->image,
                    'price' => $cp->product->price,
                    'final_price' => $cp->product->final_price ?? $cp->product->price,
                    'quantity' => $cp->quantity ?? 1,
                    'price_override' => $cp->price_override,
                    'effective_price' => (float) ($cp->price_override ?? $cp->product->final_price ?? 0),
                ];
            })->values()->all();
            $group->_items = $itemsArray;
        }

        $selections = $validated['selections'];
        $allValid = true;
        $errors = [];

        // Validate each group
        foreach ($combo->groups as $group) {
            $selection = collect($selections)->firstWhere('group_id', $group->id);
            $productIds = $selection['product_ids'] ?? [];

            // Check min/max
            $count = count($productIds);
            if ($count < $group->min_required || $count > $group->max_required) {
                $allValid = false;
                $errors[] = "Group '{$group->name}': must select between {$group->min_required} and {$group->max_required} items";
                continue;
            }

            // Check all products belong to this group
            $validProductIds = array_column($group->_items ?? [], 'product_id');
            foreach ($productIds as $pid) {
                if (!in_array($pid, $validProductIds)) {
                    $allValid = false;
                    $errors[] = "Product ID {$pid} does not belong to group '{$group->name}'";
                }
            }
        }

        // Check all groups are covered
        $coveredGroupIds = collect($selections)->pluck('group_id')->toArray();
        $allGroupIds = $combo->groups->pluck('id')->toArray();
        $missingGroups = array_diff($allGroupIds, $coveredGroupIds);
        if (!empty($missingGroups)) {
            $allValid = false;
            foreach ($missingGroups as $gid) {
                $g = $combo->groups->firstWhere('id', $gid);
                $errors[] = "Missing selection for group '{$g->name}'";
            }
        }

        if (!$allValid) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid selections',
                'errors' => $errors,
            ], 422);
        }

        $result = $combo->calculatePriceForSelections($selections);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * List all combos (admin)
     */
    public function indexAdmin(Request $request)
    {
        $query = Combo::with(['activeGroups.comboProducts'])
            ->orderBy('created_at', 'desc');

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $this->applyAdminTrashIndexScope($query, $request);

        $perPage = $request->get('per_page', 15);
        $combos = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $combos->items(),
            'meta' => [
                'current_page' => $combos->currentPage(),
                'last_page'    => $combos->lastPage(),
                'per_page'     => $combos->perPage(),
                'total'        => $combos->total(),
            ],
        ]);
    }

    /**
     * Create new combo
     */
    public function store(Request $request)
    {
        $rules = [
            'name'          => 'required|string|max:255',
            'slug'          => 'nullable|string|unique:combos,slug',
            'description'   => 'nullable|string',
            'image'         => 'nullable|string',
            'discount_type' => ['required', Rule::in(['percent', 'fixed'])],
            'discount_value'=> 'required|numeric|min:0',
            'is_active'     => 'boolean',
            'start_date'    => 'nullable|date',
            'end_date'      => 'nullable|date|after_or_equal:start_date',
            'groups'        => 'nullable|array',
            'groups.*.name' => 'required_with:groups|string|max:255',
            'groups.*.description' => 'nullable|string',
            'groups.*.min_required' => 'nullable|integer|min:1',
            'groups.*.max_required' => 'nullable|integer|min:1',
        ];

        $hasShowOnHomepage = Schema::hasColumn('combos', 'show_on_homepage');
        if ($hasShowOnHomepage) {
            $rules['show_on_homepage'] = 'boolean';
        }

        $validated = $request->validate($rules);

        // Generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
            // Ensure unique
            $baseSlug = $validated['slug'];
            $counter = 1;
            while (Combo::where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $baseSlug . '-' . $counter++;
            }
        }

        $comboPayload = [
            'name'          => $validated['name'],
            'slug'          => $validated['slug'],
            'description'   => $validated['description'] ?? null,
            'image'         => $validated['image'] ?? null,
            'discount_type' => $validated['discount_type'],
            'discount_value'=> $validated['discount_value'],
            'is_active'     => $validated['is_active'] ?? true,
            'start_date'    => $validated['start_date'] ?? null,
            'end_date'      => $validated['end_date'] ?? null,
        ];
        if ($hasShowOnHomepage) {
            $comboPayload['show_on_homepage'] = $validated['show_on_homepage'] ?? false;
        }

        $combo = Combo::create($comboPayload);

        // Create groups if provided
        if (!empty($validated['groups'])) {
            foreach ($validated['groups'] as $index => $groupData) {
                $group = $combo->groups()->create([
                    'name'          => $groupData['name'],
                    'description'   => $groupData['description'] ?? null,
                    'min_required'  => $groupData['min_required'] ?? 1,
                    'max_required' => $groupData['max_required'] ?? 1,
                    'sort_order'    => $index,
                ]);
            }
        }

        $combo->load('activeGroups.comboProducts');

        return response()->json([
            'success' => true,
            'data' => $combo,
            'message' => 'Combo created successfully',
        ], 201);
    }

    /**
     * Get combo for edit (admin)
     */
    public function showAdmin($id)
    {
        $combo = Combo::with(['activeGroups.comboProducts.product'])
            ->find($id);

        if (!$combo) {
            return response()->json(['success' => false, 'message' => 'Combo not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $combo]);
    }

    /**
     * Update combo
     */
    public function update(Request $request, $id)
    {
        $combo = Combo::find($id);
        if (!$combo) {
            return response()->json(['success' => false, 'message' => 'Combo not found'], 404);
        }

        $rules = [
            'name'          => 'sometimes|required|string|max:255',
            'slug'          => 'sometimes|required|string|unique:combos,slug,' . $id,
            'description'   => 'nullable|string',
            'image'         => 'nullable|string',
            'discount_type' => [Rule::in(['percent', 'fixed'])],
            'discount_value'=> 'nullable|numeric|min:0',
            'is_active'     => 'boolean',
            'start_date'    => 'nullable|date',
            'end_date'      => 'nullable|date',
        ];

        if (Schema::hasColumn('combos', 'show_on_homepage')) {
            $rules['show_on_homepage'] = 'boolean';
        }

        $validated = $request->validate($rules);

        $combo->update($validated);

        return response()->json([
            'success' => true,
            'data' => $combo->fresh('activeGroups.comboProducts'),
            'message' => 'Combo updated successfully',
        ]);
    }

    /**
     * Delete combo
     */
    public function destroy($id)
    {
        $combo = Combo::find($id);
        if (!$combo) {
            return response()->json(['success' => false, 'message' => 'Combo not found'], 404);
        }

        $combo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Combo deleted successfully',
        ]);
    }

    /**
     * Add group to combo
     */
    public function addGroup(Request $request, $id)
    {
        $combo = Combo::find($id);
        if (!$combo) {
            return response()->json(['success' => false, 'message' => 'Combo not found'], 404);
        }

        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'description'   => 'nullable|string',
            'min_required'  => 'nullable|integer|min:1',
            'max_required' => 'nullable|integer|min:1',
        ]);

        $maxOrder = $combo->groups()->max('sort_order') ?? -1;
        $group = $combo->groups()->create([
            'name'          => $validated['name'],
            'description'   => $validated['description'] ?? null,
            'min_required'  => $validated['min_required'] ?? 1,
            'max_required' => $validated['max_required'] ?? 1,
            'sort_order'    => $maxOrder + 1,
        ]);

        return response()->json([
            'success' => true,
            'data' => $group,
            'message' => 'Group added successfully',
        ], 201);
    }

    /**
     * Update group
     */
    public function updateGroup(Request $request, $id, $gid)
    {
        $group = ComboGroup::where('combo_id', $id)->find($gid);
        if (!$group) {
            return response()->json(['success' => false, 'message' => 'Group not found'], 404);
        }

        $validated = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'description'   => 'nullable|string',
            'min_required'  => 'nullable|integer|min:1',
            'max_required' => 'nullable|integer|min:1',
            'sort_order'   => 'nullable|integer',
        ]);

        $group->update($validated);

        return response()->json([
            'success' => true,
            'data' => $group,
            'message' => 'Group updated successfully',
        ]);
    }

    /**
     * Delete group
     */
    public function deleteGroup($id, $gid)
    {
        $group = ComboGroup::where('combo_id', $id)->find($gid);
        if (!$group) {
            return response()->json(['success' => false, 'message' => 'Group not found'], 404);
        }

        $group->delete();

        return response()->json([
            'success' => true,
            'message' => 'Group deleted successfully',
        ]);
    }

    /**
     * Add products to group
     */
    public function addProducts(Request $request, $id, $gid)
    {
        $group = ComboGroup::where('combo_id', $id)->find($gid);
        if (!$group) {
            return response()->json(['success' => false, 'message' => 'Group not found'], 404);
        }

        $validated = $request->validate([
            'products' => 'required|array|min:1',
            'products.*.product_id'   => 'required|integer|exists:products,id',
            'products.*.quantity'     => 'nullable|integer|min:1',
            'products.*.price_override' => 'nullable|numeric|min:0',
        ]);

        $created = [];
        foreach ($validated['products'] as $productData) {
            // Check if already exists
            $exists = ComboProduct::where('combo_group_id', $gid)
                ->where('product_id', $productData['product_id'])
                ->exists();

            if ($exists) continue;

            $cp = ComboProduct::create([
                'combo_group_id' => $gid,
                'product_id'     => $productData['product_id'],
                'quantity'       => max(1, (int) ($productData['quantity'] ?? 1)),
                'price_override' => $productData['price_override'] ?? null,
            ]);
            $cp->load('product');
            $created[] = $cp;
        }

        // Recalculate combo prices
        $combo = $group->combo;
        $combo->base_price = $combo->calculateBasePriceFromProducts();
        $combo->final_price = $combo->calculateFinalPrice();
        $combo->save();

        return response()->json([
            'success' => true,
            'data' => $created,
            'message' => 'Products added successfully',
        ], 201);
    }

    /**
     * Remove product from group
     */
    public function removeProduct($id, $gid, $pid)
    {
        $cp = ComboProduct::where('combo_group_id', $gid)
            ->where('product_id', $pid)
            ->first();

        if (!$cp) {
            return response()->json(['success' => false, 'message' => 'Product not found in group'], 404);
        }

        $comboGroup = $cp->comboGroup;
        $combo = $comboGroup->combo;

        $cp->delete();

        // Recalculate combo prices
        $combo->base_price = $combo->calculateBasePriceFromProducts();
        $combo->final_price = $combo->calculateFinalPrice();
        $combo->save();

        return response()->json([
            'success' => true,
            'message' => 'Product removed successfully',
        ]);
    }

    /**
     * Toggle combo active status
     */
    public function toggle($id)
    {
        $combo = Combo::find($id);
        if (!$combo) {
            return response()->json(['success' => false, 'message' => 'Combo not found'], 404);
        }

        $combo->is_active = !$combo->is_active;
        $combo->save();

        return response()->json([
            'success' => true,
            'data' => ['is_active' => $combo->is_active],
            'message' => $combo->is_active ? 'Combo activated' : 'Combo deactivated',
        ]);
    }

    /**
     * Seed sample combos
     */
    public function seed()
    {
        // Get some products
        $products = \App\Models\Product::where('is_active', true)->limit(10)->get();
        if ($products->count() < 5) {
            return response()->json([
                'success' => false,
                'message' => 'Need at least 5 active products to seed combos',
            ], 400);
        }

        // Xóa theo thứ tự (MySQL không cho TRUNCATE combos khi combo_groups FK trỏ tới)
        DB::transaction(function () {
            ComboProduct::query()->delete();
            ComboGroup::query()->delete();
            Combo::query()->delete();
        });

        // Combo 1: Set Trưa Văn Phòng
        $combo1 = Combo::create([
            'name'          => 'Set Trưa Văn Phòng',
            'slug'          => 'set-trua-van-phong',
            'description'   => 'Combo trưa tiện lợi cho dân văn phòng. Chọn 1 món chính + 1 nước uống với giá ưu đãi 15%.',
            'image'         => $products->first()?->image,
            'discount_type' => 'percent',
            'discount_value'=> 15,
            'is_active'     => true,
        ]);

        // Group 1: Món chính (chọn 1 trong 5)
        $g1 = $combo1->groups()->create([
            'name'          => 'Chọn 1 món chính',
            'description'   => 'Cơm, mì, hoặc bún',
            'min_required'  => 1,
            'max_required'  => 1,
            'sort_order'    => 0,
        ]);

        // Group 2: Nước uống (chọn 1 trong 3)
        $g2 = $combo1->groups()->create([
            'name'          => 'Chọn 1 nước uống',
            'description'   => 'Trà, cà phê, nước ép',
            'min_required'  => 1,
            'max_required'  => 1,
            'sort_order'    => 1,
        ]);

        foreach ($products->take(5) as $p) {
            $g1->comboProducts()->create(['product_id' => $p->id]);
        }
        foreach ($products->slice(5, 3) as $p) {
            $g2->comboProducts()->create(['product_id' => $p->id]);
        }

        $combo1->base_price = $combo1->calculateBasePriceFromProducts();
        $combo1->final_price = $combo1->calculateFinalPrice();
        $combo1->save();

        // Combo 2: Set Gia Đình
        $combo2 = Combo::create([
            'name'          => 'Set Gia Đình 4 Người',
            'slug'          => 'set-gia-dinh-4-nguoi',
            'description'   => 'Combo gia đình với 2 món chính + 2 món phụ + 4 nước. Tiết kiệm 20% khi mua set.',
            'image'         => $products->skip(1)->first()?->image,
            'discount_type' => 'percent',
            'discount_value'=> 20,
            'is_active'     => true,
        ]);

        $g3 = $combo2->groups()->create([
            'name'          => 'Chọn 2 món chính',
            'min_required'  => 2,
            'max_required'  => 2,
            'sort_order'    => 0,
        ]);
        $g4 = $combo2->groups()->create([
            'name'          => 'Chọn 2 món phụ',
            'min_required'  => 2,
            'max_required'  => 2,
            'sort_order'    => 1,
        ]);
        $g5 = $combo2->groups()->create([
            'name'          => 'Chọn 4 nước uống',
            'min_required'  => 4,
            'max_required'  => 4,
            'sort_order'    => 2,
        ]);

        foreach ($products->take(6) as $p) {
            $g3->comboProducts()->create(['product_id' => $p->id]);
        }
        foreach ($products->take(4) as $p) {
            $g4->comboProducts()->create(['product_id' => $p->id]);
        }
        foreach ($products->take(6) as $p) {
            $g5->comboProducts()->create(['product_id' => $p->id]);
        }

        $combo2->base_price = $combo2->calculateBasePriceFromProducts();
        $combo2->final_price = $combo2->calculateFinalPrice();
        $combo2->save();

        // Combo 3: Combo Cặp Đôi - Fixed discount
        $combo3 = Combo::create([
            'name'          => 'Combo Cặp Đôi',
            'slug'          => 'combo-cap-doi',
            'description'   => 'Lựa chọn lý tưởng cho 2 người. Chọn 2 món chính + 2 nước, giảm ngay 25.000đ.',
            'image'         => $products->skip(2)->first()?->image,
            'discount_type' => 'fixed',
            'discount_value'=> 25000,
            'is_active'     => true,
            'end_date'      => now()->addMonths(2),
        ]);

        $g6 = $combo3->groups()->create([
            'name'          => 'Chọn 2 món chính',
            'min_required'  => 2,
            'max_required'  => 2,
            'sort_order'    => 0,
        ]);
        $g7 = $combo3->groups()->create([
            'name'          => 'Chọn 2 nước uống',
            'min_required'  => 2,
            'max_required'  => 2,
            'sort_order'    => 1,
        ]);

        foreach ($products->take(4) as $p) {
            $g6->comboProducts()->create(['product_id' => $p->id]);
        }
        foreach ($products->take(4) as $p) {
            $g7->comboProducts()->create(['product_id' => $p->id]);
        }

        $combo3->base_price = $combo3->calculateBasePriceFromProducts();
        $combo3->final_price = $combo3->calculateFinalPrice();
        $combo3->save();

        $combo1->load('activeGroups.comboProducts');
        $combo2->load('activeGroups.comboProducts');
        $combo3->load('activeGroups.comboProducts');

        return response()->json([
            'success' => true,
            'message' => 'Seeded 3 sample combos',
            'data' => [$combo1, $combo2, $combo3],
        ]);
    }
}