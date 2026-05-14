<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AutomationCampaignLog;
use App\Services\AutomationService;
use Illuminate\Http\Request;

class AutomationController extends Controller
{
    public function __construct(private AutomationService $automationService)
    {
    }

    public function rules()
    {
        return response()->json(['data' => $this->automationService->getRules()]);
    }

    public function updateRule(Request $request)
    {
        $data = $request->validate([
            'rule' => 'required|in:cart_abandoned,inactive_user,reorder_reminder,loyalty_eligible_reward',
            'enabled' => 'required|boolean',
        ]);

        $this->automationService->setRuleEnabled($data['rule'], $data['enabled']);
        return response()->json(['message' => 'Cập nhật rule thành công.']);
    }

    public function logs(Request $request)
    {
        $items = AutomationCampaignLog::with('user:id,name,email')
            ->when($request->filled('campaign_type'), fn($q) => $q->where('campaign_type', $request->campaign_type))
            ->latest()
            ->paginate(min((int) $request->get('per_page', 20), 100));

        return response()->json($items);
    }

    public function runNow()
    {
        $result = $this->automationService->run();
        return response()->json([
            'message' => 'Đã chạy automation campaign.',
            'data' => $result,
        ]);
    }
}
