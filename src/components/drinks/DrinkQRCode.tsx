'use client'

import { useState } from 'react'

interface DrinkQRCodeProps {
  url: string
  drinkName: string
  drinkImage: string
  locale?: string
  isPro?: boolean
}

const labels = {
  pt: {
    title: 'QR Code',
    subtitle: 'Escaneie para compartilhar',
    openPrint: 'Imprimir / Compartilhar',
    printBtn: 'Imprimir',
    upsell: 'Faça upgrade para Pro para imprimir',
    close: 'Fechar',
  },
  en: {
    title: 'QR Code',
    subtitle: 'Scan to share',
    openPrint: 'Print / Share',
    printBtn: 'Print',
    upsell: 'Upgrade to Pro to print',
    close: 'Close',
  },
  es: {
    title: 'Código QR',
    subtitle: 'Escanea para compartir',
    openPrint: 'Imprimir / Compartir',
    printBtn: 'Imprimir',
    upsell: 'Actualiza a Pro para imprimir',
    close: 'Cerrar',
  },
}

export function DrinkQRCode({
  url,
  drinkName,
  drinkImage,
  locale = 'pt',
  isPro = false,
}: DrinkQRCodeProps) {
  const [showModal, setShowModal] = useState(false)
  const l = labels[locale as keyof typeof labels] ?? labels.pt

  // Google Chart API — no package, no JS, works at SSR time
  const qrSrc = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(url)}&choe=UTF-8&chld=M|1`

  return (
    <>
      {/* QR Code card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 flex flex-col items-center gap-4 w-full">
        <p className="text-sm font-semibold text-evergreen text-center">{l.title}</p>
        <div className="flex justify-center w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`QR Code — ${drinkName}`}
            width={180}
            height={180}
            className="rounded-lg bg-white border border-gray-200"
            loading="eager"
            onError={e => {
              console.warn('QR Code failed to load:', qrSrc)
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        <p className="text-xs text-shadow-grey/60 text-center">{l.subtitle}</p>

        {/* Trigger button */}
        <button
          onClick={() => setShowModal(true)}
          className="mt-3 w-full text-sm font-semibold text-porcelain bg-evergreen hover:bg-hunter-green rounded-xl py-2 px-4 transition-colors"
        >
          {l.openPrint}
        </button>
      </div>

      {/* Print modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 print:hidden"
          onClick={() => setShowModal(false)}
        >
          <div
            className="print-content relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-shadow-grey/50 hover:text-shadow-grey text-xl leading-none print:hidden"
              aria-label={l.close}
            >
              ✕
            </button>

            {/* Drink image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={drinkImage}
              alt={drinkName}
              className="w-full aspect-square object-cover rounded-xl"
            />

            {/* Drink name */}
            <h2 className="text-xl font-bold text-evergreen text-center">{drinkName}</h2>

            {/* QR code */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt={`QR Code — ${drinkName}`}
              width={160}
              height={160}
              className="rounded-lg"
            />

            {/* Print button or upsell */}
            {isPro ? (
              <button
                onClick={() => window.print()}
                className="w-full bg-hunter-green text-porcelain font-semibold rounded-xl py-3 hover:bg-evergreen transition-colors print:hidden"
              >
                {l.printBtn}
              </button>
            ) : (
              <a
                href={`/${locale}/pricing`}
                className="w-full text-center bg-evergreen text-porcelain font-semibold rounded-xl py-3 hover:bg-hunter-green transition-colors block print:hidden"
              >
                {l.upsell}
              </a>
            )}
          </div>
        </div>
      )}
    </>
  )
}
