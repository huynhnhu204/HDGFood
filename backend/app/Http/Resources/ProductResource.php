<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    private function buildNutrition(): ?array
    {
        $data = [];
        if ($this->calories !== null) $data['kcal'] = (string) $this->calories;
        if ($this->protein  !== null) $data['protein'] = $this->protein . 'g';
        if ($this->fat      !== null) $data['fat'] = $this->fat . 'g';
        if ($this->carbs    !== null) $data['carbs'] = $this->carbs . 'g';
        if ($this->fiber    !== null) $data['fiber'] = $this->fiber . 'g';
        return empty($data) ? null : $data;
    }

    public function toArray(Request $request): array
    {        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'slug'           => $this->slug,
            'description'    => $this->description,
            'long_description' => $this->long_description,
            'price'          => (float) $this->price,
            'sale_price'     => $this->sale_price ? (float) $this->sale_price : null,
            'cost_price'     => $this->cost_price ? round((float) $this->cost_price, 2) : null,
            'profit_per_unit' => round($this->profit_per_unit, 2),
            'profit_margin'  => round($this->profit_margin, 1),
            'stock'          => $this->stock,
            'sold_count'     => $this->total_orders ?? 0,
            'image'          => $this->image,
            'is_active'      => $this->is_active,
            'is_featured'    => $this->is_featured,
            'is_available'   => $this->is_available,
            'available_time' => $this->available_time,
            'internal_note'  => $this->internal_note,
            'nutrition'      => $this->buildNutrition(),
            'health_score'   => $this->health_score ?? 0,
            'health_badges'  => $this->health_badges ? json_decode($this->health_badges, true) : [],
            'category'       => new CategoryResource($this->whenLoaded('category')),
            'images'         => $this->whenLoaded('images', fn() =>
                $this->images->map(fn($img) => [
                    'id' => $img->id,
                    'url' => $img->url,
                    'path' => $img->path,
                    'alt_text' => $img->alt_text,
                    'is_primary' => (bool) $img->is_primary,
                    'sort_order' => $img->sort_order,
                    'status' => $img->status,
                ])
            ),
            'extra_images'   => $this->whenLoaded('images', fn() =>
                $this->images->pluck('url')->values()
            ),
            'options'        => $this->whenLoaded('options', fn() =>
                $this->options->map(fn($opt) => [
                    'id'          => $opt->id,
                    'name'        => $opt->name,
                    'is_required' => $opt->is_required,
                    'values'      => $opt->values->map(fn($v) => [
                        'id'          => $v->id,
                        'label'       => $v->label,
                        'price_extra' => (float) $v->price_extra,
                    ]),
                ])
            ),
            'final_price'       => (float) $this->final_price,
            'active_promotion'  => $this->whenLoaded('activePromotion', function() {
                $promo = $this->activePromotion->first();
                if (!$promo || !$promo->isRunning()) return null;
                return [
                    'id'             => $promo->id,
                    'name'           => $promo->name,
                    'discount_type'  => $promo->discount_type,
                    'discount_value' => (float) $promo->discount_value,
                    'discount_label' => $promo->discount_type === 'percent'
                        ? "-{$promo->discount_value}%"
                        : '-' . number_format($promo->discount_value, 0, ',', '.') . '₫',
                ];
            }),
            'rating_avg'     => (float) round($this->reviews()->where('is_approved', true)->avg('rating') ?: 0, 1),
            'reviews_count'  => (int) $this->reviews()->where('is_approved', true)->count(),
        ];
    }
}
