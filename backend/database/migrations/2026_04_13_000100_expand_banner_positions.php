<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE banners
            MODIFY position ENUM(
                'slider',
                'home_center',
                'sidebar',
                'products',
                'combos',
                'promotions',
                'blog',
                'about',
                'contact',
                'global'
            ) NOT NULL DEFAULT 'slider'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE banners
            MODIFY position ENUM('slider', 'home_center', 'sidebar') NOT NULL DEFAULT 'slider'
        ");
    }
};
