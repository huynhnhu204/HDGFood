<?php

namespace App\Http\Controllers;

use App\Models\LoyaltyPointTransaction;
use App\Models\LoyaltyRewardCatalog;
use App\Services\LoyaltyService;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function __construct(private LoyaltyService $loyaltyService)
    {
    }

    public function summary(Request $request)
    {
        return response()->json([
            'data' => $this->loyaltyService->getPointsSummary($request->user()),
        ]);
    }

    public function transactions(Request $request)
    {
        $items = LoyaltyPointTransaction::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(min((int) $request->get('per_page', 15), 100));

        return response()->json($items);
    }

    public function rewards(Request $request)
    {
        $items = LoyaltyRewardCatalog::where('is_active', true)
            ->orderBy('points_cost')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function redeem(Request $request)
    {
        $data = $request->validate([
            'reward_catalog_id' => 'required|exists:loyalty_reward_catalogs,id',
        ]);

        $reward = LoyaltyRewardCatalog::findOrFail($data['reward_catalog_id']);
        $redemption = $this->loyaltyService->redeemReward($request->user(), $reward);
        $redemption->load(['voucher', 'rewardCatalog']);

        return response()->json([
            'message' => 'Đổi quà thành công.',
            'data' => $redemption,
            'summary' => $this->loyaltyService->getPointsSummary($request->user()),
        ]);
    }
}
