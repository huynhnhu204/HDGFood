<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('import_receipt_items', function (Blueprint $table) {
            $table->renameColumn('unit_price', 'import_price');
            $table->renameColumn('total_price', 'subtotal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('import_receipt_items', function (Blueprint $table) {
            $table->renameColumn('import_price', 'unit_price');
            $table->renameColumn('subtotal', 'total_price');
        });
    }
};
