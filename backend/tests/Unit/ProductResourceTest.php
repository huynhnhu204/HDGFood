<?php

namespace Tests\Unit;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductResourceTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_formats_cost_price_with_two_decimal_places()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => 60.50,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertIsFloat($array['cost_price']);
        $this->assertEquals(60.5, $array['cost_price']);
    }

    /** @test */
    public function it_formats_profit_per_unit_with_two_decimal_places()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => 60.50,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertIsFloat($array['profit_per_unit']);
        $this->assertEquals(39.5, $array['profit_per_unit']);
    }

    /** @test */
    public function it_formats_profit_margin_with_one_decimal_place()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => 60.00,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertIsFloat($array['profit_margin']);
        $this->assertEquals(40.0, $array['profit_margin']);
    }

    /** @test */
    public function it_returns_null_for_cost_price_when_not_set()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => null,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertNull($array['cost_price']);
    }

    /** @test */
    public function it_returns_zero_profit_per_unit_when_cost_price_is_null()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => null,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertEquals(0, $array['profit_per_unit']);
    }

    /** @test */
    public function it_returns_zero_profit_margin_when_cost_price_is_null()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => null,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertEquals(0, $array['profit_margin']);
    }

    /** @test */
    public function it_includes_cost_price_in_response()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => 60.00,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertArrayHasKey('cost_price', $array);
    }

    /** @test */
    public function it_includes_profit_per_unit_in_response()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => 60.00,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertArrayHasKey('profit_per_unit', $array);
    }

    /** @test */
    public function it_includes_profit_margin_in_response()
    {
        $product = Product::factory()->create([
            'price' => 100.00,
            'cost_price' => 60.00,
        ]);

        $resource = new ProductResource($product);
        $array = $resource->toArray(request());

        $this->assertArrayHasKey('profit_margin', $array);
    }
}
