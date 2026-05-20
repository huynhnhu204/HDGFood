<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'categories',
        'combos',
        'promotions',
        'vouchers',
        'banners',
        'post_topics',
        'tables',
        'reviews',
        'policies',
        'loyalty_reward_catalogs',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (! Schema::hasTable($table) || Schema::hasColumn($table, 'deleted_at')) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->softDeletes();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'deleted_at')) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropSoftDeletes();
            });
        }
    }
};
