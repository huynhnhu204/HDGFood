<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComboGroup extends Model
{
    use HasFactory;

    protected $fillable = [
        'combo_id', 'name', 'description',
        'min_required', 'max_required', 'sort_order',
    ];

    protected $casts = [
        'min_required' => 'integer',
        'max_required' => 'integer',
        'sort_order'   => 'integer',
    ];

    // Relationships
    public function combo()
    {
        return $this->belongsTo(Combo::class);
    }

    public function comboProducts()
    {
        return $this->hasMany(ComboProduct::class);
    }

    public function products()
    {
        return $this->belongsToMany(
            Product::class,
            'combo_products',
            'combo_group_id',
            'product_id'
        )->withPivot('price_override')->withPivot('id');
    }
}