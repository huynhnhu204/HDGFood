<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportReceiptItem extends Model
{
    protected $fillable = ['import_receipt_id', 'product_id', 'quantity', 'import_price', 'subtotal'];

    protected $casts = [
        'import_price' => 'decimal:2',
        'subtotal'     => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function importReceipt()
    {
        return $this->belongsTo(ImportReceipt::class);
    }
}
