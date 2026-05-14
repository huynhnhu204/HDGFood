<?php

namespace App\Http\Controllers;

use App\Models\Policy;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PolicyController extends Controller
{
    public function index(Request $request)
    {
        $query = Policy::query()->where('is_active', true);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('content', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $policies = $query->orderBy('order')->orderBy('id')->get();

        return response()->json(['success' => true, 'data' => $policies]);
    }

    public function showBySlug(string $slug)
    {
        $policy = Policy::query()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (!$policy) {
            return response()->json(['success' => false, 'message' => 'Policy not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $policy]);
    }

    public function indexAdmin(Request $request)
    {
        $query = Policy::query()->with('updatedBy:id,name');

        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $policies = $query->orderBy('order')->orderByDesc('updated_at')->paginate((int) ($request->per_page ?? 15));

        return response()->json([
            'success' => true,
            'data' => $policies->items(),
            'meta' => [
                'current_page' => $policies->currentPage(),
                'last_page' => $policies->lastPage(),
                'per_page' => $policies->perPage(),
                'total' => $policies->total(),
            ],
        ]);
    }

    public function showAdmin(int $id)
    {
        $policy = Policy::query()->with('updatedBy:id,name')->find($id);
        if (!$policy) {
            return response()->json(['success' => false, 'message' => 'Policy not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $policy]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:policies,slug',
            'icon' => 'nullable|string|max:100',
            'category' => 'required|string|max:100',
            'content' => 'required|string',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if (empty($data['slug'])) {
            $data['slug'] = $this->generateSlug($data['title']);
        }

        $data['last_updated_by'] = $request->user()?->id;
        $policy = Policy::create($data);

        return response()->json(['success' => true, 'data' => $policy, 'message' => 'Tạo chính sách thành công'], 201);
    }

    public function update(Request $request, int $id)
    {
        $policy = Policy::find($id);
        if (!$policy) {
            return response()->json(['success' => false, 'message' => 'Policy not found'], 404);
        }

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:policies,slug,' . $policy->id,
            'icon' => 'nullable|string|max:100',
            'category' => 'sometimes|required|string|max:100',
            'content' => 'sometimes|required|string',
            'order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        if (array_key_exists('title', $data) && empty($data['slug'])) {
            $data['slug'] = $this->generateSlug($data['title'], $policy->id);
        }

        $data['last_updated_by'] = $request->user()?->id;
        $policy->update($data);

        return response()->json(['success' => true, 'data' => $policy->fresh('updatedBy:id,name'), 'message' => 'Cập nhật thành công']);
    }

    public function destroy(int $id)
    {
        $policy = Policy::find($id);
        if (!$policy) {
            return response()->json(['success' => false, 'message' => 'Policy not found'], 404);
        }
        $policy->delete();
        return response()->json(['success' => true, 'message' => 'Đã xóa chính sách']);
    }

    public function toggle(int $id)
    {
        $policy = Policy::find($id);
        if (!$policy) {
            return response()->json(['success' => false, 'message' => 'Policy not found'], 404);
        }
        $policy->is_active = !$policy->is_active;
        $policy->save();

        return response()->json(['success' => true, 'data' => ['is_active' => $policy->is_active], 'message' => 'Đã cập nhật trạng thái']);
    }

    private function generateSlug(string $title, ?int $excludeId = null): string
    {
        $baseSlug = Str::slug($title);
        $slug = $baseSlug;
        $counter = 1;

        while (true) {
            $query = Policy::where('slug', $slug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
            if (!$query->exists()) {
                break;
            }
            $slug = $baseSlug . '-' . $counter++;
        }

        return $slug;
    }
}
