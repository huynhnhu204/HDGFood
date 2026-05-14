<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('combo_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('combo_id')->constrained('combos')->onDelete('cascade');
            $table->string('name');
            $table->string('description')->nullable();
            $table->integer('min_required')->default(1);
            $table->integer('max_required')->default(1);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('combo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combo_groups');
    }
};