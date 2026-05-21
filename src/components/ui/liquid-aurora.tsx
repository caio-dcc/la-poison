import React from 'react'

export const LiquidAurora = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-evergreen">
      {/* The background shapes that form the aurora */}
      <div className="liquid-shape shape-1" />
      <div className="liquid-shape shape-2" />
      <div className="liquid-shape shape-3" />
    </div>
  )
}
