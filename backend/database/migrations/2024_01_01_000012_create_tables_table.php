<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tables', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->integer('capacity')->default(2);
            $table->string('area')->nullable();
            $table->enum('status', ['available', 'occupied', 'reserved'])->default('available');
            $table->unsignedBigInteger('current_order_id')->nullable();
            $table->timestamps();
            $table->foreign('current_order_id')->references('id')->on('orders')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tables');
    }
};
