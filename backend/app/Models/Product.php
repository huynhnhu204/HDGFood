<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'category_id', 'name', 'slug', 'description', 'long_description',
        'price', 'sale_price', 'cost_price', 'stock', 'sku', 'image', 'is_active',
        'is_featured', 'is_available', 'available_time', 'internal_note', 'sold_count',
        'calories', 'protein', 'carbs', 'fat', 'fiber', 'health_score', 'health_badges',
    ];

    protected $casts = [
        'price'        => 'decimal:2',
        'sale_price'   => 'decimal:2',
        'cost_price'   => 'decimal:2',
        'is_active'    => 'boolean',
        'is_featured'  => 'boolean',
        'calories'     => 'decimal:2',
        'protein'      => 'decimal:2',
        'carbs'        => 'decimal:2',
        'fat'          => 'decimal:2',
        'fiber'        => 'decimal:2',
    ];

    protected $appends = ['final_price'];

    /**
     * Accessor: Giá cuối cùng sau khi áp dụng khuyến mãi (đang active).
     * Nếu không có promotion đang chạy → trả về giá gốc.
     */
    public function getFinalPriceAttribute(): float
    {
        $promoRelation = $this->activePromotion;
        $promo = ($promoRelation instanceof \Illuminate\Database\Eloquent\Collection) 
            ? $promoRelation->first() 
            : $this->activePromotion()->first();

        if (!$promo || !$promo->isRunning()) {
            return (float) $this->price;
        }

        if ($promo->discount_type === 'percent') {
            return round((float) $this->price * (1 - $promo->discount_value / 100), 2);
        }

        return max(0, (float) $this->price - (float) $promo->discount_value);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class)
            ->where('status', 'active')
            ->orderByDesc('is_primary')
            ->orderBy('sort_order');
    }

    public function options()
    {
        return $this->hasMany(ProductOption::class)->with('values');
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function inventoryLogs()
    {
        return $this->hasMany(InventoryLog::class)->latest();
    }

    public function promotions()
    {
        return $this->belongsToMany(Promotion::class, 'promotion_product');
    }

    public function activePromotion()
    {
        return $this->belongsToMany(Promotion::class, 'promotion_product')
            ->where('promotions.is_active', true)
            ->where('promotions.start_date', '<=', now())
            ->where('promotions.end_date', '>=', now())
            ->latest('promotions.created_at');
    }

    public function vouchers()
    {
        return $this->belongsToMany(Voucher::class, 'voucher_products');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /* Meta for ratings */
    public function getRatingAverageAttribute()
    {
        return round($this->reviews()->where('is_approved', true)->avg('rating') ?: 0, 1);
    }

    public function getReviewsCountAttribute()
    {
        return $this->reviews()->where('is_approved', true)->count();
    }

    /**
     * Accessor: Lợi nhuận trên một đơn vị
     */
    public function getProfitPerUnitAttribute(): float
    {
        if (!$this->cost_price) return 0;
        return (float) $this->price - (float) $this->cost_price;
    }

    /**
     * Accessor: Tỷ suất lợi nhuận (%)
     */
    public function getProfitMarginAttribute(): float
    {
        if (!$this->price || $this->price == 0) return 0;
        if (!$this->cost_price) return 0;
        return (($this->price - $this->cost_price) / $this->price) * 100;
    }
}
