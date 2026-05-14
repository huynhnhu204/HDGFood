<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Table extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'capacity',
        'area',
        'status',
        'current_order_id',
        'session_token',
        'session_locked_at',
    ];

    public function currentOrder()
    {
        return $this->belongsTo(Order::class, 'current_order_id');
    }
}
