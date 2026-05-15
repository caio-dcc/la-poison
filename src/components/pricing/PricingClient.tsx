'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

export interface PricingClientProps {
  locale: string
  labels: Record<string, string>
  planList: Array<any>
  faqList: Array<{ q: string; a: string }>
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-hunter-green shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-300 shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export function PricingClient({ locale, labels, planList, faqList }: PricingClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'canceled'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('success')) {
      setMessage({ type: 'success', text: labels.successMessage })
      setTimeout(() => setMessage(null), 3000)
    } else if (searchParams.get('canceled')) {
      setMessage({ type: 'canceled', text: labels.canceledMessage })
      setTimeout(() => setMessage(null), 3000)
    }
  }, [searchParams, labels])

  const handleCheckout = useCallback(
    async (priceId: string | null | undefined) => {
      if (!priceId) {
        router.push(`/${locale}/signup`)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId, locale }),
        })

        if (!response.ok) {
          if (response.status === 401) {
            router.push(`/${locale}/login`)
            return
          }
          setMessage({ type: 'error', text: labels.errorMessage })
          return
        }

        const { url } = await response.json()
        if (url) {
          window.location.href = url
        }
      } catch (err) {
        console.error('Checkout error:', err)
        setMessage({ type: 'error', text: labels.errorMessage })
      } finally {
        setIsLoading(false)
      }
    },
    [locale, router, labels]
  )

  return (
    <>
      {message && (
        <div
          className={`mx-4 mt-4 p-3 rounded-lg text-sm text-center ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : message.type === 'error'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planList.map((plan: any) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-sm flex flex-col ${
                plan.highlight ? 'ring-2 ring-evergreen shadow-md' : ''
              }`}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                    plan.highlight
                      ? 'bg-evergreen text-porcelain'
                      : 'bg-hunter-green text-porcelain'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <div className="p-7 flex flex-col flex-1">
                <div className="mb-6">
                  <p className="text-xs font-bold text-hunter-green uppercase tracking-widest mb-1">
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-4xl font-bold text-evergreen">{plan.priceLabel}</span>
                    <span className="text-sm text-shadow-grey/60 mb-1">{plan.period}</span>
                  </div>
                  {'monthlyEquiv' in plan && plan.monthlyEquiv && (
                    <p className="text-xs text-hunter-green font-semibold">{plan.monthlyEquiv}</p>
                  )}
                  {'trialLabel' in plan && plan.trialLabel && (
                    <p className="text-xs text-shadow-grey/60 mt-1">{plan.trialLabel}</p>
                  )}
                  <p className="text-sm text-shadow-grey/70 mt-3">{plan.description}</p>
                </div>

                <button
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={isLoading}
                  className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors mb-7 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    plan.highlight
                      ? 'bg-evergreen text-porcelain hover:bg-hunter-green'
                      : 'border border-evergreen text-evergreen hover:bg-evergreen hover:text-porcelain'
                  }`}
                >
                  {isLoading ? 'Loading...' : plan.cta}
                </button>

                <ul className="space-y-2.5 text-sm text-shadow-grey flex-1">
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f: string) => (
                    <li key={f} className="flex items-start gap-2.5 opacity-40">
                      <XIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-shadow-grey/50 mt-6">{labels.footer}</p>
      </div>

      <div className="bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-evergreen text-center mb-10">{labels.faq}</h2>
          <dl className="space-y-6">
            {faqList.map(faq => (
              <div key={faq.q} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                <dt className="font-semibold text-evergreen mb-2">{faq.q}</dt>
                <dd className="text-shadow-grey/80 text-sm leading-relaxed">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  )
}
