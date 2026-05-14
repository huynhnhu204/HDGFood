<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Combo extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'slug', 'description', 'image',
        'discount_type', 'discount_value',
        'base_price', 'final_price',
        'is_active', 'show_on_homepage', 'start_date', 'end_date',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'base_price'     => 'decimal:2',
        'final_price'    => 'decimal:2',
        'is_active'      => 'boolean',
        'show_on_homepage' => 'boolean',
        'start_date'     => 'datetime',
        'end_date'       => 'datetime',
    ];

    protected $appends = ['is_running', 'total_base_price', 'total_discount'];

    // Auto-generate slug
    public function setNameAttribute($value)
    {
        $this->attributes['name'] = $value;
        if (!isset($this->attributes['slug'])) {
            $this->attributes['slug'] = Str::slug($value);
        }
    }

    // Relationships
    public function groups()
    {
        return $this->hasMany(ComboGroup::class)->orderBy('sort_order');
    }

    public function activeGroups()
    {
        return $this->hasMany(ComboGroup::class)->orderBy('sort_order');
    }

    // Helper: get all groups with products loaded (for price calculation)
    public function getLoadedGroups()
    {
        // Use 'groups' relationship if loaded, otherwise use 'activeGroups'
        if ($this->relationLoaded('groups')) {
            return $this->groups;
        }
        if ($this->relationLoaded('activeGroups')) {
            return $this->activeGroups;
        }
        // Fallback: query
        return $this->activeGroups()->with('comboProducts.product')->get();
    }

    // Accessors
    public function getIsRunningAttribute(): bool
    {
        if (!$this->is_active) return false;

        $now = now();
        if ($this->start_date && $now->lt($this->start_date)) return false;
        if ($this->end_date && $now->gt($this->end_date)) return false;

        return true;
    }

    public function getTotalBasePriceAttribute(): float
    {
        $groups = $this->getLoadedGroups();
        $total = 0;
        foreach ($groups as $group) {
            foreach ($group->comboProducts as $cp) {
                $price = $cp->price_override ?? ($cp->product?->final_price ?? 0);
                $total += (float) $price * max(1, (int) ($cp->quantity ?? 1));
            }
        }
        return round($total, 2);
    }

    public function getTotalDiscountAttribute(): float
    {
        $base = (float) $this->base_price;
        if ($base <= 0) return 0;

        if ($this->discount_type === 'percent') {
            return round($base * ((float) $this->discount_value / 100), 2);
        }

        return round((float) $this->discount_value, 2);
    }

    // Auto-calculate final_price
    public function calculateFinalPrice(): float
    {
        // Always calculate from current product prices, not cached base_price
        $base = $this->totalBasePrice;
        if ($base <= 0) return 0;

        if ($this->discount_type === 'percent') {
            return round($base * (1 - (float) $this->discount_value / 100), 2);
        }
        return round(max(0, $base - (float) $this->discount_value), 2);
    }

    // Get base_price from products (dynamic, not cached)
    public function getDynamicBasePrice(): float
    {
        return $this->calculateBasePriceFromProducts();
    }

    // Get final_price from products (dynamic)
    public function getDynamicFinalPrice(): float
    {
        return $this->calculateFinalPrice();
    }

    // Calculate price for specific selections
    public function calculatePriceForSelections(array $selections): array
    {
        $items = [];
        $basePrice = 0;

        foreach ($selections as $selection) {
            $groupId = $selection['group_id'];
            $productIds = $selection['product_ids'] ?? [];

            $group = $this->groups->firstWhere('id', $groupId);
            if (!$group) continue;

            // Get products from _items (transformed in controller), comboProducts, or products relationship
            $products = $group->_items ?? $group->comboProducts ?? [];

            foreach ($productIds as $productId) {
                $cp = null;
                if (is_array($products)) {
                    $cp = collect($products)->firstWhere('product_id', $productId);
                } else {
                    $cp = $products->firstWhere('product_id', $productId);
                }

                if ($cp) {
                    $effectivePrice = (float) ($cp['effective_price'] ?? $cp->effective_price ?? 0);
                    $basePrice += $effectivePrice;
                    $items[] = [
                        'product_id'      => $productId,
                        'name'            => $cp['name'] ?? $cp->name ?? '',
                        'effective_price' => $effectivePrice,
                        'quantity'        => max(1, (int) ($cp['quantity'] ?? $cp->quantity ?? 1)),
                    ];
                }
            }
        }

        $discountAmount = 0;
        $finalPrice = $basePrice;

        if ($this->discount_type === 'percent') {
            $discountAmount = round($basePrice * ((float) $this->discount_value / 100), 2);
            $finalPrice = round($basePrice - $discountAmount, 2);
        } else {
            $discountAmount = round((float) $this->discount_value, 2);
            $finalPrice = round(max(0, $basePrice - $discountAmount), 2);
        }

        return [
            'combo_id'        => $this->id,
            'items'          => $items,
            'base_price'     => round($basePrice, 2),
            'discount_amount'=> $discountAmount,
            'final_price'    => $finalPrice,
        ];
    }

    public static function boot()
    {
        parent::boot();

        static::saving(function ($combo) {
            $combo->base_price = $combo->calculateBasePriceFromProducts();
            $combo->final_price = $combo->calculateFinalPrice();
        });
    }

    public function calculateBasePriceFromProducts(): float
    {
        $groups = $this->getLoadedGroups();
        $total = 0;
        foreach ($groups as $group) {
            foreach ($group->comboProducts as $cp) {
                $price = $cp->price_override ?? ($cp->product?->final_price ?? 0);
                $total += (float) $price * max(1, (int) ($cp->quantity ?? 1));
            }
        }
        return round($total, 2);
    }
}