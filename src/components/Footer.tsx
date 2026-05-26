'use client'

const footerLabels = {
  pt: {
    privacy: 'Privacidade',
    terms: 'Termos',
    allRightsReserved: 'Todos os direitos reservados',
    cocktailRecipes: 'Receitas de coquetéis',
  },
  en: {
    privacy: 'Privacy',
    terms: 'Terms',
    allRightsReserved: 'All rights reserved',
    cocktailRecipes: 'Cocktail recipes',
  },
  es: {
    privacy: 'Privacidad',
    terms: 'Términos',
    allRightsReserved: 'Todos los derechos reservados',
    cocktailRecipes: 'Recetas de cócteles',
  },
}

export function Footer({ locale }: { locale: string }) {
  const labels = footerLabels[locale as keyof typeof footerLabels] || footerLabels.pt
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/8 bg-[#0a0a0a] text-porcelain/60 py-4 px-4 text-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          &copy; {year} LaPoison — {labels.cocktailRecipes}. {labels.allRightsReserved}.
        </p>
        <nav className="flex gap-4">
          <a href={`/${locale}/privacy`} className="hover:text-porcelain transition-colors">
            {labels.privacy}
          </a>
          <a href={`/${locale}/terms`} className="hover:text-porcelain transition-colors">
            {labels.terms}
          </a>
        </nav>
      </div>
    </footer>
  )
}
