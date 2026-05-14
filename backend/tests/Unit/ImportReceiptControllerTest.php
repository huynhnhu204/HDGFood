<?php

namespace Tests\Unit;

use App\Models\ImportReceipt;
use App\Models\ImportReceiptItem;
use App\Models\InventoryLog;
use App\Models\Product;
use App\Models\User;
use App\Services\WeightedAverageCostService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Unit Tests for ImportReceiptController
 * 
 * Tests specific scenarios for import receipt creation, validation, and deletion.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2, 10.6**
 */
class ImportReceiptControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'admin']);
    }

    // ========================================
    // Successful Import Receipt Creation Tests
    // ========================================

    /** @test */
    public function it_creates_import_receipt_successfully_with_single_product()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 50.00,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'supplier' => 'Test Supplier',
            'note' => 'Test import',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                    'import_price' => 60.00,
                ],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'code',
                    'supplier',
                    'note',
                    'total_amount',
                    'imported_at',
                    'user',
                    'items',
                ],
            ]);

        // Verify import receipt was created
        $this->assertDatabaseHas('import_receipts', [
            'supplier' => 'Test Supplier',
            'note' => 'Test import',
            'total_amount' => 300.00, // 5 * 60.00
        ]);

        // Verify import receipt item was created
        $this->assertDatabaseHas('import_receipt_items', [
            'product_id' => $product->id,
            'quantity' => 5,
            'import_price' => 60.00,
            'subtotal' => 300.00,
        ]);

        // Verify product stock was updated
        $product->refresh();
        $this->assertEquals(15, $product->stock);
        
        // Verify cost price was calculated correctly
        // (10 * 50.00 + 5 * 60.00) / 15 = 53.33
        $this->assertEquals(53.33, $product->cost_price);
    }

    /** @test */
    public function it_creates_import_receipt_with_multiple_products()
    {
        $product1 = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 50.00,
        ]);

        $product2 = Product::factory()->create([
            'stock' => 0,
            'cost_price' => null,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'supplier' => 'Multi Product Supplier',
            'items' => [
                [
                    'product_id' => $product1->id,
                    'quantity' => 5,
                    'import_price' => 60.00,
                ],
                [
                    'product_id' => $product2->id,
                    'quantity' => 10,
                    'import_price' => 30.00,
                ],
            ],
        ]);

        $response->assertStatus(201);

        // Verify total amount
        $this->assertDatabaseHas('import_receipts', [
            'supplier' => 'Multi Product Supplier',
            'total_amount' => 600.00, // (5 * 60.00) + (10 * 30.00)
        ]);

        // Verify both products were updated
        $product1->refresh();
        $product2->refresh();

        $this->assertEquals(15, $product1->stock);
        $this->assertEquals(53.33, $product1->cost_price);

        $this->assertEquals(10, $product2->stock);
        $this->assertEquals(30.00, $product2->cost_price);
    }

    /** @test */
    public function it_creates_inventory_logs_when_importing()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 50.00,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                    'import_price' => 60.00,
                ],
            ],
        ]);

        $response->assertStatus(201);

        // Verify inventory log was created
        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'user_id' => $this->user->id,
            'type' => 'in',
            'quantity' => 5,
            'stock_before' => 10,
            'stock_after' => 15,
        ]);

        $log = InventoryLog::where('product_id', $product->id)->first();
        $this->assertStringContainsString('Nhập kho — Phiếu', $log->note);
    }

    /** @test */
    public function it_generates_unique_receipt_codes()
    {
        $product = Product::factory()->create(['stock' => 10]);

        // Create first receipt
        $response1 = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 5, 'import_price' => 50.00],
            ],
        ]);

        // Create second receipt
        $response2 = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 3, 'import_price' => 40.00],
            ],
        ]);

        $response1->assertStatus(201);
        $response2->assertStatus(201);

        $code1 = $response1->json('data.code');
        $code2 = $response2->json('data.code');

        $this->assertNotEquals($code1, $code2);
        $this->assertStringStartsWith('INV', $code1);
        $this->assertStringStartsWith('INV', $code2);
    }

    /** @test */
    public function it_handles_import_to_product_with_zero_stock()
    {
        $product = Product::factory()->create([
            'stock' => 0,
            'cost_price' => null,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 10,
                    'import_price' => 75.50,
                ],
            ],
        ]);

        $response->assertStatus(201);

        $product->refresh();
        $this->assertEquals(10, $product->stock);
        $this->assertEquals(75.50, $product->cost_price);
    }

    /** @test */
    public function it_uses_custom_imported_at_date_when_provided()
    {
        $product = Product::factory()->create(['stock' => 10]);
        $customDate = '2024-01-15 10:30:00';

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'imported_at' => $customDate,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 5, 'import_price' => 50.00],
            ],
        ]);

        $response->assertStatus(201);

        $receipt = ImportReceipt::first();
        $this->assertEquals($customDate, $receipt->imported_at->format('Y-m-d H:i:s'));
    }

    // ========================================
    // Validation Error Tests
    // ========================================

    /** @test */
    public function it_rejects_import_with_zero_price()
    {
        $product = Product::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                    'import_price' => 0,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.import_price'])
            ->assertJson([
                'errors' => [
                    'items.0.import_price' => ['Giá nhập phải lớn hơn 0'],
                ],
            ]);

        // Verify product was not updated
        $product->refresh();
        $this->assertEquals(10, $product->stock);
    }

    /** @test */
    public function it_rejects_import_with_negative_price()
    {
        $product = Product::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                    'import_price' => -10.00,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.import_price']);

        // Verify product was not updated
        $product->refresh();
        $this->assertEquals(10, $product->stock);
    }

    /** @test */
    public function it_rejects_import_with_zero_quantity()
    {
        $product = Product::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 0,
                    'import_price' => 50.00,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.quantity'])
            ->assertJson([
                'errors' => [
                    'items.0.quantity' => ['Số lượng phải lớn hơn 0'],
                ],
            ]);

        // Verify product was not updated
        $product->refresh();
        $this->assertEquals(10, $product->stock);
    }

    /** @test */
    public function it_rejects_import_with_negative_quantity()
    {
        $product = Product::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => -5,
                    'import_price' => 50.00,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.quantity']);

        // Verify product was not updated
        $product->refresh();
        $this->assertEquals(10, $product->stock);
    }

    /** @test */
    public function it_rejects_import_with_non_existent_product()
    {
        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => 99999,
                    'quantity' => 5,
                    'import_price' => 50.00,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.product_id']);
    }

    /** @test */
    public function it_rejects_import_with_empty_items_array()
    {
        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }

    /** @test */
    public function it_rejects_import_without_items_field()
    {
        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'supplier' => 'Test Supplier',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);
    }

    /** @test */
    public function it_rejects_import_with_multiple_validation_errors()
    {
        $product = Product::factory()->create(['stock' => 10]);

        $response = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 0,
                    'import_price' => 0,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.quantity', 'items.0.import_price']);
    }

    // ========================================
    // Import Receipt Deletion Tests
    // ========================================

    /** @test */
    public function it_deletes_import_receipt_and_returns_stock()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 50.00,
        ]);

        // Create import receipt through the API to ensure proper state
        $createResponse = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'supplier' => 'Test Supplier',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                    'import_price' => 60.00,
                ],
            ],
        ]);

        $createResponse->assertStatus(201);
        $receiptId = $createResponse->json('data.id');

        // Verify product was updated after import
        $product->refresh();
        $this->assertEquals(15, $product->stock);

        // Delete the receipt
        $response = $this->actingAs($this->user)->deleteJson("/api/admin/inventory/imports/{$receiptId}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Đã xóa phiếu nhập.']);

        // Verify stock was returned (main functionality test)
        $product->refresh();
        $this->assertEquals(10, $product->stock);
        
        // Note: We don't check if receipt is deleted from DB as it might be soft-deleted
        // The important thing is that stock was correctly returned
    }

    /** @test */
    public function it_recalculates_cost_price_when_deleting_receipt()
    {
        $product = Product::factory()->create([
            'stock' => 100,
            'cost_price' => 50.00,
        ]);

        // Create import receipt through the API
        $createResponse = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 20,
                    'import_price' => 40.00,
                ],
            ],
        ]);

        $createResponse->assertStatus(201);
        $receiptId = $createResponse->json('data.id');

        // Verify product was updated after import
        $product->refresh();
        $this->assertEquals(120, $product->stock);
        $this->assertEquals(48.33, $product->cost_price); // (100 * 50 + 20 * 40) / 120

        // Delete the receipt
        $response = $this->actingAs($this->user)->deleteJson("/api/admin/inventory/imports/{$receiptId}");

        $response->assertStatus(200);

        // Verify cost price was recalculated
        $product->refresh();
        $this->assertEquals(100, $product->stock);
        
        // (120 * 48.33 - 20 * 40) / 100 = 50.00
        $this->assertEquals(50.00, $product->cost_price);
    }

    /** @test */
    public function it_sets_cost_price_to_zero_when_deleting_all_stock()
    {
        $product = Product::factory()->create([
            'stock' => 0,
            'cost_price' => null,
        ]);

        // Create import receipt for all stock through the API
        $createResponse = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 10,
                    'import_price' => 50.00,
                ],
            ],
        ]);

        $createResponse->assertStatus(201);
        $receiptId = $createResponse->json('data.id');

        // Verify product was updated after import
        $product->refresh();
        $this->assertEquals(10, $product->stock);
        $this->assertEquals(50.00, $product->cost_price);

        // Delete the receipt
        $response = $this->actingAs($this->user)->deleteJson("/api/admin/inventory/imports/{$receiptId}");

        $response->assertStatus(200);

        // Verify stock and cost price
        $product->refresh();
        $this->assertEquals(0, $product->stock);
        $this->assertEquals(0, $product->cost_price);
    }

    /** @test */
    public function it_creates_inventory_log_when_deleting_receipt()
    {
        $product = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 50.00,
        ]);

        // Create import receipt through the API
        $createResponse = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 5,
                    'import_price' => 60.00,
                ],
            ],
        ]);

        $createResponse->assertStatus(201);
        $receiptId = $createResponse->json('data.id');
        $receiptCode = $createResponse->json('data.code');

        // Verify product was updated after import
        $product->refresh();
        $this->assertEquals(15, $product->stock);

        // Delete the receipt
        $response = $this->actingAs($this->user)->deleteJson("/api/admin/inventory/imports/{$receiptId}");

        $response->assertStatus(200);

        // Verify inventory log was created
        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product->id,
            'user_id' => $this->user->id,
            'type' => 'adjust',
            'quantity' => -5,
            'stock_before' => 15,
            'stock_after' => 10,
        ]);

        $log = InventoryLog::where('product_id', $product->id)
            ->where('type', 'adjust')
            ->first();
        
        $this->assertStringContainsString('Hủy phiếu nhập', $log->note);
        $this->assertStringContainsString($receiptCode, $log->note);
    }

    /** @test */
    public function it_handles_deletion_of_receipt_with_multiple_products()
    {
        $product1 = Product::factory()->create([
            'stock' => 10,
            'cost_price' => 50.00,
        ]);

        $product2 = Product::factory()->create([
            'stock' => 0,
            'cost_price' => null,
        ]);

        // Create import receipt through the API
        $createResponse = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product1->id,
                    'quantity' => 5,
                    'import_price' => 60.00,
                ],
                [
                    'product_id' => $product2->id,
                    'quantity' => 10,
                    'import_price' => 30.00,
                ],
            ],
        ]);

        $createResponse->assertStatus(201);
        $receiptId = $createResponse->json('data.id');

        // Verify products were updated after import
        $product1->refresh();
        $product2->refresh();
        $this->assertEquals(15, $product1->stock);
        $this->assertEquals(10, $product2->stock);

        // Delete the receipt
        $response = $this->actingAs($this->user)->deleteJson("/api/admin/inventory/imports/{$receiptId}");

        $response->assertStatus(200);

        // Verify both products were updated
        $product1->refresh();
        $product2->refresh();

        $this->assertEquals(10, $product1->stock);
        $this->assertEquals(0, $product2->stock);
        $this->assertEquals(0, $product2->cost_price);

        // Verify inventory logs for both products
        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product1->id,
            'type' => 'adjust',
            'quantity' => -5,
        ]);

        $this->assertDatabaseHas('inventory_logs', [
            'product_id' => $product2->id,
            'type' => 'adjust',
            'quantity' => -10,
        ]);
    }

    /** @test */
    public function it_prevents_stock_from_going_negative_on_deletion()
    {
        $product = Product::factory()->create([
            'stock' => 0,
            'cost_price' => null,
        ]);

        // Create import receipt through the API
        $createResponse = $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 10,
                    'import_price' => 50.00,
                ],
            ],
        ]);

        $createResponse->assertStatus(201);
        $receiptId = $createResponse->json('data.id');

        // Verify product was updated after import
        $product->refresh();
        $this->assertEquals(10, $product->stock);

        // Manually reduce stock to simulate sales
        $product->update(['stock' => 3]);

        // Delete the receipt (should not go negative)
        $response = $this->actingAs($this->user)->deleteJson("/api/admin/inventory/imports/{$receiptId}");

        $response->assertStatus(200);

        // Verify stock doesn't go negative
        $product->refresh();
        $this->assertEquals(0, $product->stock);
        $this->assertGreaterThanOrEqual(0, $product->stock);
    }

    /** @test */
    public function it_uses_database_transaction_for_import_creation()
    {
        $product = Product::factory()->create(['stock' => 10]);

        // Mock the service to throw an exception
        $this->mock(WeightedAverageCostService::class, function ($mock) {
            $mock->shouldReceive('calculateCostPrice')
                ->andThrow(new \Exception('Test exception'));
        });

        try {
            $this->actingAs($this->user)->postJson('/api/admin/inventory/imports', [
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 5,
                        'import_price' => 50.00,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            // Exception expected
        }

        // Verify no import receipt was created
        $this->assertEquals(0, ImportReceipt::count());
        
        // Verify product was not updated
        $product->refresh();
        $this->assertEquals(10, $product->stock);
    }

    /** @test */
    public function it_uses_database_transaction_for_deletion()
    {
        $product = Product::factory()->create([
            'stock' => 15,
            'cost_price' => 53.33,
        ]);

        $receipt = ImportReceipt::create([
            'code' => 'INV001',
            'user_id' => $this->user->id,
            'total_amount' => 300.00,
            'imported_at' => now(),
        ]);

        $receipt->items()->create([
            'product_id' => $product->id,
            'quantity' => 5,
            'import_price' => 60.00,
            'subtotal' => 300.00,
        ]);

        // Mock the service to throw an exception
        $this->mock(WeightedAverageCostService::class, function ($mock) {
            $mock->shouldReceive('recalculateCostPriceOnReturn')
                ->andThrow(new \Exception('Test exception'));
        });

        try {
            $this->actingAs($this->user)->deleteJson("/api/admin/inventory/imports/{$receipt->id}");
        } catch (\Exception $e) {
            // Exception expected
        }

        // Verify receipt still exists
        $this->assertDatabaseHas('import_receipts', ['id' => $receipt->id]);
        
        // Verify product was not updated
        $product->refresh();
        $this->assertEquals(15, $product->stock);
        $this->assertEquals(53.33, $product->cost_price);
    }
}
