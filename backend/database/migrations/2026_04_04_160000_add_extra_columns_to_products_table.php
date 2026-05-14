<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_available')) {
                $table->boolean('is_available')->default(true)->after('is_featured');
            }
            if (!Schema::hasColumn('products', 'available_time')) {
                $table->enum('available_time', ['all', 'morning', 'afternoon', 'evening'])->default('all')->after('is_available');
            }
            if (!Schema::hasColumn('products', 'internal_note')) {
                $table->text('internal_note')->nullable()->after('available_time');
            }
            if (!Schema::hasColumn('products', 'cost_price')) {
                $table->decimal('cost_price', 12, 2)->nullable()->after('sale_price');
            }
            if (!Schema::hasColumn('products', 'health_score')) {
                $table->unsignedTinyInteger('health_score')->default(0)->after('fiber');
            }
            if (!Schema::hasColumn('products', 'health_badges')) {
                $table->text('health_badges')->nullable()->after('health_score');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['is_available', 'available_time', 'internal_note', 'health_score', 'health_badges']);
        });
    }
};
