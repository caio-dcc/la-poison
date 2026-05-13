/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
let db: any = null

export function getDb(): any {
  if (!db) {
    // Prisma 7 ESM/CJS compatibility
    try {
      const { PrismaClient } = require('@prisma/client')
      db = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
      })
    } catch {
      throw new Error('Failed to initialize Prisma client')
    }
  }
  return db
}
