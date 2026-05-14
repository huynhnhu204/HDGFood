<?php

namespace App\Http\Controllers;

use App\Http\Resources\PromotionResource;
use App\Models\Promotion;
use Illuminate\Http\Request;

class PromotionController extends Controller
{
    public function index(Request $request)
    {
        $query = Promotion::with('products');

        // Tìm theo tên
        if ($request->filled('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        // Lọc theo trạng thái
        if ($request->filled('status')) {
            if ($request->status === 'running') {
                $query->active();
            } elseif ($request->status === 'expired') {
                $query->where(function($q) {
                    $q->where('is_active', false)
                      ->orWhere('end_date', '<', now());
                });
            }
        }

        return PromotionResource::collection(
            $query->latest()->paginate(min((int) $request->get('per_page', 15), 100))
        );
    }

    public function show(Promotion $promotion)
    {
        return new PromotionResource($promotion->load('products'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'             => 'required|string|max:255',
            'product_ids'      => 'required|array',
            'product_ids.*'    => 'exists:products,id',
            'discount_type'    => 'required|in:percent,amount',
            'discount_value'   => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'start_date'       => 'required|date',
            'end_date'         => 'required|date|after:start_date',
            'is_active'        => 'sometimes|boolean',
        ]);

        if ($data['discount_type'] === 'percent' && $data['discount_value'] > 100) {
            return response()->json(['message' => 'Giảm giá % không được vượt quá 100%'], 422);
        }

        $promotion = Promotion::create($data);
        $promotion->products()->sync($request->product_ids);

        return new PromotionResource($promotion->load('products'));
    }

    public function update(Request $request, Promotion $promotion)
    {
        $data = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'product_ids'      => 'sometimes|array',
            'product_ids.*'    => 'exists:products,id',
            'discount_type'    => 'sometimes|in:percent,amount',
            'discount_value'   => 'sometimes|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'start_date'       => 'sometimes|date',
            'end_date'         => 'sometimes|date|after:start_date',
            'is_active'        => 'sometimes|boolean',
        ]);

        if (isset($data['discount_type']) && $data['discount_type'] === 'percent' 
            && isset($data['discount_value']) && $data['discount_value'] > 100) {
            return response()->json(['message' => 'Giảm giá % không được vượt quá 100%'], 422);
        }

        $promotion->update($data);
        if ($request->has('product_ids')) {
            $promotion->products()->sync($request->product_ids);
        }

        return new PromotionResource($promotion->load('products'));
    }

    public function destroy(Promotion $promotion)
    {
        $promotion->products()->detach();
        $promotion->delete();
        return response()->json(['message' => 'Đã xóa khuyến mãi']);
    }

    public function toggle(Promotion $promotion)
    {
        $promotion->update(['is_active' => !$promotion->is_active]);
        return new PromotionResource($promotion->load('products'));
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array']);
        $promotions = Promotion::whereIn('id', $request->ids)->get();
        foreach ($promotions as $p) {
            $p->products()->detach();
            $p->delete();
        }
        return response()->json(['message' => 'Đã xóa ' . count($request->ids) . ' khuyến mãi']);
    }
}
