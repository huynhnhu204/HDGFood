<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('combo_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('combo_group_id')->constrained('combo_groups')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->decimal('price_override', 10, 2)->nullable()->comment('Gia rieng cho san pham trong combo, null = dung gia san pham');
            $table->timestamps();

            $table->index('combo_group_id');
            $table->index('product_id');
            $table->unique(['combo_group_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combo_products');
    }
};