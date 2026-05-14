<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductOptionValue extends Model
{
    protected $fillable = ['product_option_id', 'label', 'price_extra'];

    protected $casts = ['price_extra' => 'decimal:2'];

    public function option()
    {
        return $this->belongsTo(ProductOption::class, 'product_option_id');
    }
}
