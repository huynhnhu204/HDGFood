<?php


class MockOrder {
    public $items = [];
    
    public function getTotalCostAttribute(): float
    {
        return array_sum(array_map(function ($item) {
            return ($item['cost_price'] ?? 0) * $item['quantity'];
        }, $this->items));
    }
    
    public function getTotalProfitAttribute(): float
    {
        return array_sum(array_map(function ($item) {
            if (!isset($item['cost_price'])) return 0;
            return ($item['price'] - $item['cost_price']) * $item['quantity'];
        }, $this->items));
    }
}

// Test Case 1: Normal values
echo "Test Case 1: Normal values\n";
$order1 = new MockOrder();
$order1->items = [
    ['price' => 100.00, 'cost_price' => 60.00, 'quantity' => 2],
    ['price' => 200.00, 'cost_price' => 120.00, 'quantity' => 1],
];

$total_cost = round($order1->getTotalCostAttribute(), 2);
$total_profit = round($order1->getTotalProfitAttribute(), 2);

echo "Total Cost: $total_cost (Expected: 240.00)\n";
echo "Total Profit: $total_profit (Expected: 160.00)\n";
echo "Pass: " . ($total_cost === 240.00 && $total_profit === 160.00 ? "YES" : "NO") . "\n\n";

// Test Case 2: Decimal values
echo "Test Case 2: Decimal values requiring rounding\n";
$order2 = new MockOrder();
$order2->items = [
    ['price' => 99.99, 'cost_price' => 66.66, 'quantity' => 3],
];

$total_cost = round($order2->getTotalCostAttribute(), 2);
$total_profit = round($order2->getTotalProfitAttribute(), 2);

echo "Total Cost: $total_cost (Expected: 199.98)\n";
echo "Total Profit: $total_profit (Expected: 99.99)\n";
echo "Pass: " . ($total_cost === 199.98 && $total_profit === 99.99 ? "YES" : "NO") . "\n\n";

// Test Case 3: Null cost_price
echo "Test Case 3: Null cost_price\n";
$order3 = new MockOrder();
$order3->items = [
    ['price' => 100.00, 'cost_price' => null, 'quantity' => 1],
];

$total_cost = round($order3->getTotalCostAttribute(), 2);
$total_profit = round($order3->getTotalProfitAttribute(), 2);

echo "Total Cost: $total_cost (Expected: 0.00)\n";
echo "Total Profit: $total_profit (Expected: 0.00)\n";
echo "Pass: " . ($total_cost === 0.00 && $total_profit === 0.00 ? "YES" : "NO") . "\n\n";

// Test Case 4: Mixed items (some with cost_price, some without)
echo "Test Case 4: Mixed items\n";
$order4 = new MockOrder();
$order4->items = [
    ['price' => 100.00, 'cost_price' => 60.00, 'quantity' => 1],
    ['price' => 200.00, 'cost_price' => null, 'quantity' => 1],
];

$total_cost = round($order4->getTotalCostAttribute(), 2);
$total_profit = round($order4->getTotalProfitAttribute(), 2);

echo "Total Cost: $total_cost (Expected: 60.00)\n";
echo "Total Profit: $total_profit (Expected: 40.00)\n";
echo "Pass: " . ($total_cost === 60.00 && $total_profit === 40.00 ? "YES" : "NO") . "\n\n";

echo "All tests completed!\n";
