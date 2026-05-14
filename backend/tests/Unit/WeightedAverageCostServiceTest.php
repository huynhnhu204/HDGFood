<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Services\WeightedAverageCostService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Unit Tests for WeightedAverageCostService
 * 
 * Tests specific edge cases and scenarios for the weighted average cost calculation.
 * 
 * **Validates: Requirements 2.4, 10.2, 10.3, 10.4**
 */
class WeightedAverageCostServiceTest extends TestCase
{
    use RefreshDatabase;

    protected WeightedAverageCostService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new WeightedAverageCostService();
    }

    // ========================================
    // calculateCostPrice() Tests
    // ========================================

    /** @test */
    public function it_handles_decimal_precision_correctly()
    {
        // Test with prices that have many decimal places
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 12.345, // 3 decimal places
        ]);

        $result = $this->service->calculateCostPrice(
            $product,
            5,
            15.678 // 3 decimal places
        );

        // Expected: (10 * 12.345 + 5 * 15.678) / 15 = 13.456
        // Should be rounded to 2 decimal places: 13.46
        $this->assertEquals(13.46, $result);
        
        // Verify it's exactly 2 decimal places
        $this->assertMatchesRegularExpression('/^\d+\.\d{2}$/', number_format($result, 2, '.', ''));
    }

    /** @test */
    public function it_rounds_to_two_decimal_places()
    {
        $product = Product::factory()->create([
            'stock' => 3,
            'cost_price' => 10.00,
        ]);

        // This should result in 10.003333... which rounds to 10.00
        $result = $this->service->calculateCostPrice($product, 1, 10.01);
        
        $this->assertEquals(10.00, $result);
    }

    /** @test */
    public function it_rounds_up_correctly()
    {
        $product = Product::factory()->create([
            'stock' => 1,
            'cost_price' => 10.00,
        ]);

        // (1 * 10.00 + 1 * 10.01) / 2 = 10.005 -> should round to 10.01
        $result = $this->service->calculateCostPrice($product, 1, 10.01);
        
        $this->assertEquals(10.01, $result);
    }

    /** @test */
    public function it_rounds_down_correctly()
    {
        $product = Product::factory()->create([
            'stock' => 1,
            'cost_price' => 10.00,
        ]);

        // (1 * 10.00 + 1 * 10.00) / 2 = 10.00 -> should stay 10.00
        $result = $this->service->calculateCostPrice($product, 1, 10.00);
        
        $this->assertEquals(10.00, $result);
    }

    /** @test */
    public function it_handles_very_small_decimal_values()
    {
        $product = Product::factory()->create([
            'stock' => 1000,
            'cost_price' => 0.01,
        ]);

        $result = $this->service->calculateCostPrice($product, 1, 0.01);
        
        // (1000 * 0.01 + 1 * 0.01) / 1001 = 0.01
        $this->assertEquals(0.01, $result);
    }

    /** @test */
    public function it_handles_large_numbers()
    {
        $product = Product::factory()->create([
            'stock' => 10000,
            'cost_price' => 999.99,
        ]);

        $result = $this->service->calculateCostPrice($product, 5000, 1500.50);
        
        // (10000 * 999.99 + 5000 * 1500.50) / 15000 = 1166.83
        $this->assertEquals(1166.83, $result);
    }

    /** @test */
    public function it_handles_zero_cost_price_with_positive_stock()
    {
        // Edge case: product has stock but cost_price is 0 or null
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 0,
        ]);

        $result = $this->service->calculateCostPrice($product, 5, 20.00);
        
        // (10 * 0 + 5 * 20.00) / 15 = 6.67
        $this->assertEquals(6.67, $result);
    }

    /** @test */
    public function it_handles_null_cost_price_with_positive_stock()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => null,
        ]);

        $result = $this->service->calculateCostPrice($product, 5, 20.00);
        
        // (10 * 0 + 5 * 20.00) / 15 = 6.67
        $this->assertEquals(6.67, $result);
    }

    /** @test */
    public function it_returns_import_price_when_stock_is_zero()
    {
        $product = Product::factory()->create([
            'stock' => 0,
            'cost_price' => 50.00, // This should be ignored
        ]);

        $result = $this->service->calculateCostPrice($product, 10, 25.50);
        
        $this->assertEquals(25.50, $result);
    }

    /** @test */
    public function it_handles_single_unit_import_to_empty_stock()
    {
        $product = Product::factory()->create([
            'stock' => 0,
            'cost_price' => null,
        ]);

        $result = $this->service->calculateCostPrice($product, 1, 99.99);
        
        $this->assertEquals(99.99, $result);
    }

    // ========================================
    // recalculateCostPriceOnReturn() Tests
    // ========================================

    /** @test */
    public function it_returns_zero_when_returning_all_stock()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 50.00,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 10, 50.00);
        
        $this->assertEquals(0, $result);
    }

    /** @test */
    public function it_returns_zero_when_returning_more_than_stock()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 50.00,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 15, 50.00);
        
        $this->assertEquals(0, $result);
    }

    /** @test */
    public function it_recalculates_cost_price_when_returning_partial_stock()
    {
        $product = Product::factory()->create([
            'stock' => 100,
            'cost_price' => 50.00,
        ]);

        // Return 20 units at 40.00 each
        $result = $this->service->recalculateCostPriceOnReturn($product, 20, 40.00);
        
        // (100 * 50.00 - 20 * 40.00) / 80 = 52.50
        $this->assertEquals(52.50, $result);
    }

    /** @test */
    public function it_handles_decimal_precision_in_return_calculation()
    {
        $product = Product::factory()->create([
            'stock' => 15,
            'cost_price' => 12.345,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 5, 15.678);
        
        // (15 * 12.345 - 5 * 15.678) / 10 = 10.6785 -> rounds to 10.69 (PHP rounds 0.5 up)
        $this->assertEquals(10.69, $result);
    }

    /** @test */
    public function it_rounds_return_calculation_to_two_decimals()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 10.00,
        ]);

        // (10 * 10.00 - 3 * 10.01) / 7 = 9.9957... -> rounds to 10.00
        $result = $this->service->recalculateCostPriceOnReturn($product, 3, 10.01);
        
        $this->assertEquals(10.00, $result);
    }

    /** @test */
    public function it_handles_returning_single_unit()
    {
        $product = Product::factory()->create([
            'stock' => 2,
            'cost_price' => 50.00,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 1, 40.00);
        
        // (2 * 50.00 - 1 * 40.00) / 1 = 60.00
        $this->assertEquals(60.00, $result);
    }

    /** @test */
    public function it_handles_return_with_zero_cost_price()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 0,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 5, 20.00);
        
        // (10 * 0 - 5 * 20.00) / 5 = -20.00
        $this->assertEquals(-20.00, $result);
    }

    /** @test */
    public function it_handles_return_with_null_cost_price()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => null,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 5, 20.00);
        
        // (10 * 0 - 5 * 20.00) / 5 = -20.00
        $this->assertEquals(-20.00, $result);
    }

    /** @test */
    public function it_handles_return_with_higher_price_than_cost()
    {
        // Scenario: returning items that were imported at higher price
        $product = Product::factory()->create([
            'stock' => 100,
            'cost_price' => 50.00,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 10, 60.00);
        
        // (100 * 50.00 - 10 * 60.00) / 90 = 48.89
        $this->assertEquals(48.89, $result);
    }

    /** @test */
    public function it_handles_return_with_lower_price_than_cost()
    {
        // Scenario: returning items that were imported at lower price
        $product = Product::factory()->create([
            'stock' => 100,
            'cost_price' => 50.00,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 10, 40.00);
        
        // (100 * 50.00 - 10 * 40.00) / 90 = 51.11
        $this->assertEquals(51.11, $result);
    }

    /** @test */
    public function it_handles_large_numbers_in_return_calculation()
    {
        $product = Product::factory()->create([
            'stock' => 15000,
            'cost_price' => 1166.83,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 5000, 1500.50);
        
        // (15000 * 1166.83 - 5000 * 1500.50) / 10000 = 1000.00
        $this->assertEquals(1000.00, $result);
    }

    /** @test */
    public function it_handles_very_small_remaining_stock()
    {
        $product = Product::factory()->create([
            'stock' => 2,
            'cost_price' => 100.00,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 1, 50.00);
        
        // (2 * 100.00 - 1 * 50.00) / 1 = 150.00
        $this->assertEquals(150.00, $result);
    }

    /** @test */
    public function it_handles_exact_stock_match_in_return()
    {
        // Edge case: returning exactly the current stock
        $product = Product::factory()->create([
            'stock' => 50,
            'cost_price' => 75.00,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 50, 75.00);
        
        $this->assertEquals(0, $result);
    }

    /** @test */
    public function it_handles_complex_decimal_return_scenario()
    {
        $product = Product::factory()->create([
            'stock' => 123,
            'cost_price' => 45.67,
        ]);

        $result = $this->service->recalculateCostPriceOnReturn($product, 23, 38.92);
        
        // (123 * 45.67 - 23 * 38.92) / 100 = 47.2225 -> rounds to 47.22
        $this->assertEquals(47.22, $result);
    }
}
