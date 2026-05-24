'use client'

import { cn } from '@/lib/utils'

export interface BentoItem {
  title: string
  description?: string
  icon: React.ReactNode
  status?: string
  tags?: string[]
  meta?: string
  colSpan?: number
  hasPersistentHover?: boolean
}

interface BentoGridProps {
  items: BentoItem[]
}

function BentoGrid({ items }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'group relative px-4 py-3 rounded-xl overflow-hidden transition-all duration-300',
            'border border-white/10 bg-evergreen/50 backdrop-blur-md',
            'hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:bg-evergreen/65',
            'hover:-translate-y-0.5 will-change-transform',
            item.colSpan === 2 ? 'md:col-span-2' : 'col-span-1',
            item.hasPersistentHover && 'shadow-[0_2px_12px_rgba(0,0,0,0.2)]'
          )}
        >
          {/* Dot-grid texture on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:4px_4px]" />
          </div>

          {/* Horizontal layout: icon left, content right */}
          <div className="relative flex items-center gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 group-hover:bg-white/15 transition-all duration-300 ring-1 ring-white/10">
              {item.icon}
            </div>

            <div className="min-w-0 flex-1">
              {/* Title + meta on same line */}
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-porcelain/70 uppercase tracking-wide leading-none">
                  {item.title}
                </span>
                {item.status && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-porcelain/60 border border-white/10 leading-none">
                    {item.status}
                  </span>
                )}
              </div>

              {/* Meta value — the main number/label */}
              {item.meta && (
                <p className="text-sm font-bold text-porcelain mt-0.5 leading-tight truncate">
                  {item.meta}
                </p>
              )}
            </div>
          </div>

          {/* Tags row — compact, below the horizontal layout */}
          {item.tags && item.tags.length > 0 && (
            <div className="relative flex flex-wrap gap-1 mt-2">
              {item.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-white/8 border border-white/10 text-porcelain/50 text-[9px] font-medium leading-none"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export { BentoGrid }
