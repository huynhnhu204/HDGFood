<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'item_type'         => $this->item_type ?? 'product',
            'combo_id'          => $this->combo_id,
            'quantity'          => $this->quantity,
            'price'             => (float) $this->price,
            'price_formatted'   => number_format($this->price, 0, ',', '.') . '₫',
            'cost_price'        => $this->cost_price ? (float) $this->cost_price : null,
            'profit'            => $this->profit,
            // Tính subtotal ngay tại đây, không cần cột riêng trong DB
            'subtotal'          => (float) ($this->price * $this->quantity),
            'subtotal_formatted'=> number_format($this->price * $this->quantity, 0, ',', '.') . '₫',
            'options_snapshot'  => $this->options_snapshot,
            // Thông tin sản phẩm (chỉ xuất hiện khi được load)
            'product'           => new ProductResource($this->whenLoaded('product')),
            'combo'             => $this->whenLoaded('combo', function () {
                return $this->combo ? [
                    'id' => $this->combo->id,
                    'name' => $this->combo->name,
                    'image' => $this->combo->image,
                ] : null;
            }),
        ];
    }
}
