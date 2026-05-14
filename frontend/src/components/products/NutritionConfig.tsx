'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Trash2, Award, Flame, TrendingUp, AlertCircle } from 'lucide-react'

export interface NutritionData {
  [key: string]: string
}

interface NutritionConfigProps {
  value: NutritionData
  onChange: (data: NutritionData) => void
}

// Default nutrition fields
const DEFAULT_FIELDS = [
  { key: 'kcal', label: 'Kcal', placeholder: 'VD: 450' },
  { key: 'protein', label: 'Protein', placeholder: 'VD: 25g' },
  { key: 'fat', label: 'Fat', placeholder: 'VD: 15g' },
  { key: 'carbs', label: 'Carbs', placeholder: 'VD: 50g' },
]

// Health score calculation logic
function calculateHealthScore(nutrition: NutritionData): {
  score: number
  badges: string[]
  level: 'excellent' | 'good' | 'moderate' | 'low'
  message: string
} {
  const kcal = parseFloat(nutrition.kcal) || 0
  const protein = parseFloat(nutrition.protein) || 0
  const fat = parseFloat(nutrition.fat) || 0
  const carbs = parseFloat(nutrition.carbs) || 0

  const badges: string[] = []
  let score = 50 // Base score

  // High Protein (>20g)
  if (protein >= 20) {
    badges.push('High Protein')
    score += 15
  }

  // Healthy Choice (Kcal 300-600, Protein >15g)
  if (kcal >= 300 && kcal <= 600 && protein >= 15) {
    badges.push('Healthy Choice')
    score += 20
  }

  // Low Fat (<10g)
  if (fat > 0 && fat < 10) {
    badges.push('Low Fat')
    score += 10
  }

  // Balanced Meal (Good ratio)
  const proteinRatio = kcal > 0 ? (protein * 4 / kcal) * 100 : 0
  if (proteinRatio >= 20 && proteinRatio <= 35) {
    badges.push('Balanced Meal')
    score += 15
  }

  // Energy Boost (High Carbs >50g)
  if (carbs >= 50) {
    badges.push('Energy Boost')
    score += 10
  }

  // Light Meal (Kcal <400)
  if (kcal > 0 && kcal < 400) {
    badges.push('Light Meal')
    score += 5
  }

  // Determine level
  let level: 'excellent' | 'good' | 'moderate' | 'low'
  let message: string

  if (score >= 85) {
    level = 'excellent'
    message = 'Món ăn cực kỳ lành mạnh và cân bằng dinh dưỡng!'
  } else if (score >= 70) {
    level = 'good'
    message = 'Món ăn tốt cho sức khỏe với dinh dưỡng hợp lý.'
  } else if (score >= 50) {
    level = 'moderate'
    message = 'Món ăn có giá trị dinh dưỡng trung bình.'
  } else {
    level = 'low'
    message = 'Cần bổ sung thêm thông tin dinh dưỡng.'
  }

  return { score: Math.min(score, 100), badges, level, message }
}

