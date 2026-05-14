<?php

namespace Tests\Unit;

use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Test OrderResource formatting
 * Validates: Requirements 11.3, 11.4, 11.6
 */
class OrderResourceTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_includes_total_cost_and_total_profit_in_response()
    {
        // Create a user
        $user = User::factory()->create();

        // Create products with cost_price
        $product1 = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => 60.00,
            'stock' => 100,
        ]);

        $product2 = Product::factory()->create([
            'price' => 200.00,
            'cost_price' => 120.00,
            'stock' => 100,
        ]);

        // Create an order
        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD001',
            'total' => 500.00,
            'discount_amount' => 0,
            'final_total' => 500.00,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => 'cash',
            'shipping_fee' => 0,
        ]);

        // Create order items with cost_price
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product1->id,
            'quantity' => 2,
            'price' => 100.00,
            'cost_price' => 60.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product2->id,
            'quantity' => 1,
            'price' => 200.00,
            'cost_price' => 120.00,
        ]);

        // Load items relationship
        $order->load('items');

        // Create resource
        $resource = new OrderResource($order);
        $response = $resource->toArray(request());

        // Assert total_cost is present and correct
        $this->assertArrayHasKey('total_cost', $response);
        // Expected: (60 * 2) + (120 * 1) = 120 + 120 = 240
        $this->assertEquals(240.00, $response['total_cost']);

        // Assert total_profit is present and correct
        $this->assertArrayHasKey('total_profit', $response);
        // Expected: ((100-60) * 2) + ((200-120) * 1) = 80 + 80 = 160
        $this->assertEquals(160.00, $response['total_profit']);
    }

    /** @test */
    public function it_formats_total_cost_and_total_profit_with_two_decimal_places()
    {
        // Create a user
        $user = User::factory()->create();

        // Create product with cost_price that will result in non-round numbers
        $product = Product::factory()->create([
            'price' => 99.99,
            'cost_price' => 66.66,
            'stock' => 100,
        ]);

        // Create an order
        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD002',
            'total' => 299.97,
            'discount_amount' => 0,
            'final_total' => 299.97,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'payment_method' => 'cash',
            'shipping_fee' => 0,
        ]);

        // Create order item
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 3,
            'price' => 99.99,
            'cost_price' => 66.66,
        ]);

        // Load items relationship
        $order->load('items');

        // Create resource
        $resource = new OrderResource($order);
        $response = $resource->toArray(request());

        // Assert values are rounded to 2 decimal places
        // Expected total_cost: 66.66 * 3 = 199.98
        $this->assertEquals(199.98, $response['total_cost']);
        
        // Expected total_profit: (99.99 - 66.66) * 3 = 33.33 * 3 = 99.99
        $this->assertEquals(99.99, $response['total_profit']);

        // Verify they are numeric (float) not strings
        $this->assertIsFloat($response['total_cost']);
        $this->assertIsFloat($response['total_profit']);
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
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'price' => 100.00,
            'cost_price' => null,
        ]);

        // Load items relationship
        $order->load('items');

        // Create resource
        $resource = new OrderResource($order);
        $response = $resource->toArray(request());

        // When cost_price is null, total_cost should be 0
        $this->assertEquals(0.00, $response['total_cost']);
        
        // When cost_price is null, total_profit should be 0
        $this->assertEquals(0.00, $response['total_profit']);
    }
}
