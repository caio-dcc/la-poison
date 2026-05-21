'use client'

import { cn } from '@/lib/utils'

export interface BentoItem {
  title: string
  description: string
  icon: React.ReactNode
  status?: string
  tags?: string[]
  meta?: string
  cta?: string
  colSpan?: number
  hasPersistentHover?: boolean
}

interface BentoGridProps {
  items: BentoItem[]
}

function BentoGrid({ items }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'group relative p-5 rounded-2xl overflow-hidden transition-all duration-300',
            // LaPoison theme: evergreen glass panels
            'border border-white/10 bg-evergreen/50 backdrop-blur-md',
            'hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)]',
            'hover:-translate-y-0.5 will-change-transform',
            item.colSpan === 2 ? 'md:col-span-2' : 'col-span-1',
            item.hasPersistentHover && 'shadow-[0_4px_24px_rgba(0,0,0,0.2)] -translate-y-0.5'
          )}
        >
          {/* Dot-grid texture overlay */}
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              item.hasPersistentHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:4px_4px]" />
          </div>

          {/* Gradient border glow on hover */}
          <div
            className={cn(
              'absolute inset-0 -z-10 rounded-2xl p-px bg-gradient-to-br from-transparent via-white/10 to-transparent transition-opacity duration-300',
              item.hasPersistentHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          />

          <div className="relative flex flex-col space-y-3">
            {/* Icon + Status row */}
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 group-hover:bg-white/15 transition-all duration-300 ring-1 ring-white/10">
                {item.icon}
              </div>
              {item.status && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 text-porcelain/80 group-hover:bg-white/15 transition-colors duration-300 border border-white/10">
                  {item.status}
                </span>
              )}
            </div>

            {/* Title + meta + description */}
            <div className="space-y-1.5">
              <h3 className="font-semibold text-porcelain tracking-tight text-sm">
                {item.title}
                {item.meta && (
                  <span className="ml-2 text-xs text-porcelain/50 font-normal">{item.meta}</span>
                )}
              </h3>
              <p className="text-xs text-porcelain/70 leading-relaxed">{item.description}</p>
            </div>

            {/* Tags + CTA row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-wrap gap-1.5">
                {item.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-white/8 border border-white/10 text-porcelain/60 text-[10px] font-medium backdrop-blur-sm hover:bg-white/15 transition-colors duration-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              {item.cta && (
                <span className="text-xs text-porcelain/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap ml-2">
                  {item.cta}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export { BentoGrid }
