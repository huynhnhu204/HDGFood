<?php

namespace Tests\Property;

use App\Models\Product;
use App\Models\User;
use Eris\Generator;
use Eris\TestTrait;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Property-Based Tests for Import Receipt Validation
 * 
 * **Validates: Requirements 6.1, 6.5**
 */
class ImportReceiptValidationTest extends TestCase
{
    use RefreshDatabase, TestTrait;

    protected User $user;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create an admin user for authentication
        $this->user = User::factory()->create([
            'role' => 'admin',
        ]);
        
        // Create a product for testing
        $this->product = Product::factory()->create([
            'stock' => 100,
            'cost_price' => 50.00,
        ]);
    }

    /**
     * Property 7: Validation Giá Nhập Dương
     * 
     * For any phiếu nhập kho, tất cả các giá nhập (import_price) phải lớn hơn 0, 
     * nếu không hệ thống phải từ chối tạo phiếu.
     * 
     * **Validates: Requirements 6.1, 6.5**
     */
    #[\PHPUnit\Framework\Attributes\Test]
    public function property_import_price_must_be_greater_than_zero()
    {
        $this->minimumEvaluationRatio(0.5);
        $this->limitTo(100);
        
        $this->forAll(
            Generator\choose(-10000, 0)  // Invalid prices: negative or zero (in cents)
        )
        ->then(function (int $invalidPriceCents) {
            // Convert cents to decimal
            $invalidPrice = $invalidPriceCents / 100;
            
            // Any valid quantity
            $quantity = rand(1, 100);

            // Attempt to create import receipt with invalid price
            $response = $this->actingAs($this->user)
                ->postJson('/api/admin/inventory/imports', [
                    'supplier' => 'Test Supplier',
                    'note' => 'Test note',
                    'items' => [
                        [
                            'product_id' => $this->product->id,
                            'quantity' => $quantity,
                            'import_price' => $invalidPrice,
                        ]
                    ]
                ]);

            // Assert validation error
            $response->assertStatus(422);
            
            // Assert error message contains validation for import_price
            $response->assertJsonValidationErrors(['items.0.import_price']);
            
            // Assert the specific error message
            $errors = $response->json('errors');
            $this->assertArrayHasKey('items.0.import_price', $errors);
            $this->assertStringContainsString(
                'Giá nhập phải lớn hơn 0',
                $errors['items.0.import_price'][0],
                "Expected validation error message for invalid price: {$invalidPrice}"
            );
        });
    }

    /**
     * Property 8: Validation Số Lượng Dương
     * 
     * For any phiếu nhập kho, tất cả các số lượng (quantity) phải lớn hơn 0, 
     * nếu không hệ thống phải từ chối tạo phiếu.
     * 
     * **Validates: Requirements 6.2, 6.5**
     */
    #[\PHPUnit\Framework\Attributes\Test]
    public function property_quantity_must_be_greater_than_zero()
    {
        $this->minimumEvaluationRatio(0.5);
        $this->limitTo(100);
        
        $this->forAll(
            Generator\choose(-1000, 0)  // Invalid quantities: negative or zero
        )
        ->then(function (int $invalidQuantity) {
            // Any valid price
            $validPrice = rand(100, 10000) / 100;  // Random price between 1.00 and 100.00

            // Attempt to create import receipt with invalid quantity
            $response = $this->actingAs($this->user)
                ->postJson('/api/admin/inventory/imports', [
                    'supplier' => 'Test Supplier',
                    'note' => 'Test note',
                    'items' => [
                        [
                            'product_id' => $this->product->id,
                            'quantity' => $invalidQuantity,
                            'import_price' => $validPrice,
                        ]
                    ]
                ]);

            // Assert validation error
            $response->assertStatus(422);
            
            // Assert error message contains validation for quantity
            $response->assertJsonValidationErrors(['items.0.quantity']);
            
            // Assert the specific error message
            $errors = $response->json('errors');
            $this->assertArrayHasKey('items.0.quantity', $errors);
            $this->assertStringContainsString(
                'Số lượng phải lớn hơn 0',
                $errors['items.0.quantity'][0],
                "Expected validation error message for invalid quantity: {$invalidQuantity}"
            );
        });
    }
}
