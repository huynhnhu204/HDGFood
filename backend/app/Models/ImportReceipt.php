<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportReceipt extends Model
{
    protected $fillable = ['code', 'user_id', 'supplier', 'total_amount', 'note', 'imported_at', 'status'];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'imported_at'  => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(ImportReceiptItem::class);
    }
}
