<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('combo_products', function (Blueprint $table) {
            if (!Schema::hasColumn('combo_products', 'quantity')) {
                $table->unsignedInteger('quantity')->default(1)->after('product_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('combo_products', function (Blueprint $table) {
            if (Schema::hasColumn('combo_products', 'quantity')) {
                $table->dropColumn('quantity');
            }
        });
    }
};
