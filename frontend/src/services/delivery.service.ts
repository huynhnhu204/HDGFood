import api from './api'

export interface DeliveryConfig {
  store_latitude: number
  store_longitude: number
  store_address: string
  delivery_radius_km: number
  min_order_amount: number
}

export interface DeliveryCheckResult {
  within_radius: boolean
  distance_km: number
  max_radius_km: number
  message: string
  store: {
    latitude: number
    longitude: number
    address: string
  }
  customer: {
    latitude: number
    longitude: number
  }
}

export const deliveryService = {
  async getConfig(): Promise<DeliveryConfig> {
    const res = await api.get('/public/delivery/config')
    return res.data.data
  },

  async checkLocation(lat: number, lng: number): Promise<DeliveryCheckResult> {
    const res = await api.get('/public/delivery/check', {
      params: { lat, lng },
    })
    return res.data.data
  },
}
