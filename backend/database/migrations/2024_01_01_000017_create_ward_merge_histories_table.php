<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ward_merge_histories', function (Blueprint $table) {
            $table->id();
            $table->string('old_ward_code', 50);
            $table->string('new_ward_code', 50);
            $table->date('merge_date');
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['old_ward_code', 'new_ward_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ward_merge_histories');
    }
};
