<?php

namespace Tests\Property;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OmsService;
use Eris\Generator;
use Eris\TestTrait;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Property-Based Tests for Cost Price Snapshot
 * 
 * **Validates: Requirements 3.1, 3.3, 3.4**
 */
class CostPriceSnapshotTest extends TestCase
{
    use RefreshDatabase, TestTrait;

    protected OmsService $omsService;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->omsService = new OmsService();
        
        // Create a regular user for order creation
        $this->user = User::factory()->create([
            'role' => 'user',
        ]);
    }

    /**
     * Property 3: Snapshot Giá Vốn Khi Bán Hàng
     * 
     * For any đơn hàng được tạo, giá vốn (cost_price) được lưu trong order_items 
     * phải bằng với giá vốn hiện tại của sản phẩm tại thời điểm tạo đơn, và không 
     * thay đổi ngay cả khi giá vốn của sản phẩm thay đổi sau đó.
     * 
     * **Validates: Requirements 3.1, 3.3, 3.4**
     */
    #[\PHPUnit\Framework\Attributes\Test]
    public function property_cost_price_snapshot_is_preserved_when_creating_order()
    {
        $this->minimumEvaluationRatio(0.5);
        $this->limitTo(100);
        
        $this->forAll(
            Generator\choose(1, 10000),     // initialCostPrice (cents)
            Generator\choose(1, 1000),      // initialStock
            Generator\choose(1, 100),       // orderQuantity
            Generator\choose(1, 10000)      // newCostPrice (cents) - for after order creation
        )
        ->then(function (
            int $initialCostPriceCents,
            int $initialStock,
            int $orderQuantity,
            int $newCostPriceCents
        ) {
            // Convert cents to decimal for realistic prices
            $initialCostPrice = $initialCostPriceCents / 100;
            $newCostPrice = $newCostPriceCents / 100;
            
            // Ensure we have enough stock for the order
            $stock = max($initialStock, $orderQuantity + 10);
            
            // Create a product with initial cost_price and stock
            // Note: We need to ensure the product doesn't trigger promotion queries
            // by using a simple factory without relationships
            $product = Product::factory()->create([
                'stock' => $stock,
                'cost_price' => $initialCostPrice,
                'price' => $initialCostPrice * 2, // Ensure price > cost_price
                'is_active' => true,
            ]);

            // Record the cost_price at the time of order creation
            $costPriceAtOrderTime = $product->fresh()->cost_price;

            // Create an order with this product
            $orderData = [
                'customer_name' => 'Test Customer',
                'customer_phone' => '0123456789',
                'payment_method' => 'cash',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => $orderQuantity,
                    ]
                ]
            ];

            $order = $this->omsService->createOrder($orderData, $this->user);

            // Reload order with items
            $order = Order::with('items')->find($order->id);
            
            // Assert: The order_item's cost_price should equal the product's cost_price at order time
            $orderItem = $order->items->first();
            $this->assertNotNull($orderItem, "Order should have at least one item");
            
            $this->assertEquals(
                round($costPriceAtOrderTime, 2),
                round($orderItem->cost_price, 2),
                "Order item cost_price should equal product cost_price at order creation time. " .
                "Expected: {$costPriceAtOrderTime}, Got: {$orderItem->cost_price}"
            );

            // Now change the product's cost_price (simulate a new import receipt)
            $product->update(['cost_price' => $newCostPrice]);

            // Reload the order item from database
            $orderItem = $orderItem->fresh();

            // Assert: The order_item's cost_price should NOT change
            $this->assertEquals(
                round($costPriceAtOrderTime, 2),
                round($orderItem->cost_price, 2),
                "Order item cost_price should remain unchanged even after product cost_price changes. " .
                "Original: {$costPriceAtOrderTime}, Current order_item: {$orderItem->cost_price}, " .
                "New product cost_price: {$newCostPrice}"
            );

            // Assert: The product's cost_price should be the new value
            $product = $product->fresh();
            $this->assertEquals(
                round($newCostPrice, 2),
                round($product->cost_price, 2),
                "Product cost_price should be updated to new value"
            );

            // Assert: cost_price is stored with 2 decimal places
            $formattedCostPrice = number_format($orderItem->cost_price, 2, '.', '');
            $this->assertEquals(
                $formattedCostPrice,
                (string) $orderItem->cost_price,
                "Cost price must be stored with 2 decimal places"
            );
        });
    }

    /**
     * Additional test: Verify cost_price snapshot with multiple products
     * 
     * This test ensures that when an order contains multiple products, each 
     * product's cost_price is correctly snapshotted independently.
     */
    #[\PHPUnit\Framework\Attributes\Test]
    public function property_cost_price_snapshot_works_for_multiple_products()
    {
        $this->minimumEvaluationRatio(0.5);
        $this->limitTo(100);
        
        $this->forAll(
            Generator\choose(1, 5000),      // costPrice1 (cents)
            Generator\choose(1, 5000),      // costPrice2 (cents)
            Generator\choose(1, 50),        // quantity1
            Generator\choose(1, 50)         // quantity2
        )
        ->then(function (
            int $costPrice1Cents,
            int $costPrice2Cents,
            int $quantity1,
            int $quantity2
        ) {
            // Convert cents to decimal
            $costPrice1 = $costPrice1Cents / 100;
            $costPrice2 = $costPrice2Cents / 100;
            
            // Create two products with different cost prices
            $product1 = Product::factory()->create([
                'stock' => $quantity1 + 10,
                'cost_price' => $costPrice1,
                'price' => $costPrice1 * 2,
            ]);

            $product2 = Product::factory()->create([
                'stock' => $quantity2 + 10,
                'cost_price' => $costPrice2,
                'price' => $costPrice2 * 2,
            ]);

            // Record cost prices at order time
            $costPrice1AtOrderTime = $product1->fresh()->cost_price;
            $costPrice2AtOrderTime = $product2->fresh()->cost_price;

            // Create an order with both products
            $orderData = [
                'customer_name' => 'Test Customer',
                'customer_phone' => '0123456789',
                'payment_method' => 'cash',
                'items' => [
                    [
                        'product_id' => $product1->id,
                        'quantity' => $quantity1,
                    ],
                    [
                        'product_id' => $product2->id,
                        'quantity' => $quantity2,
                    ]
                ]
            ];

            $order = $this->omsService->createOrder($orderData, $this->user);

            // Reload order with items
            $order = Order::with('items')->find($order->id);
            
            // Assert: Each order_item should have the correct cost_price snapshot
            $this->assertCount(2, $order->items, "Order should have 2 items");

            $orderItem1 = $order->items->where('product_id', $product1->id)->first();
            $orderItem2 = $order->items->where('product_id', $product2->id)->first();

            $this->assertEquals(
                round($costPrice1AtOrderTime, 2),
                round($orderItem1->cost_price, 2),
                "Product 1 order item cost_price should match snapshot"
            );

            $this->assertEquals(
                round($costPrice2AtOrderTime, 2),
                round($orderItem2->cost_price, 2),
                "Product 2 order item cost_price should match snapshot"
            );

            // Change both products' cost prices
            $product1->update(['cost_price' => $costPrice1 * 1.5]);
            $product2->update(['cost_price' => $costPrice2 * 0.8]);

            // Reload order items
            $orderItem1 = $orderItem1->fresh();
            $orderItem2 = $orderItem2->fresh();

            // Assert: Order items' cost_prices should remain unchanged
            $this->assertEquals(
                round($costPrice1AtOrderTime, 2),
                round($orderItem1->cost_price, 2),
                "Product 1 order item cost_price should remain unchanged"
            );

            $this->assertEquals(
                round($costPrice2AtOrderTime, 2),
                round($orderItem2->cost_price, 2),
                "Product 2 order item cost_price should remain unchanged"
            );
        });
    }
}
