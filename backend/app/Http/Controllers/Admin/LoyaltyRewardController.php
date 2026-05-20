<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyRewardCatalog;
use Illuminate\Http\Request;

use App\Http\Controllers\Concerns\AppliesAdminTrashIndex;

class LoyaltyRewardController extends Controller
{
    use AppliesAdminTrashIndex;

    public function index(Request $request)
    {
        $query = LoyaltyRewardCatalog::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%');
            });

        $this->applyAdminTrashIndexScope($query, $request);

        $items = $query->latest()
            ->paginate(min((int) $request->get('per_page', 20), 100));

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'points_cost' => 'required|integer|min:1',
            'voucher_amount' => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'voucher_valid_days' => 'required|integer|min:1|max:365',
            'monthly_limit' => 'nullable|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        $item = LoyaltyRewardCatalog::create($data);
        return response()->json(['data' => $item], 201);
    }

    public function show(LoyaltyRewardCatalog $loyaltyReward)
    {
        return response()->json(['data' => $loyaltyReward]);
    }

    public function update(Request $request, LoyaltyRewardCatalog $loyaltyReward)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'points_cost' => 'sometimes|integer|min:1',
            'voucher_amount' => 'sometimes|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'voucher_valid_days' => 'sometimes|integer|min:1|max:365',
            'monthly_limit' => 'nullable|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        $loyaltyReward->update($data);
        return response()->json(['data' => $loyaltyReward->fresh()]);
    }

    public function destroy(LoyaltyRewardCatalog $loyaltyReward)
    {
        $loyaltyReward->delete();
        return response()->json(['message' => 'Đã xóa reward catalog.']);
    }
}
