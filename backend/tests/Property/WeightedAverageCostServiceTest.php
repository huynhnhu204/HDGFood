<?php

namespace Tests\Property;

use App\Models\Product;
use App\Services\WeightedAverageCostService;
use Eris\Generator;
use Eris\TestTrait;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Property-Based Tests for WeightedAverageCostService
 * 
 * **Validates: Requirements 2.2, 2.4, 2.5**
 */
class WeightedAverageCostServiceTest extends TestCase
{
    use RefreshDatabase, TestTrait;

    protected WeightedAverageCostService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new WeightedAverageCostService();
    }

    /**
     * Property 1: Công Thức Giá Vốn Bình Quân Với Tồn Kho Dương
     * 
     * For any sản phẩm có tồn kho lớn hơn 0, khi nhập thêm hàng với số lượng 
     * và giá nhập bất kỳ, giá vốn mới phải được tính theo công thức: 
     * (tồn_cũ × giá_vốn_cũ + số_lượng_nhập × giá_nhập) / (tồn_cũ + số_lượng_nhập) 
     * và làm tròn đến 2 chữ số thập phân.
     * 
     * **Validates: Requirements 2.2, 2.4, 2.5**
     */
    #[\PHPUnit\Framework\Attributes\Test]
    public function property_weighted_average_formula_with_positive_stock()
    {
        $this->minimumEvaluationRatio(0.5);
        $this->limitTo(100);
        
        $this->forAll(
            Generator\choose(1, 1000),      // currentStock > 0
            Generator\choose(1, 10000),     // currentCostPrice (cents to avoid float issues)
            Generator\choose(1, 1000),      // importQuantity > 0
            Generator\choose(1, 10000)      // importPrice (cents)
        )
        ->then(function (
            int $currentStock,
            int $currentCostPriceCents,
            int $importQuantity,
            int $importPriceCents
        ) {
            // Convert cents to decimal for realistic prices
            $currentCostPrice = $currentCostPriceCents / 100;
            $importPrice = $importPriceCents / 100;

            // Create a product with current stock and cost_price
            $product = Product::factory()->create([
                'stock' => $currentStock,
                'cost_price' => $currentCostPrice,
            ]);

            // Calculate new cost price using the service
            $actualCostPrice = $this->service->calculateCostPrice(
                $product,
                $importQuantity,
                $importPrice
            );

            // Calculate expected cost price using the formula
            $totalValue = ($currentStock * $currentCostPrice) + ($importQuantity * $importPrice);
            $totalStock = $currentStock + $importQuantity;
            $expectedCostPrice = round($totalValue / $totalStock, 2);

            // Assert the formula is correct
            $this->assertEquals(
                $expectedCostPrice,
                $actualCostPrice,
                "Cost price calculation failed for: " .
                "stock={$currentStock}, cost={$currentCostPrice}, " .
                "import_qty={$importQuantity}, import_price={$importPrice}. " .
                "Expected: {$expectedCostPrice}, Got: {$actualCostPrice}"
            );

            // Assert rounding to 2 decimal places by formatting both values
            $formattedActual = number_format($actualCostPrice, 2, '.', '');
            $formattedExpected = number_format($expectedCostPrice, 2, '.', '');
            $this->assertEquals(
                $formattedExpected,
                $formattedActual,
                "Cost price must be rounded to 2 decimal places"
            );
        });
    }

    /**
     * Property 2: Giá Vốn Khi Tồn Kho Bằng Không
     * 
     * For any sản phẩm có tồn kho bằng 0, khi nhập hàng lần đầu với giá nhập 
     * bất kỳ, giá vốn mới phải bằng chính giá nhập đó.
     * 
     * **Validates: Requirements 2.3**
     */
    #[\PHPUnit\Framework\Attributes\Test]
    public function property_cost_price_equals_import_price_when_stock_is_zero()
    {
        $this->minimumEvaluationRatio(0.5);
        $this->limitTo(100);
        
        $this->forAll(
            Generator\choose(1, 10000)      // importPrice (cents)
        )
        ->then(function (int $importPriceCents) {
            // Convert cents to decimal for realistic prices
            $importPrice = $importPriceCents / 100;

            // Create a product with zero stock
            $product = Product::factory()->create([
                'stock' => 0,
                'cost_price' => null,  // or 0, doesn't matter when stock is 0
            ]);

            // Any import quantity > 0
            $importQuantity = rand(1, 1000);

            // Calculate new cost price using the service
            $actualCostPrice = $this->service->calculateCostPrice(
                $product,
                $importQuantity,
                $importPrice
            );

            // Expected: cost price should equal import price (rounded to 2 decimals)
            $expectedCostPrice = round($importPrice, 2);

            // Assert the cost price equals the import price
            $this->assertEquals(
                $expectedCostPrice,
                $actualCostPrice,
                "When stock is 0, cost price should equal import price. " .
                "Import price: {$importPrice}, Expected: {$expectedCostPrice}, Got: {$actualCostPrice}"
            );

            // Assert rounding to 2 decimal places
            $formattedActual = number_format($actualCostPrice, 2, '.', '');
            $formattedExpected = number_format($expectedCostPrice, 2, '.', '');
            $this->assertEquals(
                $formattedExpected,
                $formattedActual,
                "Cost price must be rounded to 2 decimal places"
            );
        });
    }
}
