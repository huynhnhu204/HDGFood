<?php

namespace App\Http\Controllers;

use App\Services\DeliveryRadiusService;
use Illuminate\Http\Request;

class DeliveryController extends Controller
{
    public function __construct(private DeliveryRadiusService $deliveryRadius)
    {
    }

    /**
     * GET /api/public/delivery/config
     */
    public function config()
    {
        $store = $this->deliveryRadius->getStoreLocation();

        return response()->json([
            'data' => [
                'store_latitude'    => $store['latitude'],
                'store_longitude'   => $store['longitude'],
                'store_address'     => $store['address'],
                'delivery_radius_km'=> $this->deliveryRadius->getMaxRadiusKm(),
                'min_order_amount'  => $this->deliveryRadius->getMinOrderAmount(),
            ],
        ]);
    }

    /**
     * GET /api/public/delivery/check?lat=10.77&lng=106.69
     */
    public function check(Request $request)
    {
        $data = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
        ]);

        return response()->json([
            'data' => $this->deliveryRadius->checkDelivery(
                (float) $data['lat'],
                (float) $data['lng']
            ),
        ]);
    }
}
