<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'item_type')) {
                $table->string('item_type', 20)->default('product')->after('order_id');
            }
            if (!Schema::hasColumn('order_items', 'combo_id')) {
                $table->unsignedBigInteger('combo_id')->nullable()->after('product_id');
                $table->index('combo_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'combo_id')) {
                $table->dropIndex(['combo_id']);
                $table->dropColumn('combo_id');
            }
            if (Schema::hasColumn('order_items', 'item_type')) {
                $table->dropColumn('item_type');
            }
        });
    }
};
