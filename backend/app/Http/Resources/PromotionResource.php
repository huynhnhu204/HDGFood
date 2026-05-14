<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PromotionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'products'          => ProductResource::collection($this->whenLoaded('products')),
            'discount_type'     => $this->discount_type,
            'discount_value'    => (float) $this->discount_value,
            'discount_label'    => $this->discount_type === 'percent' 
                                   ? "-{$this->discount_value}%" 
                                   : "-" . number_format($this->discount_value, 0, ',', '.') . '₫',
            'min_order_amount'  => $this->min_order_amount ? (float) $this->min_order_amount : null,
            'start_date'        => $this->start_date->format('Y-m-d H:i:s'),
            'end_date'          => $this->end_date->format('Y-m-d H:i:s'),
            'is_active'         => $this->is_active,
            'is_running'        => $this->isRunning(),
            'status'            => $this->isRunning() ? 'running' : 'expired',
            'created_at'        => $this->created_at->format('d/m/Y H:i'),
            'updated_at'        => $this->updated_at->format('d/m/Y H:i'),
        ];
    }
}