export default function NutritionConfig({ value, onChange }: NutritionConfigProps) {
  const [customFields, setCustomFields] = useState<Array<{ id: string; key: string; value: string }>>([])

  // Initialize from value
  useEffect(() => {
    const customs: Array<{ id: string; key: string; value: string }> = []
    Object.entries(value).forEach(([k, v]) => {
      if (!DEFAULT_FIELDS.find(f => f.key === k)) {
        customs.push({ id: Math.random().toString(), key: k, value: v })
      }
    })
    setCustomFields(customs)
  }, [])

  // Calculate health score
  const healthScore = useMemo(() => calculateHealthScore(value), [value])

  const handleDefaultChange = (key: string, val: string) => {
    onChange({ ...value, [key]: val })
  }

  const handleCustomChange = (id: string, key: string, val: string) => {
    const updated = customFields.map(f => 
      f.id === id ? { ...f, key, value: val } : f
    )
    setCustomFields(updated)
    
    // Update parent
    const newData = { ...value }
    // Remove old key if changed
    const oldField = customFields.find(f => f.id === id)
    if (oldField && oldField.key !== key && oldField.key) {
      delete newData[oldField.key]
    }
    // Add new
    if (key) newData[key] = val
    onChange(newData)
  }

  const addCustomField = () => {
    setCustomFields([...customFields, { id: Math.random().toString(), key: '', value: '' }])
  }

  const removeCustomField = (id: string) => {
    const field = customFields.find(f => f.id === id)
    if (field?.key) {
      const newData = { ...value }
      delete newData[field.key]
      onChange(newData)
    }
    setCustomFields(customFields.filter(f => f.id !== id))
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'from-emerald-500 to-green-500'
      case 'good': return 'from-blue-500 to-cyan-500'
      case 'moderate': return 'from-amber-500 to-orange-500'
      default: return 'from-slate-400 to-slate-500'
    }
  }

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'excellent': return 'bg-emerald-50 border-emerald-200'
      case 'good': return 'bg-blue-50 border-blue-200'
      case 'moderate': return 'bg-amber-50 border-amber-200'
      default: return 'bg-slate-50 border-slate-200'
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white rounded-xl shadow-sm">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">
            Thông tin dinh dưỡng
          </h2>
        </div>
        
        {/* Health Score Badge */}
        {healthScore.score > 0 && (
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${getLevelColor(healthScore.level)} text-white shadow-lg`}>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span className="text-xs font-black">{healthScore.score}/100</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Default Fields */}
        <div className="space-y-3">
          {DEFAULT_FIELDS.map(field => (
            <div key={field.key} className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={field.label}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 cursor-not-allowed"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full" />
                </div>
              </div>
              <input
                type="text"
                value={value[field.key] || ''}
                onChange={e => handleDefaultChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all"
              />
            </div>
          ))}
        </div>

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            {customFields.map(field => (
              <div key={field.id} className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={field.key}
                  onChange={e => handleCustomChange(field.id, e.target.value, field.value)}
                  placeholder="Tên chỉ số (VD: Fiber)"
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={field.value}
                    onChange={e => handleCustomChange(field.id, field.key, e.target.value)}
                    placeholder="Giá trị (VD: 5g)"
                    className="flex-1 px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#ed2a2a] focus:ring-4 focus:ring-red-50 outline-none transition-all"
                  />
                  <button
                    onClick={() => removeCustomField(field.id)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Xóa chỉ số"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Button */}
        <button
          onClick={addCustomField}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:border-[#ed2a2a] hover:text-[#ed2a2a] hover:bg-red-50/30 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm chỉ số dinh dưỡng
        </button>

        {/* Health Score Panel */}
        {healthScore.score > 0 && (
          <div className={`p-5 rounded-2xl border-2 ${getLevelBg(healthScore.level)} transition-all`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${getLevelColor(healthScore.level)} text-white shadow-lg`}>
                <TrendingUp className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Điểm sức khỏe: {healthScore.score}/100
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    healthScore.level === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                    healthScore.level === 'good' ? 'bg-blue-100 text-blue-700' :
                    healthScore.level === 'moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {healthScore.level === 'excellent' ? 'Xuất sắc' :
                     healthScore.level === 'good' ? 'Tốt' :
                     healthScore.level === 'moderate' ? 'Trung bình' : 'Thấp'}
                  </span>
                </div>
                
                <p className="text-xs font-medium text-slate-600 mb-3">
                  {healthScore.message}
                </p>

                {/* Badges */}
                {healthScore.badges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {healthScore.badges.map((badge, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-200/50 rounded-lg text-[10px] font-black text-slate-700 uppercase tracking-wider shadow-sm"
                      >
                        <Award className="w-3 h-3 text-[#ed2a2a]" />
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-white/50 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getLevelColor(healthScore.level)} transition-all duration-500`}
                style={{ width: `${healthScore.score}%` }}
              />
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-blue-900 mb-1">
              Hệ thống tự động tính điểm sức khỏe
            </p>
            <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
              Dựa trên Kcal, Protein, Fat và Carbs để gắn nhãn "Healthy Choice", "High Protein", "Balanced Meal"... 
              Điểm càng cao, món ăn càng lành mạnh!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
