<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'slug'           => $this->slug,
            'description'    => $this->description ?? null,
            'image'          => $this->image,
            'is_active'      => $this->is_active ?? true,
            'sort_order'     => $this->sort_order ?? 0,
            'parent_id'      => $this->parent_id,
            'parent'         => $this->whenLoaded('parent', fn() => $this->parent ? ['id' => $this->parent->id, 'name' => $this->parent->name] : null),
            'products_count' => $this->products_count ?? 0,
            'products'       => $this->whenLoaded('products', fn() =>
                $this->products->map(fn($p) => [
                    'id'        => $p->id,
                    'name'      => $p->name,
                    'price'     => (float) $p->price,
                    'is_active' => $p->is_active,
                    'image'     => $p->image,
                    'stock'     => $p->stock,
                ])
            ),
        ];
    }
}
