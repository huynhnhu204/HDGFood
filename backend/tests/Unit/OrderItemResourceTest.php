<?php

namespace Tests\Unit;

use App\Http\Resources\OrderItemResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Test OrderItemResource formatting
 * Task 7.3: Validates that cost_price and profit are included in response
 * Validates: Requirements 4.1, 11.1
 */
class OrderItemResourceTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_includes_cost_price_and_profit_in_response()
    {
        // Create a user
        $user = User::factory()->create();

        // Create product with cost_price
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => 60.00,
            'stock' => 100,
        ]);

        // Create an order
        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD001',
            'total' => 200.00,
            'discount_amount' => 0,
            'final_total' => 200.00,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => 'cash',
            'shipping_fee' => 0,
        ]);

        // Create order item with cost_price
        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 100.00,
            'cost_price' => 60.00,
        ]);

        // Create resource
        $resource = new OrderItemResource($orderItem);
        $response = $resource->toArray(request());

        // Assert cost_price is present
        $this->assertArrayHasKey('cost_price', $response);
        
        // Assert profit is present
        $this->assertArrayHasKey('profit', $response);
        
        // Assert profit is calculated correctly: (100 - 60) * 2 = 80
        $this->assertEquals(80.00, $response['profit']);
    }

    /** @test */
    public function it_formats_cost_price_with_two_decimal_places()
    {
        // Create a user
        $user = User::factory()->create();

        // Create product with cost_price
        $product = Product::factory()->create([
            'price' => 99.99,
            'cost_price' => 66.666, // Will be rounded to 66.67
            'stock' => 100,
        ]);

        // Create an order
        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD002',
            'total' => 99.99,
            'discount_amount' => 0,
            'final_total' => 99.99,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => 'cash',
            'shipping_fee' => 0,
        ]);

        // Create order item
        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => 99.99,
            'cost_price' => 66.67,
        ]);

        // Create resource
        $resource = new OrderItemResource($orderItem);
        $response = $resource->toArray(request());

        // Assert cost_price is a float
        $this->assertIsFloat($response['cost_price']);
        
        // Verify the value (should be stored with 2 decimal places in DB)
        $this->assertEquals(66.67, $response['cost_price']);
    }

    /** @test */
    public function it_handles_null_cost_price_gracefully()
    {
        // Create a user
        $user = User::factory()->create();

        // Create product without cost_price
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => null,
            'stock' => 100,
        ]);

        // Create an order
        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD003',
            'total' => 100.00,
            'discount_amount' => 0,
            'final_total' => 100.00,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => 'cash',
            'shipping_fee' => 0,
        ]);

        // Create order item without cost_price
        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => 100.00,
            'cost_price' => null,
        ]);

        // Create resource
        $resource = new OrderItemResource($orderItem);
        $response = $resource->toArray(request());

        // When cost_price is null, it should return null
        $this->assertNull($response['cost_price']);
        
        // When cost_price is null, profit should be 0
        $this->assertEquals(0.00, $response['profit']);
    }

    /** @test */
    public function it_calculates_profit_correctly_for_multiple_quantities()
    {
        // Create a user
        $user = User::factory()->create();

        // Create product
        $product = Product::factory()->create([
            'price' => 150.00,
            'cost_price' => 90.00,
            'stock' => 100,
        ]);

        // Create an order
        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD004',
            'total' => 750.00,
            'discount_amount' => 0,
            'final_total' => 750.00,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => 'cash',
            'shipping_fee' => 0,
        ]);

        // Create order item with quantity 5
        $orderItem = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 5,
            'price' => 150.00,
            'cost_price' => 90.00,
        ]);

        // Create resource
        $resource = new OrderItemResource($orderItem);
        $response = $resource->toArray(request());

        // Assert profit is calculated correctly: (150 - 90) * 5 = 300
        $this->assertEquals(300.00, $response['profit']);
    }
}

