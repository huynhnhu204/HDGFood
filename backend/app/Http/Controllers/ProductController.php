<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\InventoryLog;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search') ?: $request->input('q');
        $query = Product::with(['category', 'options', 'activePromotion'])
            ->withAvg(['reviews as rating_avg' => fn($q) => $q->where('is_approved', true)], 'rating')
            ->withCount(['orderItems as total_orders'])
            ->when($request->category, fn($q) => $q->where('category_id', $request->category))
            ->when($request->min_price, fn($q) => $q->where('price', '>=', $request->min_price))
            ->when($request->max_price, fn($q) => $q->where('price', '<=', $request->max_price))
            ->when($request->rating, fn($q) => $q->having('rating_avg', '>=', $request->rating))
            ->when($request->is_featured, fn($q) => $q->where('is_featured', true))
            ->when($request->has_promotion, function($q) {
                $q->whereHas('activePromotion', function($pq) {
                    $pq->where('is_active', true)
                       ->where('start_date', '<=', now())
                       ->where('end_date', '>=', now());
                });
            })
            ->when($search, fn($q) => $q->where('name', 'like', "%{$search}%"))
            // Advanced filters
            ->when($request->has('is_active'), fn($q) => $q->where('is_active', (bool)$request->is_active))
            ->when($request->has('stock') && $request->stock === '0', fn($q) => $q->where('stock', 0))
            ->when($request->has('stock_min'), fn($q) => $q->where('stock', '>=', $request->stock_min))
            ->when($request->has('stock_max'), fn($q) => $q->where('stock', '<=', $request->stock_max))
            ->when(!$request->user()?->isAdmin(), fn($q) => $q->where('is_active', true));

        // Sorting logic - Tối ưu SEO với default sort
        $sort = $request->input('sort', 'latest');
        $sortBy = $request->input('sort_by');
        $sortOrder = $request->input('sort_order', 'asc');
        
        if ($sortBy && in_array($sortBy, ['price', 'stock', 'created_at'])) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            switch ($sort) {
                case 'best_selling':
                    $query->withCount('orderItems')->orderByDesc('order_items_count');
                    break;
                case 'price_asc':
                    $query->orderBy('price', 'asc');
                    break;
                case 'price_desc':
                    $query->orderBy('price', 'desc');
                    break;
                case 'name_asc':
                    $query->orderBy('name', 'asc');
                    break;
                case 'name_desc':
                    $query->orderBy('name', 'desc');
                    break;
                case 'rating':
                    $query->orderByDesc('rating_avg');
                    break;
                default:
                    $query->latest();
            }
        }

        if ($request->has('limit') && !$request->has('paginate')) {
            return ProductResource::collection($query->limit($request->limit)->get());
        }

        $perPage = $request->input('paginate') ?: $request->input('limit', 12);
        return ProductResource::collection($query->paginate($perPage));
    }

    public function show(string $idOrSlug, Request $request)
    {
        $product = Product::where('id', $idOrSlug)
            ->orWhere('slug', $idOrSlug)
            ->firstOrFail();

        $product->load([
            'category', 
            'options.values', 
            'images', 
            'activePromotion'
        ])->loadAvg(['reviews as rating_avg' => fn($q) => $q->where('is_approved', true)], 'rating')
          ->loadCount(['reviews as reviews_count' => fn($q) => $q->where('is_approved', true)]);

        // Kiểm tra availability nếu có province_code
        $availability = null;
        if ($request->has('province_code')) {
            $availability = $this->checkProductAvailability($product, $request->province_code);
        }

        $resource = new ProductResource($product);
        $data = $resource->toArray($request);
        
        // Thêm availability vào response
        if ($availability) {
            $data['availability'] = $availability;
        }

        // Thêm JSON-LD Schema Markup cho SEO
        $data['schema_markup'] = $this->generateSchemaMarkup($product);

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/products/{id}/availability?province_code=01
     * Kiểm tra món ăn có sẵn tại khu vực không
     */
    public function checkAvailability(Product $product, Request $request)
    {
        $request->validate([
            'province_code' => 'required|string',
            'district_code' => 'nullable|string',
            'ward_code'     => 'nullable|string',
        ]);

        $availability = $this->checkProductAvailability(
            $product, 
            $request->province_code,
            $request->district_code,
            $request->ward_code
        );

        return response()->json($availability);
    }

    /**
     * GET /api/products/{id}/related
     * Lấy danh sách sản phẩm liên quan (cùng category)
     */
    public function related(Product $product, Request $request)
    {
        $limit = $request->input('limit', 8);
        
        $relatedProducts = Product::where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->where('is_active', true)
            ->with(['category', 'activePromotion'])
            ->withAvg(['reviews as rating_avg' => fn($q) => $q->where('is_approved', true)], 'rating')
            ->inRandomOrder()
            ->limit($limit)
            ->get();

        return ProductResource::collection($relatedProducts);
    }

    /**
     * GET /api/products/{id}/cross-selling
     * Lấy sản phẩm thường được mua cùng (AI-based recommendation)
     */
    public function crossSelling(Product $product, Request $request)
    {
        $limit = $request->input('limit', 8);

        try {
            // Tìm sản phẩm thường được mua cùng dựa trên order history
            $relatedIds = DB::table('order_items as oi1')
                ->join('order_items as oi2', 'oi1.order_id', '=', 'oi2.order_id')
                ->where('oi1.product_id', $product->id)
                ->where('oi2.product_id', '!=', $product->id)
                ->select('oi2.product_id', DB::raw('COUNT(*) as frequency'))
                ->groupBy('oi2.product_id')
                ->orderByDesc('frequency')
                ->limit($limit)
                ->pluck('oi2.product_id');

            // Nếu không có data, fallback về related products
            if ($relatedIds->isEmpty()) {
                return $this->related($product, $request);
            }

            $crossSellingProducts = Product::whereIn('id', $relatedIds)
                ->where('is_active', true)
                ->with(['category', 'activePromotion'])
                ->withAvg(['reviews as rating_avg' => fn($q) => $q->where('is_approved', true)], 'rating')
                ->get();

            return ProductResource::collection($crossSellingProducts);
        } catch (\Exception $e) {
            // Log error and fallback to related products
            Log::error('Cross-selling error: ' . $e->getMessage());
            return $this->related($product, $request);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category_id'      => 'required|exists:categories,id',
            'name'             => 'required|string|max:255',
            'description'      => 'nullable|string',
            'long_description' => 'nullable|string',
            'price'            => 'required|numeric|min:0',
            'sale_price'       => 'nullable|numeric|min:0|lt:price',
            'stock'            => 'nullable|integer|min:0',
            'image'            => 'nullable|string',
            'extra_images'     => 'nullable|array',
            'extra_images.*'   => 'required',
            'is_active'        => 'sometimes|boolean',
            'is_featured'      => 'sometimes|boolean',
            'is_available'     => 'sometimes|boolean',
            'available_time'   => 'sometimes|in:all,morning,afternoon,evening',
            'internal_note'    => 'nullable|string',
            'nutrition'        => 'nullable|array',
            'options'          => 'nullable|array',
            'options.*.name'                 => 'required|string',
            'options.*.is_required'          => 'boolean',
            'options.*.values'               => 'required|array',
            'options.*.values.*.label'       => 'required|string',
            'options.*.values.*.price_extra' => 'numeric|min:0',
        ]);

        $data['slug']  = $this->uniqueSlug($data['name']);
        $data['stock'] = $data['stock'] ?? 0;

        // Calculate health score from nutrition
        if (!empty($data['nutrition'])) {
            $healthData = \App\Services\HealthScoreService::calculate($data['nutrition']);
            $data['health_score'] = $healthData['score'];
            $data['health_badges'] = json_encode($healthData['badges']);
            // Map nutrition fields to individual columns
            $nutrition = $data['nutrition'];
            $data['calories'] = isset($nutrition['kcal']) ? (float) $nutrition['kcal'] : null;
            $data['protein']  = isset($nutrition['protein']) ? (float) $nutrition['protein'] : null;
            $data['fat']      = isset($nutrition['fat']) ? (float) $nutrition['fat'] : null;
            $data['carbs']    = isset($nutrition['carbs']) ? (float) $nutrition['carbs'] : null;
            $data['fiber']    = isset($nutrition['fiber']) ? (float) $nutrition['fiber'] : null;
            unset($data['nutrition']);
        }

        return DB::transaction(function () use ($data, $request) {
            $extraImages = $data['extra_images'] ?? [];
            $options = $data['options'] ?? [];
            unset($data['extra_images'], $data['options']);

            $product = Product::create($data);

            // Lưu ảnh bổ sung
            $normalizedImages = $this->normalizeExtraImages($extraImages);
            foreach ($normalizedImages as $i => $img) {
                $product->images()->create([
                    'url' => $img['url'],
                    'path' => $img['path'],
                    'alt_text' => $img['alt_text'],
                    'is_primary' => $img['is_primary'],
                    'status' => $img['status'],
                    'sort_order' => $i,
                ]);
            }

            foreach ($options as $optData) {
                $option = $product->options()->create([
                    'name'        => $optData['name'],
                    'is_required' => $optData['is_required'] ?? false,
                ]);
                foreach ($optData['values'] as $val) {
                    $option->values()->create([
                        'label'       => $val['label'],
                        'price_extra' => $val['price_extra'] ?? 0,
                    ]);
                }
            }

            if ($product->stock > 0) {
                InventoryLog::create([
                    'product_id'  => $product->id,
                    'user_id'     => $request->user()->id,
                    'change'      => $product->stock,
                    'stock_after' => $product->stock,
                    'note'        => 'Tạo sản phẩm mới',
                ]);
            }

            // Refresh and load all relationships
            $product->refresh();
            
            return new ProductResource($product->load([
                'category', 
                'options.values',
                'images',
                'activePromotion'
            ]));
        });
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'category_id'    => 'sometimes|exists:categories,id',
            'name'           => 'sometimes|string|max:255',
            'description'    => 'nullable|string',
            'price'          => 'sometimes|numeric|min:0',
            'sale_price'     => 'nullable|numeric|min:0',
            'stock'          => 'sometimes|integer|min:0',
            'image'          => 'nullable|string',
            'extra_images'   => 'nullable|array',
            'extra_images.*' => 'required',
            'is_active'      => 'sometimes|boolean',
            'is_featured'    => 'sometimes|boolean',
            'is_available'   => 'sometimes|boolean',
            'available_time' => 'sometimes|in:all,morning,afternoon,evening',
            'internal_note'  => 'nullable|string',
            'nutrition'      => 'nullable|array',
            'options'        => 'nullable|array',
            'options.*.id'                   => 'nullable|integer',
            'options.*.name'                 => 'required|string',
            'options.*.is_required'          => 'boolean',
            'options.*.values'               => 'required|array',
            'options.*.values.*.id'          => 'nullable|integer',
            'options.*.values.*.label'       => 'required|string',
            'options.*.values.*.price_extra' => 'numeric|min:0',
        ]);

        if (isset($data['name'])) {
            $data['slug'] = $this->uniqueSlug($data['name'], $product->id);
        }

        // Calculate health score from nutrition
        if (array_key_exists('nutrition', $data)) {
            if (!empty($data['nutrition'])) {
                $healthData = \App\Services\HealthScoreService::calculate($data['nutrition']);
                $data['health_score'] = $healthData['score'];
                $data['health_badges'] = json_encode($healthData['badges']);
                $nutrition = $data['nutrition'];
                $data['calories'] = isset($nutrition['kcal']) ? (float) $nutrition['kcal'] : null;
                $data['protein']  = isset($nutrition['protein']) ? (float) $nutrition['protein'] : null;
                $data['fat']      = isset($nutrition['fat']) ? (float) $nutrition['fat'] : null;
                $data['carbs']    = isset($nutrition['carbs']) ? (float) $nutrition['carbs'] : null;
                $data['fiber']    = isset($nutrition['fiber']) ? (float) $nutrition['fiber'] : null;
            } else {
                $data['calories'] = null;
                $data['protein']  = null;
                $data['fat']      = null;
                $data['carbs']    = null;
                $data['fiber']    = null;
                $data['health_score'] = 0;
                $data['health_badges'] = null;
            }
            unset($data['nutrition']);
        }

        return DB::transaction(function () use ($data, $request, $product) {
            $extraImages = $data['extra_images'] ?? null;
            unset($data['extra_images']);

            // Ghi inventory log nếu stock thay đổi
            if (isset($data['stock']) && $data['stock'] !== $product->stock) {
                $change = $data['stock'] - $product->stock;
                InventoryLog::create([
                    'product_id'  => $product->id,
                    'user_id'     => $request->user()->id,
                    'change'      => $change,
                    'stock_after' => $data['stock'],
                    'note'        => $request->input('stock_note', 'Cập nhật tồn kho'),
                ]);
            }

            $product->update($data);

            // Đồng bộ album ảnh bổ sung nếu được gửi lên
            if (is_array($extraImages)) {
                $product->images()->delete();
                $normalizedImages = $this->normalizeExtraImages($extraImages);
                foreach ($normalizedImages as $i => $img) {
                    $product->images()->create([
                        'url' => $img['url'],
                        'path' => $img['path'],
                        'alt_text' => $img['alt_text'],
                        'is_primary' => $img['is_primary'],
                        'status' => $img['status'],
                        'sort_order' => $i,
                    ]);
                }
            }

            // Sync options nếu được gửi lên
            if (array_key_exists('options', $data)) {
                $product->options()->delete(); // xóa cũ, tạo lại
                foreach ($data['options'] ?? [] as $optData) {
                    $option = $product->options()->create([
                        'name'        => $optData['name'],
                        'is_required' => $optData['is_required'] ?? false,
                    ]);
                    foreach ($optData['values'] as $val) {
                        $option->values()->create([
                            'label'       => $val['label'],
                            'price_extra' => $val['price_extra'] ?? 0,
                        ]);
                    }
                }
            }

            // Refresh product to get updated data
            $product->refresh();
            
            return new ProductResource($product->load([
                'category', 
                'options.values', 
                'images',
                'activePromotion'
            ]));
        });
    }

    public function destroy(Product $product)
    {
        $inRunningCombo = DB::table('combo_products as cp')
            ->join('combo_groups as cg', 'cg.id', '=', 'cp.combo_group_id')
            ->join('combos as c', 'c.id', '=', 'cg.combo_id')
            ->where('cp.product_id', $product->id)
            ->where('c.is_active', 1)
            ->where(function ($q) {
                $q->whereNull('c.start_date')->orWhere('c.start_date', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('c.end_date')->orWhere('c.end_date', '>=', now());
            })
            ->exists();

        if ($inRunningCombo) {
            return response()->json([
                'message' => 'Sản phẩm đang thuộc combo hoạt động. Vui lòng gỡ khỏi combo trước khi xóa.',
            ], 422);
        }

        if (!$product->is_active) {
            $product->delete();
            return response()->json(['message' => 'Đã xóa mềm sản phẩm.']);
        }

        // Mặc định chỉ ngưng bán để bảo toàn lịch sử đơn hàng/kho
        $product->update(['is_active' => false]);
        $product->delete();
        return response()->json(['message' => 'Đã ngưng bán và xóa mềm sản phẩm.']);
    }

    /**
     * POST /api/products/{product}/clone
     */
    public function clone(Product $product)
    {
        $clone = $product->replicate();
        $clone->name = $product->name . ' (Copy)';
        $clone->slug = $this->uniqueSlug($clone->name);
        $clone->is_active = false;
        $clone->save();

        foreach ($product->options()->with('values')->get() as $opt) {
            $newOpt = $clone->options()->create(['name' => $opt->name, 'is_required' => $opt->is_required]);
            foreach ($opt->values as $val) {
                $newOpt->values()->create(['label' => $val->label, 'price_extra' => $val->price_extra]);
            }
        }

        return new ProductResource($clone->load(['category', 'options']));
    }

    /**
     * POST /api/products/bulk-delete
     * Body: { "ids": [1, 2, 3] }
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array|min:1',
            'ids.*' => 'integer|exists:products,id',
        ]);

        $deleted = 0;
        $blocked = [];
        $ids = collect($request->ids)->map(fn($id) => (int) $id)->values();
        /** @var \Illuminate\Database\Eloquent\Collection<int, Product> $products */
        $products = Product::whereIn('id', $ids)->get();

        foreach ($products as $product) {
            if (!$product instanceof Product) {
                continue;
            }

            $inRunningCombo = DB::table('combo_products as cp')
                ->join('combo_groups as cg', 'cg.id', '=', 'cp.combo_group_id')
                ->join('combos as c', 'c.id', '=', 'cg.combo_id')
                ->where('cp.product_id', $product->id)
                ->where('c.is_active', 1)
                ->where(function ($q) {
                    $q->whereNull('c.start_date')->orWhere('c.start_date', '<=', now());
                })
                ->where(function ($q) {
                    $q->whereNull('c.end_date')->orWhere('c.end_date', '>=', now());
                })
                ->exists();

            if ($inRunningCombo) {
                $blocked[] = ['id' => $product->id, 'name' => $product->name];
                continue;
            }

            $product->update(['is_active' => false]);
            $product->delete();
            $deleted++;
        }

        return response()->json([
            'message' => "Đã ngưng bán/xóa mềm {$deleted} sản phẩm.",
            'blocked' => $blocked,
        ]);
    }

    /**
     * POST /api/admin/products/import
     * Body: { rows: [{ name, price, category_id|category, ... }] }
     */
    public function import(Request $request)
    {
        $payload = $request->validate([
            'rows' => 'required|array|min:1|max:1000',
            'rows.*.name' => 'required|string|max:255',
            'rows.*.price' => 'required',
            'rows.*.sale_price' => 'nullable',
            'rows.*.stock' => 'nullable',
            'rows.*.category_id' => 'nullable|integer|exists:categories,id',
            'rows.*.category' => 'nullable|string|max:255',
            'rows.*.description' => 'nullable|string',
            'rows.*.image' => 'nullable|string|max:1000',
            'rows.*.is_active' => 'nullable',
            'rows.*.is_featured' => 'nullable',
            'rows.*.is_available' => 'nullable',
        ]);

        $rows = $payload['rows'];
        $categoryMap = Category::query()
            ->get(['id', 'name'])
            ->mapWithKeys(fn ($c) => [Str::lower(trim($c->name)) => $c->id]);

        $createdCount = 0;
        $errors = [];

        foreach ($rows as $idx => $row) {
            $line = $idx + 2; // + header row in Excel
            $categoryId = $row['category_id'] ?? null;
            if (! $categoryId && ! empty($row['category'])) {
                $categoryId = $categoryMap[Str::lower(trim((string) $row['category']))] ?? null;
            }

            if (! $categoryId) {
                $errors[] = ['row' => $line, 'message' => 'Thiếu category_id hoặc tên danh mục không hợp lệ.'];
                continue;
            }

            $price = $this->toNumber($row['price'] ?? null);
            if ($price === null || $price < 0) {
                $errors[] = ['row' => $line, 'message' => 'Giá bán không hợp lệ.'];
                continue;
            }

            $salePrice = $this->toNumber($row['sale_price'] ?? null);
            if ($salePrice !== null && $salePrice >= $price) {
                $errors[] = ['row' => $line, 'message' => 'sale_price phải nhỏ hơn price.'];
                continue;
            }

            $stock = $this->toNumber($row['stock'] ?? 0);
            $stock = $stock === null ? 0 : max(0, (int) $stock);

            try {
                DB::transaction(function () use ($request, $row, $categoryId, $price, $salePrice, $stock, &$createdCount) {
                    $product = Product::create([
                        'category_id' => $categoryId,
                        'name' => trim((string) $row['name']),
                        'slug' => $this->uniqueSlug(trim((string) $row['name'])),
                        'description' => $row['description'] ?? null,
                        'price' => $price,
                        'sale_price' => $salePrice,
                        'stock' => $stock,
                        'image' => $row['image'] ?? null,
                        'is_active' => $this->toBool($row['is_active'] ?? true),
                        'is_featured' => $this->toBool($row['is_featured'] ?? false),
                        'is_available' => $this->toBool($row['is_available'] ?? true),
                        'available_time' => 'all',
                    ]);

                    if ($stock > 0 && $request->user()) {
                        InventoryLog::create([
                            'product_id' => $product->id,
                            'user_id' => $request->user()->id,
                            'change' => $stock,
                            'stock_after' => $stock,
                            'note' => 'Import Excel',
                        ]);
                    }

                    $createdCount++;
                });
            } catch (\Throwable $e) {
                $errors[] = ['row' => $line, 'message' => $e->getMessage()];
            }
        }

        return response()->json([
            'message' => 'Import sản phẩm hoàn tất.',
            'created_count' => $createdCount,
            'failed_count' => count($errors),
            'errors' => $errors,
        ]);
    }

    /**
     * GET /api/products/{product}/stats
     * Thống kê: số đơn, doanh thu, số lượt chọn option
     */
    public function stats(Product $product)
    {
        $items = \App\Models\OrderItem::where('product_id', $product->id)
            ->whereHas('order', fn($q) => $q->whereIn('status', ['completed']))
            ->get();

        return response()->json([
            'total_orders'  => $items->sum('quantity'),
            'total_revenue' => $items->sum(fn($i) => $i->price * $i->quantity),
        ]);
    }

    /**
     * GET /api/products/{product}/inventory-logs
     */
    public function inventoryLogs(Product $product)
    {
        $logs = $product->inventoryLogs()->with('user:id,name')->paginate(20);
        return response()->json($logs);
    }

    /**
     * POST /api/products/{product}/inventory-logs
     * Body: { "change": 50, "note": "Nhập hàng sáng 26/03" }
     */
    public function addInventoryLog(Request $request, Product $product)
    {
        $data = $request->validate([
            'change' => 'required|integer|not_in:0',
            'note'   => 'nullable|string|max:255',
        ]);

        $newStock = max(0, $product->stock + $data['change']);
        $product->update(['stock' => $newStock]);

        $log = InventoryLog::create([
            'product_id'  => $product->id,
            'user_id'     => $request->user()->id,
            'change'      => $data['change'],
            'stock_after' => $newStock,
            'note'        => $data['note'] ?? null,
        ]);

        return response()->json($log, 201);
    }

    /**
     * GET /api/products/promotions
     * Hiển thị danh sách sản phẩm đang giảm giá
     */
    public function promotions(Request $request)
    {
        $query = Product::with(['category', 'options', 'activePromotion'])
            ->withAvg(['reviews as rating_avg' => fn($q) => $q->where('is_approved', true)], 'rating')
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNotNull('sale_price')
                    ->where('sale_price', '>', 0)
                    ->orWhereHas('activePromotion');
            });

        // Lọc theo danh mục
        if ($request->category) {
            $query->where('category_id', $request->category);
        }

        // Lọc theo mức giảm (Mô phỏng logic lọc nâng cao)
        if ($request->discount_range) {
            $range = $request->discount_range;
            // Lưu ý: Logic này hơi phức tạp vì discount có thể từ sale_price hoặc activePromotion.
            // Ở đây ta đơn giản hóa theo logic yêu cầu frontend.
            if ($range === 'over_50') {
                $query->where(function ($q) {
                    $q->whereRaw('((price - sale_price) / price) > 0.5')
                      ->orWhereHas('activePromotion', fn($pq) => $pq->where('discount_type', 'percent')->where('discount_value', '>', 50));
                });
            } elseif ($range === '20_50') {
                $query->where(function ($q) {
                    $q->whereRaw('((price - sale_price) / price) >= 0.2 AND ((price - sale_price) / price) <= 0.5')
                      ->orWhereHas('activePromotion', fn($pq) => $pq->where('discount_type', 'percent')->where('discount_value', '>=', 20)->where('discount_value', '<=', 50));
                });
            } elseif ($range === 'same_price_9_29') {
                $query->where(function ($q) {
                    $q->whereIn('sale_price', [9000, 19000, 29000]);
                });
            }
        }

        // Sắp xếp: Giảm giá nhiều nhất
        if ($request->sort === 'discount_desc') {
            // Sắp xếp theo phần trăm giảm giá (ưu tiên sale_price trước)
            $query->orderByRaw('(CASE WHEN sale_price IS NOT NULL AND price > 0 THEN (price - sale_price) / price ELSE 0 END) DESC');
        } else {
            $query->latest();
        }

        $perPage = $request->input('paginate') ?: 12;
        return ProductResource::collection($query->paginate($perPage));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Kiểm tra sản phẩm có sẵn tại khu vực
     * Logic: Kiểm tra xem có warehouse/store nào phục vụ khu vực này và có stock không
     */
    private function checkProductAvailability(
        Product $product, 
        string $provinceCode, 
        ?string $districtCode = null,
        ?string $wardCode = null
    ): array {
        // TODO: Tích hợp với bảng stores/warehouses khi có
        // Hiện tại giả lập logic availability
        
        // Giả sử: Kiểm tra stock > 0 và is_available = true
        $isAvailable = $product->stock > 0 && $product->is_available;
        
        // Giả lập: Một số tỉnh chưa phục vụ
        $unavailableProvinces = ['92', '93', '94', '95', '96']; // Các tỉnh miền núi xa
        if (in_array($provinceCode, $unavailableProvinces)) {
            $isAvailable = false;
        }

        // Tính estimated delivery time
        $estimatedDelivery = $isAvailable ? 30 : null; // 30 phút

        // Nếu có district/ward, có thể tính chính xác hơn
        if ($isAvailable && $districtCode) {
            // Logic tính khoảng cách từ warehouse gần nhất
            // Ví dụ: Nội thành 20-30 phút, ngoại thành 45-60 phút
            $estimatedDelivery = 30; // Simplified
        }

        return [
            'available' => $isAvailable,
            'stock' => $product->stock,
            'estimated_delivery_minutes' => $estimatedDelivery,
            'message' => $isAvailable 
                ? "Món ăn có sẵn tại khu vực của bạn. Giao hàng trong {$estimatedDelivery} phút!"
                : "Rất tiếc, món ăn này chưa có sẵn tại khu vực của bạn.",
            'province_code' => $provinceCode,
            'district_code' => $districtCode,
            'ward_code' => $wardCode,
        ];
    }

    /**
     * Generate JSON-LD Schema Markup cho SEO
     * Chuẩn Schema.org/Product
     */
    private function generateSchemaMarkup(Product $product): array
    {
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $product->name,
            'description' => $product->description ?? "Món ăn ngon tại HDG Food",
            'image' => $product->image ? url($product->image) : null,
            'sku' => "HDG-{$product->id}",
            'brand' => [
                '@type' => 'Brand',
                'name' => 'HDG Food',
            ],
            'offers' => [
                '@type' => 'Offer',
                'url' => url("/products/{$product->slug}"),
                'priceCurrency' => 'VND',
                'price' => $product->final_price,
                'priceValidUntil' => now()->addMonths(3)->format('Y-m-d'),
                'availability' => $product->stock > 0 
                    ? 'https://schema.org/InStock' 
                    : 'https://schema.org/OutOfStock',
                'itemCondition' => 'https://schema.org/NewCondition',
            ],
        ];

        // Thêm aggrHDGteRating nếu có reviews
        $ratingAvg = $product->reviews()->where('is_approved', true)->avg('rating');
        $reviewsCount = $product->reviews()->where('is_approved', true)->count();
        
        if ($reviewsCount > 0) {
            $schema['aggrHDGteRating'] = [
                '@type' => 'AggrHDGteRating',
                'ratingValue' => round($ratingAvg, 1),
                'reviewCount' => $reviewsCount,
                'bestRating' => 5,
                'worstRating' => 1,
            ];
        }

        // Thêm nutrition information nếu có
        if ($product->long_description) {
            $schema['nutrition'] = [
                '@type' => 'NutritionInformation',
                'description' => strip_tags($product->long_description),
            ];
        }

        // Thêm category
        if ($product->category) {
            $schema['category'] = $product->category->name;
        }

        return $schema;
    }

    private function uniqueSlug(string $name, ?int $excludeId = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i    = 1;

        while (
            Product::where('slug', $slug)
                ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
                ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function toNumber(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        $normalized = str_replace([' ', ','], ['', '.'], (string) $value);
        return is_numeric($normalized) ? (float) $normalized : null;
    }

    private function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        $text = Str::lower(trim((string) $value));
        return in_array($text, ['1', 'true', 'yes', 'y', 'active', 'có', 'co'], true);
    }

    private function normalizeExtraImages(array $extraImages): array
    {
        $normalized = [];
        $hasPrimary = false;

        foreach ($extraImages as $item) {
            if (is_string($item)) {
                $normalized[] = [
                    'url' => $item,
                    'path' => null,
                    'alt_text' => null,
                    'is_primary' => false,
                    'status' => 'active',
                ];
                continue;
            }

            if (!is_array($item) || empty($item['url'])) {
                continue;
            }

            $isPrimary = (bool) ($item['is_primary'] ?? false);
            if ($isPrimary) {
                $hasPrimary = true;
            }

            $status = $item['status'] ?? 'active';
            $normalized[] = [
                'url' => (string) $item['url'],
                'path' => isset($item['path']) ? (string) $item['path'] : null,
                'alt_text' => isset($item['alt_text']) ? (string) $item['alt_text'] : null,
                'is_primary' => $isPrimary,
                'status' => in_array($status, ['active', 'archived'], true) ? $status : 'active',
            ];
        }

        if (!$hasPrimary && !empty($normalized)) {
            $normalized[0]['is_primary'] = true;
        }

        return $normalized;
    }
}
