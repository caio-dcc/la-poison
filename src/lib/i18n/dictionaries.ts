import type { Language } from '@/contexts/LanguageContext'

export const dictionaries = {
  pt: {
    // Navigation & Common
    home: 'Início',
    drinks: 'Drinks',
    search: 'Pesquisar',
    filter: 'Filtrar',
    filters: 'Filtros',
    reset: 'Redefinir',
    resetFilters: 'Redefinir Filtros',
    showFilters: 'Mostrar Filtros',
    hideFilters: 'Ocultar Filtros',
    sortBy: 'Ordenar por',
    category: 'Categoria',
    categories: 'Categorias',
    ingredient: 'Ingrediente',
    ingredients: 'Ingredientes',
    difficulty: 'Dificuldade',
    abv: 'Álcool',
    prepTime: 'Tempo de Preparo',
    allCategories: 'Todas as Categorias',
    allLevels: 'Todos os Níveis',

    // Search & Filter Results
    searchPlaceholder: 'Pesquisar por nome ou categoria...',
    noCocktailsFound: 'Nenhum coquetel encontrado com seus filtros.',
    recipesFound: 'receita',
    recipesFoundPlural: 'receitas',
    of: 'de',
    cocktails: 'coquetéis',

    // Sort Options
    nameAZ: 'Nome (A-Z)',
    difficultyLow: 'Dificuldade',
    abvHigh: 'Álcool (Alto para Baixo)',

    // Pagination & Lists
    loading: 'Carregando...',
    noResults: 'Sem resultados',

    // Metadata
    cocktailRecipes: 'Receitas de Coquetéis',
    cocktailRecipesDesc:
      'Explore 425+ receitas de coquetéis com ingredientes, instruções e avaliações. Filtre por categoria, dificuldade e muito mais.',
    cocktailsWith: 'Coquetéis com',

    // Auth
    login: 'Login',
    signup: 'Cadastro',
    email: 'Email',
    password: 'Senha',
    confirmPassword: 'Confirmar Senha',
    loginWithGoogle: 'Entrar com Google',
    signupWithGoogle: 'Cadastrar com Google',
    forgotPassword: 'Esqueceu a senha?',
    loginError: 'Email ou senha inválidos',
    signupError: 'Erro ao criar conta',
    checkEmail: 'Verifique seu email para confirmar sua conta',
    alreadyHaveAccount: 'Já tem uma conta?',
    dontHaveAccount: 'Não tem uma conta?',
    or: 'ou',
  },

  en: {
    home: 'Home',
    drinks: 'Drinks',
    search: 'Search',
    filter: 'Filter',
    filters: 'Filters',
    reset: 'Reset',
    resetFilters: 'Reset Filters',
    showFilters: 'Show Filters',
    hideFilters: 'Hide Filters',
    sortBy: 'Sort By',
    category: 'Category',
    categories: 'Categories',
    ingredient: 'Ingredient',
    ingredients: 'Ingredients',
    difficulty: 'Difficulty',
    abv: 'Alcohol',
    prepTime: 'Prep Time',
    allCategories: 'All Categories',
    allLevels: 'All Levels',

    searchPlaceholder: 'Search by name or category...',
    noCocktailsFound: 'No cocktails found matching your filters.',
    recipesFound: 'recipe',
    recipesFoundPlural: 'recipes',
    of: 'of',
    cocktails: 'cocktails',

    nameAZ: 'Name (A-Z)',
    difficultyLow: 'Difficulty',
    abvHigh: 'Alcohol (High to Low)',

    loading: 'Loading...',
    noResults: 'No results',

    cocktailRecipes: 'Cocktail Recipes & Drinks',
    cocktailRecipesDesc:
      'Browse 425+ cocktail recipes with ingredients, instructions, and ratings. Filter by category, difficulty, and more.',
    cocktailsWith: 'Cocktails with',

    // Auth
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    loginWithGoogle: 'Login with Google',
    signupWithGoogle: 'Sign up with Google',
    forgotPassword: 'Forgot password?',
    loginError: 'Invalid email or password',
    signupError: 'Error creating account',
    checkEmail: 'Check your email to confirm your account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    or: 'or',
  },

  es: {
    home: 'Inicio',
    drinks: 'Bebidas',
    search: 'Buscar',
    filter: 'Filtrar',
    filters: 'Filtros',
    reset: 'Reiniciar',
    resetFilters: 'Reiniciar Filtros',
    showFilters: 'Mostrar Filtros',
    hideFilters: 'Ocultar Filtros',
    sortBy: 'Ordenar por',
    category: 'Categoría',
    categories: 'Categorías',
    ingredient: 'Ingrediente',
    ingredients: 'Ingredientes',
    difficulty: 'Dificultad',
    abv: 'Alcohol',
    prepTime: 'Tiempo de Preparación',
    allCategories: 'Todas las Categorías',
    allLevels: 'Todos los Niveles',

    searchPlaceholder: 'Buscar por nombre o categoría...',
    noCocktailsFound: 'No se encontraron cócteles que coincidan con tus filtros.',
    recipesFound: 'receta',
    recipesFoundPlural: 'recetas',
    of: 'de',
    cocktails: 'cócteles',

    nameAZ: 'Nombre (A-Z)',
    difficultyLow: 'Dificultad',
    abvHigh: 'Alcohol (Alto a Bajo)',

    loading: 'Cargando...',
    noResults: 'Sin resultados',

    cocktailRecipes: 'Recetas de Cócteles',
    cocktailRecipesDesc:
      'Explora 425+ recetas de cócteles con ingredientes, instrucciones y calificaciones. Filtra por categoría, dificultad y más.',
    cocktailsWith: 'Cócteles con',

    // Auth
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    loginWithGoogle: 'Iniciar Sesión con Google',
    signupWithGoogle: 'Registrarse con Google',
    forgotPassword: '¿Olvidó su contraseña?',
    loginError: 'Correo electrónico o contraseña inválidos',
    signupError: 'Error al crear cuenta',
    checkEmail: 'Verifique su correo electrónico para confirmar su cuenta',
    alreadyHaveAccount: '¿Ya tiene una cuenta?',
    dontHaveAccount: '¿No tiene una cuenta?',
    or: 'o',
  },
}

export function getDictionary(language: Language) {
  return dictionaries[language] || dictionaries.pt
}

export type Dictionary = (typeof dictionaries)['pt']
