<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CancelRejectReason extends Model
{
    protected $primaryKey = 'code';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'code',
        'label',
        'allowed_status',
    ];
}

