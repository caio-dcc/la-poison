interface YouTubeLinkProps {
  drinkName: string
  locale?: string
}

const labels = {
  pt: {
    label: 'Ver no YouTube',
    query: (name: string) => `Como fazer ${name}`,
  },
  en: {
    label: 'Watch on YouTube',
    query: (name: string) => `How to make ${name} cocktail`,
  },
  es: {
    label: 'Ver en YouTube',
    query: (name: string) => `Cómo preparar ${name}`,
  },
}

export function YouTubeLink({ drinkName, locale = 'pt' }: YouTubeLinkProps) {
  const l = labels[locale as keyof typeof labels] ?? labels.pt
  const searchQuery = encodeURIComponent(l.query(drinkName))
  const href = `https://www.youtube.com/results?search_query=${searchQuery}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-evergreen/60 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-white/10 p-5 hover:bg-white/10 hover:ring-white/30 transition-colors group"
    >
      {/* YouTube icon */}
      <span className="shrink-0 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center group-hover:bg-red-700 transition-colors">
        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-porcelain group-hover:text-white transition-colors text-sm leading-tight">
          {l.label}
        </p>
        <p className="text-xs text-porcelain/60 truncate mt-0.5">{l.query(drinkName)}</p>
      </div>
      {/* External link arrow */}
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 text-porcelain/40 shrink-0 ml-auto group-hover:text-white transition-colors"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
          clipRule="evenodd"
        />
      </svg>
    </a>
  )
}
