'use client'

import { getPaymentFlowSteps, type PaymentFlowVariant } from '@/lib/payment-flow'
import { CheckCircle2 } from 'lucide-react'

type Props = {
  currentStep: 1 | 2 | 3
  compact?: boolean
  variant?: PaymentFlowVariant
}

const ACTIVE_STYLE: Record<PaymentFlowVariant, string> = {
  manual: 'border-[#ed2a2a] bg-red-50/50',
  vnpay: 'border-blue-500 bg-blue-50/50',
}

const ACTIVE_DOT: Record<PaymentFlowVariant, string> = {
  manual: 'bg-[#ed2a2a]',
  vnpay: 'bg-blue-500',
}

export default function PaymentFlowSteps({ currentStep, compact, variant = 'manual' }: Props) {
  const steps = getPaymentFlowSteps(variant)

  return (
    <ol className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {steps.map(({ step, title, desc }) => {
        const done = step < currentStep
        const active = step === currentStep
        return (
          <li
            key={step}
            className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
              active
                ? `${ACTIVE_STYLE[variant]} border`
                : done
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : 'border-slate-100 bg-slate-50/50'
            }`}
          >
            <div className="flex items-start gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? `${ACTIVE_DOT[variant]} text-white`
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : step}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-800">{title}</p>
                {!compact && <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-snug">{desc}</p>}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
