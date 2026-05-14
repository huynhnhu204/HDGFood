<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = [
        'user_id', 'product_id', 'rating', 'content', 'reply', 'images', 'is_approved', 'likes', 'is_featured', 'is_bought'
    ];

    protected $casts = [
        'images'      => 'array',
        'is_approved' => 'boolean',
        'is_featured' => 'boolean',
        'is_bought'   => 'boolean',
        'rating'      => 'integer',
        'likes'       => 'integer',
    ];

    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
