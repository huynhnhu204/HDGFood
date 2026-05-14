<?php

namespace App\Services;

use App\Models\Product;

class WeightedAverageCostService
{
    /**
     * Tính toán và cập nhật giá vốn bình quân khi nhập hàng
     * 
     * @param Product $product
     * @param int $importQuantity
     * @param float $importPrice
     * @return float New cost price
     */
    public function calculateCostPrice(Product $product, int $importQuantity, float $importPrice): float
    {
        $currentStock = $product->stock;
        $currentCostPrice = $product->cost_price ?? 0;

        // Nếu tồn kho = 0, giá vốn mới = giá nhập
        if ($currentStock == 0) {
            return round($importPrice, 2);
        }

        // Công thức: (Tồn cũ × Giá cũ + Nhập mới × Giá nhập) / Tổng tồn
        $totalValue = ($currentStock * $currentCostPrice) + ($importQuantity * $importPrice);
        $totalStock = $currentStock + $importQuantity;

        return round($totalValue / $totalStock, 2);
    }

    /**
     * Tính toán lại giá vốn khi hủy phiếu nhập
     * 
     * @param Product $product
     * @param int $returnQuantity
     * @param float $returnPrice
     * @return float|null New cost price (null if stock becomes 0)
     */
    public function recalculateCostPriceOnReturn(
        Product $product, 
        int $returnQuantity, 
        float $returnPrice
    ): ?float {
        $currentStock = $product->stock;
        $currentCostPrice = $product->cost_price ?? 0;

        // Nếu trả hết hàng, cost_price = 0
        if ($currentStock <= $returnQuantity) {
            return 0;
        }

        // Tính lại: (Tổng giá trị hiện tại - Giá trị trả) / Tồn còn lại
        $currentTotalValue = $currentStock * $currentCostPrice;
        $returnValue = $returnQuantity * $returnPrice;
        $remainingStock = $currentStock - $returnQuantity;

        return round(($currentTotalValue - $returnValue) / $remainingStock, 2);
    }
}
