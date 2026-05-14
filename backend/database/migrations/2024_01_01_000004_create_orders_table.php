<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->decimal('total', 10, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('final_total', 10, 2);
            $table->enum('status', ['pending', 'confirmed', 'preparing', 'ready', 'serving', 'completed', 'cancelled'])->default('pending');
            $table->enum('payment_status', ['unpaid', 'paid', 'refunded'])->default('unpaid');
            $table->string('payment_method')->nullable();
            $table->text('shipping_address')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('promotion_id')->nullable();
            $table->unsignedBigInteger('voucher_id')->nullable();
            $table->string('voucher_code')->nullable();
            $table->string('delivery_name')->nullable();
            $table->string('delivery_phone')->nullable();
            $table->text('delivery_address')->nullable();
            $table->string('delivery_province_code', 50)->nullable();
            $table->string('delivery_district_code', 50)->nullable();
            $table->string('delivery_ward_code', 50)->nullable();
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->integer('quantity');
            $table->decimal('price', 10, 2);
            $table->json('options_snapshot')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};
