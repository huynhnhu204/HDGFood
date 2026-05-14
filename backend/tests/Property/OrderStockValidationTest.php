<?php

namespace Tests\Property;

use App\Models\Product;
use App\Models\User;
use Eris\Generator;
use Eris\TestTrait;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Property-Based Tests for Order Stock Validation
 * 
 * **Validates: Requirements 7.1, 7.3**
 */
class OrderStockValidationTest extends TestCase
{
    use RefreshDatabase, TestTrait;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a regular user for authentication
        $this->user = User::factory()->create([
            'role' => 'user',
        ]);
    }

    /**
     * Property 9: Validation Tồn Kho Khi Bán
     * 
     * For any đơn hàng, tất cả các sản phẩm trong đơn phải có tồn kho đủ 
     * (stock >= quantity yêu cầu), nếu không hệ thống phải từ chối tạo đơn.
     * 
     * **Validates: Requirements 7.1, 7.3**
     */
    #[\PHPUnit\Framework\Attributes\Test]
    public function property_order_creation_requires_sufficient_stock()
    {
        $this->minimumEvaluationRatio(0.5);
        $this->limitTo(100);
        
        $this->forAll(
            Generator\choose(1, 100),      // availableStock
            Generator\choose(1, 200)       // requestedQuantity (can be > stock)
        )
        ->when(function (int $availableStock, int $requestedQuantity) {
            // Only test cases where requested quantity exceeds available stock
            return $requestedQuantity > $availableStock;
        })
        ->then(function (int $availableStock, int $requestedQuantity) {
            // Create a product with limited stock
            $product = Product::factory()->create([
                'stock' => $availableStock,
                'cost_price' => 50.00,
                'price' => 100.00,
            ]);

            // Attempt to create an order with quantity exceeding stock
            $response = $this->actingAs($this->user)
                ->postJson('/api/orders', [
                    'customer_name' => 'Test Customer',
                    'customer_phone' => '0123456789',
                    'payment_method' => 'cash',
                    'items' => [
                        [
                            'product_id' => $product->id,
                            'quantity' => $requestedQuantity,
                        ]
                    ]
                ]);

            // Assert validation error
            $response->assertStatus(422);
            
            // Assert error message contains product name and stock issue
            $errorMessage = $response->json('message');
            $this->assertNotNull(
                $errorMessage,
                "Expected error message when stock is insufficient. " .
                "Stock: {$availableStock}, Requested: {$requestedQuantity}"
            );
            
            // Assert the error message mentions the product and insufficient stock
            $this->assertStringContainsString(
                $product->name,
                $errorMessage,
                "Error message should mention the product name: {$product->name}"
            );
            
            $this->assertStringContainsString(
                'không đủ số lượng',
                $errorMessage,
                "Error message should indicate insufficient stock. " .
                "Stock: {$availableStock}, Requested: {$requestedQuantity}"
            );

            // Verify stock was not decremented (transaction rolled back)
            $product->refresh();
            $this->assertEquals(
                $availableStock,
                $product->stock,
                "Stock should not be decremented when order creation fails. " .
                "Expected: {$availableStock}, Got: {$product->stock}"
            );
        });
    }
}
