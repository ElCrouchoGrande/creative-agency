import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
  // Strip "file:" prefix if present
  const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : dbUrl
  const resolvedPath = path.resolve(process.cwd(), dbPath)
  const adapter = new PrismaBetterSqlite3({ url: resolvedPath })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
