export interface OptionDraft {
  name: string
  is_required: boolean
  values: { label: string; price_extra: number }[]
}

export const emptyOption = (): OptionDraft => ({
  name: '',
  is_required: false,
  values: [{ label: '', price_extra: 0 }],
})

export const TABS = [
  { id: 'info',     label: 'Thông tin' },
  { id: 'price',    label: 'Giá' },
  { id: 'options',  label: 'Tuỳ chọn' },
  { id: 'image',    label: 'Hình ảnh' },
  { id: 'settings', label: 'Cài đặt' },
] as const

export type TabId = typeof TABS[number]['id']

export const TIME_OPTS = [
  { value: 'all',       label: '🕐 Cả ngày' },
  { value: 'morning',   label: '🌅 Buổi sáng' },
  { value: 'afternoon', label: '☀️ Buổi trưa/chiều' },
  { value: 'evening',   label: '🌙 Buổi tối' },
] as const
