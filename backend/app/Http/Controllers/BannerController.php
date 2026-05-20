<?php

namespace App\Http\Controllers;

use App\Models\Banner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

use App\Http\Controllers\Concerns\AppliesAdminTrashIndex;

class BannerController extends Controller
{
    use AppliesAdminTrashIndex;
    private const ALLOWED_POSITIONS = [
        'slider',
        'home_center',
        'sidebar',
        'products',
        'combos',
        'promotions',
        'blog',
        'about',
        'contact',
        'global',
    ];

    /**
     * Lấy danh sách Banner cho Admin
     */
    public function index(Request $request)
    {
        $query = Banner::query();

        if ($request->filled('position')) {
            $position = $request->position;
            $query->where(function ($q) use ($position) {
                $q->where('position', $position)
                    ->orWhereJsonContains('positions', $position);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search text
        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        $this->applyAdminTrashIndexScope($query, $request);

        $banners = $query->orderBy('sort_order', 'asc')
                         ->orderBy('created_at', 'desc')
                         ->paginate($request->per_page ?? 15);

        return response()->json($banners);
    }

    /**
     * Lấy danh sách Banner cho Public Frontend (Client)
     * Chỉ lấy active, và thời gian nằm trong khoảng start_date - end_date
     */
    public function active(Request $request)
    {
        $now = Carbon::now();
        $query = Banner::where('status', 'active')
            ->where(function ($q) use ($now) {
                // start_date null HOẶC <= now
                $q->whereNull('start_date')->orWhere('start_date', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                // end_date null HOẶC >= now
                $q->whereNull('end_date')->orWhere('end_date', '>=', $now);
            });

        if ($request->filled('position')) {
            $position = $request->position;
            $query->where(function ($q) use ($position) {
                $q->where('position', $position)
                    ->orWhereJsonContains('positions', $position);
            });
        }

        $banners = $query->orderBy('sort_order', 'asc')->get();

        return response()->json($banners);
    }

    /**
     * Tạo mới Banner
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'image' => 'required|image|max:5120',
            'mobile_image' => 'nullable|image|max:5120',
            'link_url' => 'nullable|string|max:255',
            'position' => 'nullable|in:' . implode(',', self::ALLOWED_POSITIONS),
            'positions' => 'nullable|array',
            'positions.*' => 'in:' . implode(',', self::ALLOWED_POSITIONS),
            'sort_order' => 'nullable|integer',
            'status' => 'required|in:active,inactive',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $positions = $this->extractPositions($request, $validated);

        $banner = new Banner();
        $banner->title = $validated['title'];
        $banner->link_url = $validated['link_url'] ?? null;
        $banner->position = $positions[0];
        $banner->positions = $positions;
        $banner->sort_order = $validated['sort_order'] ?? 0;
        $banner->status = $validated['status'];
        $banner->start_date = $validated['start_date'] ?? null;
        $banner->end_date = $validated['end_date'] ?? null;

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time() . '_desktop_' . uniqid() . '.' . $file->extension();
            $path = $file->storeAs('banners', $filename, 'public');
            $banner->image_path = $path;
        }

        if ($request->hasFile('mobile_image')) {
            $file = $request->file('mobile_image');
            $filename = time() . '_mobile_' . uniqid() . '.' . $file->extension();
            $path = $file->storeAs('banners', $filename, 'public');
            $banner->mobile_image_path = $path;
        }

        $banner->save();

        return response()->json([
            'message' => 'Tạo banner thành công',
            'banner' => $banner
        ], 201);
    }

    /**
     * Xem chi tiết 1 Banner
     */
    public function show(Banner $banner)
    {
        return response()->json($banner);
    }

    /**
     * Cập nhật Banner (Sử dụng form-data/POST thay vì PUT vì có file)
     */
    public function update(Request $request, Banner $banner)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'image' => 'nullable|image|max:5120',
            'mobile_image' => 'nullable|image|max:5120',
            'link_url' => 'nullable|string|max:255',
            'position' => 'nullable|in:' . implode(',', self::ALLOWED_POSITIONS),
            'positions' => 'nullable|array',
            'positions.*' => 'in:' . implode(',', self::ALLOWED_POSITIONS),
            'sort_order' => 'nullable|integer',
            'status' => 'required|in:active,inactive',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $positions = $this->extractPositions($request, $validated);

        $banner->title = $validated['title'];
        $banner->link_url = $validated['link_url'] ?? null;
        $banner->position = $positions[0];
        $banner->positions = $positions;
        $banner->sort_order = $validated['sort_order'] ?? 0;
        $banner->status = $validated['status'];
        $banner->start_date = $validated['start_date'] ?? null;
        $banner->end_date = $validated['end_date'] ?? null;

        if ($request->hasFile('image')) {
            if ($banner->image_path) {
                Storage::disk('public')->delete($banner->image_path);
            }
            $file = $request->file('image');
            $filename = time() . '_desktop_' . uniqid() . '.' . $file->extension();
            $path = $file->storeAs('banners', $filename, 'public');
            $banner->image_path = $path;
        }

        if ($request->hasFile('mobile_image')) {
            if ($banner->mobile_image_path) {
                Storage::disk('public')->delete($banner->mobile_image_path);
            }
            $file = $request->file('mobile_image');
            $filename = time() . '_mobile_' . uniqid() . '.' . $file->extension();
            $path = $file->storeAs('banners', $filename, 'public');
            $banner->mobile_image_path = $path;
        }

        $banner->save();

        return response()->json([
            'message' => 'Cập nhật banner thành công',
            'banner' => $banner
        ]);
    }

    /**
     * Xóa Banner
     */
    public function destroy(Banner $banner)
    {
        if ($banner->image_path) {
            Storage::disk('public')->delete($banner->image_path);
        }
        if ($banner->mobile_image_path) {
            Storage::disk('public')->delete($banner->mobile_image_path);
        }
        
        $banner->delete();
        
        return response()->json(['message' => 'Đã xóa banner']);
    }

    /**
     * Thay đổi trạng thái (Toggle status)
     */
    public function toggle(Banner $banner)
    {
        $banner->status = $banner->status === 'active' ? 'inactive' : 'active';
        $banner->save();

        return response()->json([
            'message' => 'Đã cập nhật trạng thái',
            'status' => $banner->status
        ]);
    }

    /**
     * Tăng lượt click
     */
    public function incrementClick(Banner $banner)
    {
        $banner->increment('click_count');
        return response()->json(['message' => 'Click tracked']);
    }

    private function extractPositions(Request $request, array $validated): array
    {
        $positions = $validated['positions'] ?? $request->input('positions', []);

        if (!is_array($positions)) {
            $positions = [];
        }

        if (empty($positions) && !empty($validated['position'])) {
            $positions = [$validated['position']];
        }

        if (empty($positions)) {
            $positions = ['global'];
        }

        $positions = array_values(array_unique(array_filter($positions, function ($p) {
            return in_array($p, self::ALLOWED_POSITIONS, true);
        })));

        return empty($positions) ? ['global'] : $positions;
    }
}
