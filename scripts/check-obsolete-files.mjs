import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Pastas e arquivos para ignorar ao buscar arquivos no repositório
const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'public', '.swc', 'coverage', 'supabase', 'tests']
const IGNORED_FILES = [
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'next-env.d.ts',
  '.eslintrc.json',
  '.gitignore',
  'README.md',
  'tsconfig.json',
  'postcss.config.js',
  'postcss.config.mjs',
  'eslint.config.mjs',
  'tailwind.config.ts',
  'tailwind.config.js',
  'next.config.ts',
  'next.config.js',
  'vitest.config.ts',
  'playwright.config.ts',
  'components.json',
]

// Extensões de código fonte que vamos analisar
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

// Entry points do Next.js e outros arquivos que nunca são importados diretamente, mas são usados pelo framework
const ENTRY_POINTS_REGEX = /^(page|layout|loading|error|not-found|route|middleware|default|template|robots|sitemap)\.(tsx|ts|jsx|js)$/i

// Função recursiva para listar todos os arquivos
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const relativePath = path.relative(rootDir, filePath)
    const baseName = path.basename(file)

    // Ignorar diretórios específicos
    if (fs.statSync(filePath).isDirectory()) {
      if (!IGNORED_DIRS.includes(baseName)) {
        getAllFiles(filePath, fileList)
      }
    } else {
      // Ignorar arquivos específicos
      if (!IGNORED_FILES.includes(baseName)) {
        fileList.push(filePath)
      }
    }
  }
  return fileList
}

// Extrai todos os caminhos de importação de um arquivo
function getImportsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const imports = new Set()

  // Regex para capturar imports estáticos (ex: import { x } from './y')
  const staticImportRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g
  // Regex para capturar imports dinâmicos (ex: import('./y'))
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  // Regex para requires (ex: require('./y'))
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  
  let match
  while ((match = staticImportRegex.exec(content)) !== null) imports.add(match[1])
  while ((match = dynamicImportRegex.exec(content)) !== null) imports.add(match[1])
  while ((match = requireRegex.exec(content)) !== null) imports.add(match[1])

  return Array.from(imports)
}

// Resolve o caminho de um import para um arquivo absoluto
function resolveImportPath(importerPath, importString) {
  // Ignora pacotes de terceiros e built-ins do Node (ex: 'react', 'fs', '@supabase/ssr')
  if (!importString.startsWith('.') && !importString.startsWith('@/')) {
    return null
  }

  let targetPath = importString
  
  // Resolve alias '@/...' para 'src/...'
  if (importString.startsWith('@/')) {
    targetPath = path.join(rootDir, 'src', importString.slice(2))
  } else {
    // Resolve caminho relativo
    targetPath = path.join(path.dirname(importerPath), importString)
  }

  // Se o caminho aponta para um arquivo exato
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return targetPath
  }

  // Tenta adicionar extensões
  for (const ext of SOURCE_EXTENSIONS) {
    const pathWithExt = targetPath + ext
    if (fs.existsSync(pathWithExt) && fs.statSync(pathWithExt).isFile()) {
      return pathWithExt
    }
  }

  // Tenta resolver como index (ex: importando um diretório)
  for (const ext of SOURCE_EXTENSIONS) {
    const indexPath = path.join(targetPath, `index${ext}`)
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      return indexPath
    }
  }

  return null
}

console.log('🔍 Analisando repositório para encontrar arquivos obsoletos...\n')

// 1. Coleta todos os arquivos do repositório
const allFiles = getAllFiles(rootDir)
console.log(`📂 Total de arquivos analisados: ${allFiles.length}`)

// 2. Filtra apenas arquivos fonte
const sourceFiles = allFiles.filter(file => SOURCE_EXTENSIONS.some(ext => file.endsWith(ext)))

// 3. Monta o conjunto de arquivos que são referenciados (importados) em algum lugar
const referencedFiles = new Set()

for (const file of sourceFiles) {
  const imports = getImportsFromFile(file)
  for (const imp of imports) {
    const resolvedPath = resolveImportPath(file, imp)
    if (resolvedPath) {
      referencedFiles.add(resolvedPath)
    }
  }
}

// 4. Determina quais arquivos não são referenciados
const unreferencedFiles = []

for (const file of allFiles) {
  const relativePath = path.relative(rootDir, file)
  const baseName = path.basename(file)
  const isSource = SOURCE_EXTENSIONS.some(ext => file.endsWith(ext))

  // Se for arquivo fonte e não for importado
  if (isSource && !referencedFiles.has(file)) {
    // Verifica se é um entry point (page.tsx, layout.tsx, etc)
    const isEntryPoint = ENTRY_POINTS_REGEX.test(baseName)
    
    // Verifica se é um script do diretório 'scripts'
    const isScript = relativePath.startsWith('scripts\\') || relativePath.startsWith('scripts/')
    
    // Se não for entry point e não for um script solto, ele está órfão!
    if (!isEntryPoint && !isScript) {
      unreferencedFiles.push(relativePath)
    }
  }
}

// 5. Exibe o resultado
if (unreferencedFiles.length > 0) {
  console.log('\n⚠️ Os seguintes arquivos parecem NÃO estar sendo usados (são candidatos a obsoletos):')
  console.log('--------------------------------------------------------------------------------')
  unreferencedFiles.forEach(file => console.log(`- ${file}`))
  console.log('--------------------------------------------------------------------------------')
  console.log(`Total de arquivos possivelmente obsoletos: ${unreferencedFiles.length}`)
  console.log('\n💡 ATENÇÃO: Verifique os arquivos manualmente antes de excluí-los.')
  console.log('   Eles podem estar sendo usados dinamicamente ou serem arquivos de configuração não detectados.')
} else {
  console.log('\n✅ Tudo limpo! Nenhum arquivo obsoleto encontrado.')
}
