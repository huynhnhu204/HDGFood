<?php

namespace Tests\Property;

use App\Models\ImportReceipt;
use App\Models\Product;
use App\Models\User;
use Eris\Generator;
use Eris\TestTrait;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Property-Based Tests for Import Receipt Total Amount Calculation
 * 
 * **Validates: Requirements 8.5**
 */
class ImportReceiptTotalAmountTest extends TestCase
{
    use RefreshDatabase, TestTrait;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create an admin user for authentication
        $this->user = User::factory()->create([
            'role' => 'admin',
        ]);
    }

    /**
     * Property 11: Tính Tổng Tiền Phiếu Nhập
     * 
     * For any phiếu nhập kho, tổng tiền (total_amount) phải bằng tổng của 
     * (số_lượng × giá_nhập) của tất cả các items trong phiếu.
     * 
     * **Validates: Requirements 8.5**
     */
    #[\PHPUnit\Framework\Attributes\Test]
    public function property_total_amount_equals_sum_of_item_subtotals()
    {
        $this->minimumEvaluationRatio(0.5);
        $this->limitTo(100);
        
        $this->forAll(
            Generator\choose(1, 5),  // Number of items in the receipt (1-5 items)
            Generator\seq(Generator\choose(1, 1000)),  // Quantities for each item
            Generator\seq(Generator\choose(100, 10000))  // Prices in cents for each item
        )
        ->then(function (int $itemCount, array $quantities, array $pricesCents) {
            // Create products for the import receipt
            $products = Product::factory()->count($itemCount)->create([
                'stock' => 0,
                'cost_price' => 0,
            ]);

            // Prepare items data
            $items = [];
            $expectedTotal = 0;

            for ($i = 0; $i < $itemCount; $i++) {
                $quantity = $quantities[$i] ?? rand(1, 1000);
                $priceCents = $pricesCents[$i] ?? rand(100, 10000);
                $importPrice = $priceCents / 100;  // Convert cents to decimal

                $items[] = [
                    'product_id' => $products[$i]->id,
                    'quantity' => $quantity,
                    'import_price' => $importPrice,
                ];

                // Calculate expected total
                $expectedTotal += $quantity * $importPrice;
            }

            // Round expected total to 2 decimal places
            $expectedTotal = round($expectedTotal, 2);

            // Create import receipt via API
            $response = $this->actingAs($this->user)
                ->postJson('/api/admin/inventory/imports', [
                    'supplier' => 'Test Supplier',
                    'note' => 'Property test',
                    'items' => $items,
                ]);

            // Assert successful creation
            $response->assertStatus(201);

            // Get the created import receipt
            $receiptData = $response->json('data');
            $receipt = ImportReceipt::with('items')->find($receiptData['id']);

            // Assert the receipt was created
            $this->assertNotNull($receipt, 'Import receipt should be created');

            // Calculate actual total from items
            $actualTotalFromItems = $receipt->items->sum(function ($item) {
                return $item->quantity * $item->import_price;
            });
            $actualTotalFromItems = round($actualTotalFromItems, 2);

            // Assert total_amount equals the sum of item subtotals
            $this->assertEquals(
                $expectedTotal,
                (float) $receipt->total_amount,
                "Total amount should equal sum of (quantity × import_price) for all items. " .
                "Expected: {$expectedTotal}, Got: {$receipt->total_amount}"
            );

            // Also verify that the calculated total from items matches
            $this->assertEquals(
                $actualTotalFromItems,
                (float) $receipt->total_amount,
                "Total amount should match the sum calculated from items. " .
                "Calculated: {$actualTotalFromItems}, Stored: {$receipt->total_amount}"
            );

            // Verify each item's subtotal is correct
            foreach ($receipt->items as $item) {
                $expectedSubtotal = round($item->quantity * $item->import_price, 2);
                $this->assertEquals(
                    $expectedSubtotal,
                    (float) $item->subtotal,
                    "Item subtotal should equal quantity × import_price. " .
                    "Product ID: {$item->product_id}, " .
                    "Quantity: {$item->quantity}, " .
                    "Import Price: {$item->import_price}, " .
                    "Expected Subtotal: {$expectedSubtotal}, " .
                    "Got: {$item->subtotal}"
                );
            }

            // Assert proper decimal formatting (2 decimal places)
            $formattedTotal = number_format((float) $receipt->total_amount, 2, '.', '');
            $formattedExpected = number_format($expectedTotal, 2, '.', '');
            $this->assertEquals(
                $formattedExpected,
                $formattedTotal,
                "Total amount must be formatted to 2 decimal places"
            );
        });
    }
}
