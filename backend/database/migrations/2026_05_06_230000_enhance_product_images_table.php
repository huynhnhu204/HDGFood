<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->string('path')->nullable()->after('url');
            $table->string('alt_text')->nullable()->after('path');
            $table->boolean('is_primary')->default(false)->after('alt_text');
            $table->string('status', 20)->default('active')->after('is_primary');

            $table->index(['product_id', 'sort_order'], 'product_images_product_sort_idx');
            $table->index(['product_id', 'is_primary'], 'product_images_product_primary_idx');
            $table->index('status', 'product_images_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->dropIndex('product_images_product_sort_idx');
            $table->dropIndex('product_images_product_primary_idx');
            $table->dropIndex('product_images_status_idx');

            $table->dropColumn(['path', 'alt_text', 'is_primary', 'status']);
        });
    }
};
