'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getIngredientName } from '@/lib/i18n/translate'

interface Ingredient {
  name: string
  name_i18n?: Record<string, string> | null
  slug?: string
  measure_text?: string
  amount_ml?: number | null
}

interface DrinkQRCodeProps {
  url: string
  drinkName: string
  drinkImage: string
  locale?: string
  isPro?: boolean
  ingredients?: Ingredient[]
  instructions?: string | null
  description?: string | null
  categoryName?: string
  difficulty?: number
  abv?: number
  prepTime?: number
}

const labels = {
  pt: {
    title: 'QR Code',
    subtitle: 'Escaneie para ver no site',
    openPrint: 'Imprimir / Compartilhar',
    printBtn: 'Imprimir / Salvar PDF',
    close: 'Fechar',
    ingredients: 'Ingredientes',
    instructions: 'Modo de Preparo',
    difficulty: 'Dificuldade',
    abv: 'Teor Alcoólico',
    prepTime: 'Tempo de Preparo',
    category: 'Categoria',
    pdfTip: 'Dica: Escolha "Salvar como PDF" no destino da impressão para baixar o arquivo.',
  },
  en: {
    title: 'QR Code',
    subtitle: 'Scan to see on site',
    openPrint: 'Print / Share',
    printBtn: 'Print / Save PDF',
    close: 'Close',
    ingredients: 'Ingredients',
    instructions: 'Instructions',
    difficulty: 'Difficulty',
    abv: 'ABV',
    prepTime: 'Prep Time',
    category: 'Category',
    pdfTip: 'Tip: Choose "Save as PDF" as the printer destination to download.',
  },
  es: {
    title: 'Código QR',
    subtitle: 'Escanea para ver en el sitio',
    openPrint: 'Imprimir / Compartir',
    printBtn: 'Imprimir / Guardar PDF',
    close: 'Cerrar',
    ingredients: 'Ingredientes',
    instructions: 'Instrucciones',
    difficulty: 'Dificultad',
    abv: 'Graduación',
    prepTime: 'Tiempo de prep.',
    category: 'Categoría',
    pdfTip: 'Consejo: Seleccione "Guardar como PDF" en el destino de impresión para descargar.',
  },
}

