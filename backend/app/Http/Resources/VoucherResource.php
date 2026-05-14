<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VoucherResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'code'              => $this->code,
            'name'              => $this->name,
            'description'       => $this->description,
            'discount_type'     => $this->discount_type,
            'discount_value'    => (float) $this->discount_value,
            'discount_label'    => $this->discount_type === 'percent' 
                                   ? "-{$this->discount_value}%" 
                                   : "-" . number_format($this->discount_value, 0, ',', '.') . '₫',
            'max_discount'      => $this->max_discount ? (float) $this->max_discount : null,
            'min_order_amount'  => $this->min_order_amount ? (float) $this->min_order_amount : null,
            'apply_to'          => $this->apply_to,
            'usage_limit'       => $this->usage_limit,
            'usage_per_user'    => $this->usage_per_user,
            'used_count'        => $this->used_count,
            'remaining'         => $this->usage_limit ? max(0, $this->usage_limit - $this->used_count) : null,
            'start_date'        => $this->start_date->format('Y-m-d H:i:s'),
            'end_date'          => $this->end_date->format('Y-m-d H:i:s'),
            'tier_restriction'  => $this->tier_restriction,
            'is_active'         => $this->is_active,
            'is_valid'          => $this->isValid(),
            'products'          => ProductResource::collection($this->whenLoaded('products')),
            'created_at'        => $this->created_at->format('d/m/Y H:i'),
            'updated_at'        => $this->updated_at->format('d/m/Y H:i'),
        ];
    }
}
