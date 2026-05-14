<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'item_type',
        'product_id',
        'combo_id',
        'quantity',
        'price',
        'cost_price',
        'options_snapshot',
    ];

    protected $casts = [
        'price'            => 'decimal:2',
        'cost_price'       => 'decimal:2',
        'options_snapshot' => 'array',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function combo()
    {
        return $this->belongsTo(Combo::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Accessor: Lợi nhuận của item này
     */
    public function getProfitAttribute(): float
    {
        if (!$this->cost_price) return 0;
        return ((float) $this->price - (float) $this->cost_price) * $this->quantity;
    }
}
