<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Review;

class CleanupInvalidReviews extends Command
{
    protected $signature = 'reviews:cleanup';
    protected $description = 'Delete reviews with NULL data';

    public function handle()
    {
        $this->info('Cleaning up invalid reviews...');
        
        // Delete reviews where essential fields are NULL
        $count = Review::whereNull('user_id')
            ->orWhereNull('product_id')
            ->orWhereNull('rating')
            ->delete();
        
        $this->info("Deleted {$count} invalid reviews.");
        $this->info('Done!');
        
        return 0;
    }
}