export function DrinkQRCode({
  url,
  drinkName,
  drinkImage,
  locale = 'pt',
  ingredients = [],
  instructions = '',
  description = '',
  categoryName = '',
  difficulty,
  abv,
  prepTime,
}: DrinkQRCodeProps) {
  const [showModal, setShowModal] = useState(false)
  const l = labels[locale as keyof typeof labels] ?? labels.pt

  const instructionSteps = instructions
    ? instructions.split(/(?<=[.!])\s+(?=[A-Z1-9])/).filter(s => s.trim().length > 0)
    : []

  return (
    <>
      {/* QR Code card */}
      <div className="bg-evergreen/60 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-white/10 p-6 flex flex-col items-center gap-4 w-full">
        <p className="text-sm font-semibold text-porcelain text-center">{l.title}</p>
        <div className="flex justify-center w-full">
          <QRCodeSVG
            value={url}
            size={180}
            bgColor="#ffffff"
            fgColor="#14281D"
            level="M"
            className="rounded-lg border border-gray-200"
          />
        </div>
        <p className="text-xs text-porcelain/60 text-center">{l.subtitle}</p>

        {/* Trigger button */}
        <button
          onClick={() => setShowModal(true)}
          className="mt-3 w-full text-sm font-semibold text-evergreen bg-porcelain hover:bg-white rounded-xl py-2 px-4 transition-colors"
        >
          {l.openPrint}
        </button>
      </div>

      {/* Print modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-0 print:overflow-visible"
          onClick={() => setShowModal(false)}
        >
          <div
            className="print-recipe-sheet relative bg-evergreen/95 text-porcelain border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full p-6 md:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:text-black print:border-none print:p-0 print:shadow-none"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-porcelain/50 hover:text-white text-xl leading-none print:hidden z-10"
              aria-label={l.close}
            >
              ✕
            </button>

            {/* Print Recipe Content */}
            <div className="flex flex-col md:flex-row print:flex-row gap-6">
              {/* Left Column: Image, Stats, QR Code */}
              <div className="w-full md:w-1/3 print:w-1/3 flex flex-col gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={drinkImage}
                  alt={drinkName}
                  className="w-full aspect-square object-cover rounded-xl border border-white/10 print:border-black/10"
                />

                {/* Details box */}
                <div className="space-y-2.5 text-xs bg-white/5 p-4 rounded-xl print:bg-black/5 print:text-black print:border print:border-black/5">
                  {categoryName && (
                    <div className="flex justify-between">
                      <span className="opacity-70 print:opacity-80">{l.category}</span>
                      <span className="font-semibold">{categoryName}</span>
                    </div>
                  )}
                  {difficulty && (
                    <div className="flex justify-between">
                      <span className="opacity-70 print:opacity-80">{l.difficulty}</span>
                      <span className="font-semibold text-hunter-green print:text-black">
                        {'★'.repeat(difficulty)}
                        {'☆'.repeat(5 - difficulty)}
                      </span>
                    </div>
                  )}
                  {abv !== undefined && (
                    <div className="flex justify-between">
                      <span className="opacity-70 print:opacity-80">{l.abv}</span>
                      <span className="font-semibold">{abv}%</span>
                    </div>
                  )}
                  {prepTime && (
                    <div className="flex justify-between">
                      <span className="opacity-70 print:opacity-80">{l.prepTime}</span>
                      <span className="font-semibold">{prepTime} min</span>
                    </div>
                  )}
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-white/10 print:border-gray-200">
                  <QRCodeSVG value={url} size={110} bgColor="#ffffff" fgColor="#14281D" level="M" />
                  <p className="text-[10px] text-gray-500 text-center font-medium leading-tight">
                    {l.subtitle}
                  </p>
                </div>
              </div>

              {/* Right Column: Title, Description, Ingredients, Instructions */}
              <div className="w-full md:w-2/3 print:w-2/3 flex flex-col gap-5">
                <div>
                  <h2 className="text-3xl font-bold text-porcelain print:text-black mb-1">
                    {drinkName}
                  </h2>
                  {description && (
                    <p className="text-sm text-porcelain/80 print:text-black/80 italic leading-relaxed mt-2">
                      {description}
                    </p>
                  )}
                </div>

                {/* Ingredients section */}
                {ingredients.length > 0 && (
                  <div>
                    <h3 className="text-base font-bold text-porcelain print:text-black border-b border-white/10 print:border-black/10 pb-1.5 mb-2.5">
                      {l.ingredients}
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {ingredients.map((ing, idx) => {
                        const translatedName = getIngredientName(ing, locale)
                        return (
                          <li key={idx} className="flex items-baseline gap-2">
                            {ing.measure_text && (
                              <span className="font-semibold text-porcelain/90 print:text-black/90 min-w-[70px] shrink-0">
                                {ing.measure_text}
                              </span>
                            )}
                            <span className="text-porcelain/70 print:text-black/70">
                              {translatedName}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}

                {/* Instructions section */}
                {instructions && (
                  <div>
                    <h3 className="text-base font-bold text-porcelain print:text-black border-b border-white/10 print:border-black/10 pb-1.5 mb-2.5">
                      {l.instructions}
                    </h3>
                    <div className="text-sm text-porcelain/80 print:text-black/80 leading-relaxed">
                      {instructionSteps.length > 1 ? (
                        <ol className="space-y-2 list-decimal list-inside">
                          {instructionSteps.map((step, idx) => (
                            <li key={idx} className="pl-1">
                              <span className="align-middle">{step.trim()}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p>{instructions}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Print actions / PDF download buttons (hidden on print) */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-hunter-green text-porcelain font-semibold rounded-xl py-3 hover:bg-evergreen transition-colors flex items-center justify-center gap-2"
              >
                {/* Print/PDF icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-1 9H8v2h4v-2z"
                    clipRule="evenodd"
                  />
                </svg>
                {l.printBtn}
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="sm:w-32 bg-white/10 text-porcelain font-semibold rounded-xl py-3 hover:bg-white/20 transition-colors"
              >
                {l.close}
              </button>
            </div>

            <p className="text-[11px] text-porcelain/50 text-center mt-1 print:hidden">
              {l.pdfTip}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
