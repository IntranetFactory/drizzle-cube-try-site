/**
 * Cloudflare Worker entry point for Hono drizzle-cube example
 * This is the entry point for Cloudflare Workers runtime
 */

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import postgres from 'postgres'
import { neon, neonConfig } from '@neondatabase/serverless'
import { createCubeApp } from 'drizzle-cube/adapters/hono'
import type { SecurityContext, DrizzleDatabase, CacheConfig } from 'drizzle-cube/server'
import { CloudflareKVProvider } from './cache/cloudflare-kv-provider'
import { schema, allCubes } from '../cubes.js'
import analyticsApp from './analytics-routes'
import notebooksApp from './notebooks-routes'
import aiApp from './ai-routes'
import { executeSeed } from './seed-utils.js'

// Configure Neon for Cloudflare Workers
neonConfig.poolQueryViaFetch = true

// Auto-detect Neon vs local PostgreSQL based on connection string
function isNeonUrl(url: string): boolean {
  return url.includes('.neon.tech') || url.includes('neon.database')
}

// Create database connection factory
function createDatabase(databaseUrl: string) {
  if (isNeonUrl(databaseUrl)) {
    console.log('🚀 Connecting to Neon serverless database')
    const sql = neon(databaseUrl)
    return drizzleNeon(sql, { schema })
  } else {
    console.log('🐘 Connecting to local PostgreSQL database')
    const client = postgres(databaseUrl)
    return drizzle(client, { schema })
  }
}

// Create database connection with Hyperdrive support (production)
function createDatabaseWithHyperdrive(
  hyperdrive: Hyperdrive | undefined,
  databaseUrl: string
) {
  // Priority 1: Use Hyperdrive if available (production with connection pooling)
  if (hyperdrive) {
    console.log('⚡ Connecting via Hyperdrive (connection pooling enabled)')
    const client = postgres(hyperdrive.connectionString)
    return drizzle(client, { schema })
  }
  // Priority 2: Fall back to existing logic (Neon serverless or local PostgreSQL)
  return createDatabase(databaseUrl)
}

// Define environment interface for Cloudflare Workers
interface CloudflareEnv {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>
  }
  DATABASE_URL: string
  NODE_ENV?: string
  GEMINI_API_KEY?: string
  CACHE?: KVNamespace  // KV binding for query result caching
  HYPERDRIVE?: Hyperdrive  // Hyperdrive binding for PostgreSQL connection pooling
  THUMBNAILS?: R2Bucket  // R2 binding for dashboard thumbnail storage
  // PDF export configuration
  CLOUDFLARE_ACCOUNT_ID?: string  // Cloudflare account ID for Browser Rendering API
  CF_BROWSER_RENDERING_TOKEN?: string   // Cloudflare API token with Browser Rendering permissions
  PUBLIC_URL?: string     // Public URL of deployed site (e.g., https://drizzle-cube.pages.dev)
}

interface Variables {
  db: DrizzleDatabase
  r2?: R2Bucket
  cfAccountId?: string
  cfApiToken?: string
  publicUrl?: string
}

// Security context extractor - same as main app
async function getSecurityContext(c: any): Promise<SecurityContext> {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader) {
    return {
      organisationId: 1,
      userId: 1,
    }
  }
  
  try {
    authHeader.replace('Bearer ', '')
    return {
      organisationId: 1,
      userId: 1,
    }
  } catch (error) {
    console.log('⚠️  Invalid authorization token - using default demo user (organisation: 1)')
    return {
      organisationId: 1,
      userId: 1,
    }
  }
}

const app = new Hono<{ Variables: Variables; Bindings: CloudflareEnv }>()

// Add middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Agent-Api-Key'],
  credentials: true
}))

// Initialize database and semantic layer per request
app.use('*', async (c, next) => {
  // Create database connection with Hyperdrive support (production) or fallback
  const db = createDatabaseWithHyperdrive(c.env.HYPERDRIVE, c.env.DATABASE_URL)
  c.set('db', db as DrizzleDatabase)

  await next()
})

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    runtime: 'Cloudflare Workers'
  })
})

// Create cube app using the new API
const createCubeApiApp = (db: DrizzleDatabase, cacheKV?: KVNamespace) => {
  // Configure cache if KV binding is available
  const cacheConfig: CacheConfig | undefined = cacheKV ? {
    provider: new CloudflareKVProvider(cacheKV, {
      defaultTtlMs: 3600000  // 60 minutes aggressive caching
    }),
    defaultTtlMs: 3600000,
    keyPrefix: 'drizzle-cube:',
    includeSecurityContext: true,
    onError: (error, operation) => {
      console.error(`[Cache Error] ${operation}: ${error.message}`)
    }
  } : undefined

  return createCubeApp({
    cubes: allCubes,
    drizzle: db,
    schema,
    extractSecurityContext: getSecurityContext,
    engineType: 'postgres',
    cache: cacheConfig,
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Agent-Api-Key'],
      credentials: true
    },
    // Public site mode: users provide their own Anthropic API keys.
    agent: {
      allowClientApiKey: true,
      model: 'claude-sonnet-4-6',
      maxTurns: 25
    }
  })
}

// Create a separate Hono app for cube API
const cubeApiApp = new Hono<{ Variables: Variables; Bindings: CloudflareEnv }>()

