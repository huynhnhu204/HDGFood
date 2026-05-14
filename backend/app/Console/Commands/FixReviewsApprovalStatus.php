<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Review;

class FixReviewsApprovalStatus extends Command
{
    protected $signature = 'reviews:fix-approval';
    protected $description = 'Set all reviews to pending approval (is_approved = false)';

    public function handle()
    {
        $this->info('Updating reviews approval status...');
        
        $count = Review::where('is_approved', true)->update(['is_approved' => false]);
        
        $this->info("Updated {$count} reviews to pending approval.");
        $this->info('Done! Please refresh the admin page.');
        
        return 0;
    }
}
