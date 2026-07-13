import type { ReverseGeocodeResult } from './reverseGeocode'

export type AdminUnit = { code: string; name: string }

export function normalizeAdminName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(tinh|thanh pho|tp\.?|quan|huyen|thi xa|phuong|xa|thi tran)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchAdminUnit(units: AdminUnit[], candidate?: string): AdminUnit | undefined {
  if (!candidate?.trim() || units.length === 0) return undefined

  const norm = normalizeAdminName(candidate)
  const raw = candidate.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  const exact = units.find((u) => normalizeAdminName(u.name) === norm)
  if (exact) return exact

  const contains = units.find((u) => {
    const un = normalizeAdminName(u.name)
    return un.includes(norm) || norm.includes(un)
  })
  if (contains) return contains

  return units.find((u) => {
    const un = u.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return raw.includes(un) || un.includes(raw)
  })
}

export function extractStreetFromAddress(
  geo: ReverseGeocodeResult,
  resolvedAddress?: string,
): string {
  if (geo.street?.trim()) return geo.street.trim()
  const source = resolvedAddress?.trim() || geo.fullAddress
  return source.split(',')[0]?.trim() || source
}