cubeApiApp.use('*', async (c) => {
  const db = c.get('db')
  const cacheKV = c.env.CACHE  // Get KV binding from environment

  // Create and use cube app for this request (with caching if KV available)
  const cubeApp = createCubeApiApp(db, cacheKV)

  // Forward the request to the cube app
  const response = await cubeApp.fetch(c.req.raw)
  return response
})

// Mount the cube API routes
app.route('/cubejs-api', cubeApiApp)
app.route('/mcp', cubeApiApp)


// API info endpoint
app.get('/api', (c) => {
  return c.json({
    name: 'Drizzle Cube Analytics API (Cloudflare Workers)',
    version: '1.0.0',
    status: 'running',
    runtime: 'Cloudflare Workers',
    endpoints: {
      'GET /api': 'This endpoint - API information',
      'GET /health': 'Health check',
      'GET /api/docs': 'API documentation with examples',
      'GET /cubejs-api/v1/meta': 'Available cubes and schema',
      'POST /cubejs-api/v1/load': 'Execute analytics queries',
      'GET /cubejs-api/v1/load?query=...': 'Execute queries via URL',
      'POST /cubejs-api/v1/sql': 'Generate SQL without execution',
      'GET /api/analytics-pages': 'List all dashboards',
      'POST /api/analytics-pages': 'Create new dashboard',
      'POST /api/analytics-pages/create-example': 'Create example dashboard',
      'GET /api/notebooks': 'List all notebooks',
      'POST /api/notebooks': 'Create new notebook',
      'POST /cubejs-api/v1/agent/chat': 'Agentic notebook chat (SSE)',
      'POST /api/ai/generate': 'Generate content with Gemini AI (proxy)',
      'GET /api/ai/health': 'AI service health check'
    }
  })
})

// Mount analytics pages API with database, R2, and PDF export configuration
app.use('/api/analytics-pages/*', async (c, next) => {
  c.set('db', c.get('db'))
  c.set('r2', c.env.THUMBNAILS)
  // PDF export configuration
  c.set('cfAccountId', c.env.CLOUDFLARE_ACCOUNT_ID)
  c.set('cfApiToken', c.env.CF_BROWSER_RENDERING_TOKEN)
  c.set('publicUrl', c.env.PUBLIC_URL)
  await next()
})
app.route('/api/analytics-pages', analyticsApp)

// Mount notebooks API with database access
app.use('/api/notebooks/*', async (c, next) => {
  c.set('db', c.get('db'))
  await next()
})
app.route('/api/notebooks', notebooksApp)

// Mount AI proxy routes with database access
app.use('/api/ai/*', async (c, next) => {
  c.set('db', c.get('db'))
  await next()
})
app.route('/api/ai', aiApp)

// Example protected endpoint showing how to use the same security context
app.get('/api/user-info', async (c) => {
  try {
    const securityContext = await getSecurityContext(c)
    
    return c.json({
      organisationId: securityContext.organisationId,
      userId: securityContext.userId,
      message: 'This endpoint uses the same security context as the cube API'
    })
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : 'Unauthorized' 
    }, 401)
  }
})

// GitHub stars endpoint with KV caching
app.get('/api/github-stars', async (c) => {
  const cacheKey = 'github:stars:cliftonc/drizzle-cube'
  const cacheKV = c.env.CACHE

  // Check cache first
  if (cacheKV) {
    const cached = await cacheKV.get(cacheKey)
    if (cached) {
      return c.json({ stars: parseInt(cached, 10), cached: true })
    }
  }

  try {
    // Fetch from GitHub API
    const res = await fetch('https://api.github.com/repos/cliftonc/drizzle-cube', {
      headers: { 'User-Agent': 'drizzle-cube-try-site' }
    })

    if (!res.ok) {
      console.error(`GitHub API error: ${res.status}`)
      return c.json({ stars: null, error: 'GitHub API unavailable' }, 502)
    }

    const data = await res.json() as { stargazers_count?: number }
    const stars = data.stargazers_count ?? 0

    // Cache for 1 hour
    if (cacheKV) {
      await cacheKV.put(cacheKey, stars.toString(), { expirationTtl: 3600 })
    }

    return c.json({ stars, cached: false })
  } catch (error) {
    console.error('GitHub stars fetch error:', error)
    return c.json({ stars: null, error: 'Failed to fetch stars' }, 500)
  }
})

// Serve static assets and handle SPA routing
app.get('*', async (c) => {
  // Use the ASSETS binding to serve static files with SPA fallback
  return await c.env.ASSETS.fetch(c.req.raw)
})

// Scheduled event handler for cron triggers
async function scheduled(_event: any, env: CloudflareEnv, _ctx: any): Promise<void> {
  console.log('🕒 Scheduled event triggered at:', new Date().toISOString())

  try {
    // Create database connection with Hyperdrive support (production) or fallback
    const db = createDatabaseWithHyperdrive(env.HYPERDRIVE, env.DATABASE_URL)
    
    console.log('🌱 Starting scheduled database seeding...')
    const result = await executeSeed(db)
    
    if (result.success) {
      console.log('✅ Scheduled database seeding completed successfully')
    } else {
      console.error('❌ Scheduled database seeding failed:', result.error)
      throw new Error(`Seeding failed: ${result.error}`)
    }
  } catch (error) {
    console.error('❌ Scheduled event error:', error)
    throw error
  }
}

export default {
  fetch: app.fetch,
  scheduled
}

