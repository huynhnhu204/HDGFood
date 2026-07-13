<?php

namespace App\Services;

use App\Models\Setting;

class DeliveryRadiusService
{
    /** Vị trí mặc định: Quận 1, TP.HCM */
    private const DEFAULT_STORE_LAT = 10.776889;
    private const DEFAULT_STORE_LNG = 106.700806;
    private const DEFAULT_RADIUS_KM = 25;
    private const DEFAULT_MIN_ORDER_AMOUNT = 100000;

    public function getMinOrderAmount(): float
    {
        $min = (float) Setting::getValue('delivery_min_order_amount', self::DEFAULT_MIN_ORDER_AMOUNT);

        return max(0, $min);
    }

    public function assertMinDeliveryOrder(float $subtotal): void
    {
        $min = $this->getMinOrderAmount();
        if ($min <= 0) {
            return;
        }
        if ($subtotal < $min) {
            $formatted = number_format($min, 0, ',', '.');
            throw new \InvalidArgumentException(
                "Đơn giao hàng tối thiểu {$formatted}₫ (chưa tính phí ship). Vui lòng thêm món để đủ giá trị đơn hàng."
            );
        }
    }

    public function getStoreLocation(): array
    {
        return [
            'latitude'  => (float) Setting::getValue('store_latitude', self::DEFAULT_STORE_LAT),
            'longitude' => (float) Setting::getValue('store_longitude', self::DEFAULT_STORE_LNG),
            'address'   => (string) Setting::getValue('address', '123 Nguyễn Huệ, Quận 1, TP.HCM'),
        ];
    }

    public function getMaxRadiusKm(): float
    {
        $radius = (float) Setting::getValue('delivery_radius_km', self::DEFAULT_RADIUS_KM);

        return max(1, min(50, $radius));
    }

    /**
     * Khoảng cách đường chim bay (km) giữa hai điểm GPS.
     */
    public function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }

    public function checkDelivery(float $customerLat, float $customerLng): array
    {
        $store = $this->getStoreLocation();
        $maxRadius = $this->getMaxRadiusKm();
        $distance = $this->haversineKm(
            $store['latitude'],
            $store['longitude'],
            $customerLat,
            $customerLng
        );

        $withinRadius = $distance <= $maxRadius;

        return [
            'within_radius'   => $withinRadius,
            'distance_km'     => $distance,
            'max_radius_km'   => $maxRadius,
            'store'           => $store,
            'customer'        => [
                'latitude'  => $customerLat,
                'longitude' => $customerLng,
            ],
            'message' => $withinRadius
                ? "Bạn nằm trong vùng giao hàng (cách quán {$distance} km)."
                : "Rất tiếc, địa chỉ cách quán {$distance} km — chúng tôi chỉ giao trong bán kính {$maxRadius} km để đảm bảo đồ ăn ngon.",
        ];
    }

    public function assertWithinRadius(float $customerLat, float $customerLng): void
    {
        $result = $this->checkDelivery($customerLat, $customerLng);

        if (! $result['within_radius']) {
            throw new \InvalidArgumentException($result['message']);
        }
    }
}
