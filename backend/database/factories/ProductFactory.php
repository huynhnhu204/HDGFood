<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->words(3, true);
        $uniqueSlug = Str::slug($name) . '-' . fake()->unique()->numberBetween(1, 999999);
        
        return [
            'category_id' => Category::factory(),
            'name' => ucfirst($name),
            'slug' => $uniqueSlug,
            'description' => fake()->sentence(),
            'long_description' => fake()->paragraph(),
            'price' => fake()->randomFloat(2, 10, 500),
            'sale_price' => null,
            'cost_price' => null,
            'stock' => fake()->numberBetween(0, 100),
            'sku' => strtoupper(fake()->bothify('SKU-####??')),
            'image' => null,
            'is_active' => true,
            'is_featured' => false,
            'sold_count' => 0,
            'calories' => fake()->randomFloat(2, 50, 500),
            'protein' => fake()->randomFloat(2, 5, 50),
            'carbs' => fake()->randomFloat(2, 10, 100),
            'fat' => fake()->randomFloat(2, 1, 30),
            'fiber' => fake()->randomFloat(2, 1, 20),
        ];
    }

    /**
     * Indicate that the product has stock and cost price.
     */
    public function withStock(int $stock, float $costPrice): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => $stock,
            'cost_price' => $costPrice,
        ]);
    }

    /**
     * Indicate that the product is out of stock.
     */
    public function outOfStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'stock' => 0,
            'cost_price' => null,
        ]);
    }
}
