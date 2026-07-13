export interface ReverseGeocodeResult {
  fullAddress: string
  street?: string
  ward?: string
  district?: string
  province?: string
}

/** Reverse geocode qua OpenStreetMap Nominatim (miễn phí) */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('lat', String(lat))
    url.searchParams.set('lon', String(lng))
    url.searchParams.set('format', 'json')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', 'vi')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'HDG-Food-App/1.0' },
    })
    if (!res.ok) return null

    const data = await res.json()
    const addr = data.address || {}

    const street = [addr.house_number, addr.road || addr.street || addr.pedestrian || addr.residential]
      .filter(Boolean)
      .join(' ')
    const ward =
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.village ||
      addr.hamlet ||
      ''
    const district =
      addr.city_district ||
      addr.district ||
      addr.county ||
      addr.borough ||
      ''
    let province = addr.city || addr.state || addr.region || ''

    if (/ho chi minh|hồ chí minh|hcmc/i.test(province + district + (data.display_name || ''))) {
      province = province || 'Thành phố Hồ Chí Minh'
    }

    const parts = [street, ward, district, province].filter(Boolean)
    const fullAddress = parts.length > 0 ? parts.join(', ') : (data.display_name as string) || ''

    if (!fullAddress.trim()) return null

    return {
      fullAddress: fullAddress.trim(),
      street: street || undefined,
      ward: ward || undefined,
      district: district || undefined,
      province: province || undefined,
    }
  } catch {
    return null
  }
}
