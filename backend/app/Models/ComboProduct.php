<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComboProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'combo_group_id', 'product_id', 'quantity', 'price_override',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'price_override' => 'decimal:2',
    ];

    // Relationships
    public function comboGroup()
    {
        return $this->belongsTo(ComboGroup::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Accessor: giá thực tế dùng trong combo
    public function getEffectivePriceAttribute(): float
    {
        if ($this->price_override !== null) {
            return (float) $this->price_override;
        }
        return (float) ($this->product?->final_price ?? 0);
    }
}