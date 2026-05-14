<?php

namespace App\Console\Commands;

use App\Services\AutomationService;
use Illuminate\Console\Command;

class RunAutomationCampaignsCommand extends Command
{
    protected $signature = 'automation:run-campaigns';
    protected $description = 'Run email automation campaign rules';

    public function handle(AutomationService $automationService): int
    {
        $result = $automationService->run();
        $this->info('Automation run completed: ' . json_encode($result));
        return self::SUCCESS;
    }
}
