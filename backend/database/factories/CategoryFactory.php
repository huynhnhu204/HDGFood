<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->words(2, true);
        $uniqueSlug = Str::slug($name) . '-' . fake()->unique()->numberBetween(1, 999999);
        
        return [
            'parent_id' => null,
            'name' => ucfirst($name),
            'slug' => $uniqueSlug,
            'description' => fake()->sentence(),
            'image' => null,
            'is_active' => true,
            'position' => 0,
        ];
    }
}
