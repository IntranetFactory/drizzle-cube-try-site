/**
 * Complete Hono app example with drizzle-cube integration
 * This demonstrates how to create a production-ready analytics API using Hono and drizzle-cube
 */

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { drizzle } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import postgres from 'postgres'
import { Pool } from '@neondatabase/serverless'
import { createCubeApp } from 'drizzle-cube/adapters/hono'
import type { SecurityContext, DrizzleDatabase } from 'drizzle-cube/server'
import { buildCubes } from './cubes'
import * as drizzleSchema from './drizzle_schema'
import analyticsApp from './src/analytics-routes'
import notebooksApp from './src/notebooks-routes'
import aiApp from './src/ai-routes'
import { sql } from 'drizzle-orm'
import type { RLSSetupFn } from 'drizzle-cube'

interface Variables {
  db: DrizzleDatabase
  cfAccountId?: string
  cfApiToken?: string
  publicUrl?: string
  semantiusUser: unknown
  domain: string
  domain_cubes: any[]
  module_cubes: Record<string, any>
}

// Environment detection - handle both Node.js and Cloudflare Workers
function getEnvironment() {
  // Check if we're in Cloudflare Workers
  if (typeof globalThis !== 'undefined' && 'caches' in globalThis) {
    return 'worker'
  }
  // Check if we're in Node.js
  if (typeof process !== 'undefined' && process.env) {
    return 'node'
  }
  return 'unknown'
}

// Get environment variable with fallback for different runtimes
function getEnvVar(key: string, fallback: string = ''): string {
  const env = getEnvironment()

  if (env === 'node' && typeof process !== 'undefined') {
    return process.env[key] || fallback
  }

  // For Cloudflare Workers, we'll set this up in the handler
  return fallback
}

// Auto-detect Neon vs local PostgreSQL based on connection string
function isNeonUrl(url: string): boolean {
  return url.includes('.neon.tech') || url.includes('neon.database')
}

// Create database connection factory
// *TODO* remove drizzleSchema 
function createDatabase(databaseUrl: string) {
  if (isNeonUrl(databaseUrl)) {
    console.log('🚀 Connecting to Neon serverless database')
    const pool = new Pool({ connectionString: databaseUrl })
    return drizzleNeon(pool, { schema: drizzleSchema })
  } else {
    console.log('🐘 Connecting to local PostgreSQL database')
    const client = postgres(databaseUrl)
    return drizzle(client, { schema: drizzleSchema })
  }
}

// Fallback database connection for Node.js environment (used if semantiusUser has no databaseUrl)
const defaultConnectionString = 'postgresql://drizzle_user:drizzle_pass123@localhost:54921/drizzle_cube_db'

// Security context extractor - customize based on your auth system
// This function is called for EVERY API request to extract user permissions
async function extractSecurityContext(c: any): Promise<SecurityContext> {
  // Example: Extract from JWT token or session
  const authHeader = c.req.header('Authorization')

  // For development/demo purposes, allow requests without auth
  if (!authHeader) {
    return {
      organisationId: 1, // Default demo organisation
      userId: 1,         // Default demo user
      // Add other security context fields as needed
    }
  }

  // In production, decode JWT and extract user info
  // For this example, we'll use a simple approach
  try {
    // Mock JWT decode - replace with your actual JWT library
    authHeader.replace('Bearer ', '')

    // For demo purposes, assume organisationId is in the token
    // In real implementation, decode JWT and extract user context
    return {
      organisationId: 1, // Extract from token
      userId: 1,         // Extract from token
      // Add other security context fields as needed
    }
  } catch (error) {
    console.log('⚠️  Invalid authorization token - using default demo user (organisation: 1)')
    return {
      organisationId: 1, // Fallback to demo organisation
      userId: 1,         // Fallback to demo user
    }
  }
}

// Create the main Hono app
const app = new Hono<{ Variables: Variables }>()

// Add middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Agent-Api-Key', 'X-Agent-Provider', 'X-Agent-Model', 'X-Agent-Base-URL'],
}))

function buildOutHeaders(c: any, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'x-auth-server-api-key': getEnvVar('AUTH_SERVER_API_KEY'),
    ...extra,
  }
  const authorization = c.req.header('Authorization')
  const xApiKey = c.req.header('x-api-key')
  if (authorization) headers['Authorization'] = authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`
  if (xApiKey) headers['x-api-key'] = xApiKey
  return headers
}

// Semantius auth middleware - validates every request
app.use('*', async (c, next) => {
  const org = getEnvVar('SEMANTIUS_ORG')

  const authRes = await fetch(`https://api.semantius.cloud/tenant/${org}`, {
    headers: buildOutHeaders(c),
  })

  if (authRes.status !== 200) {
    const body = await authRes.text()
    console.log('[semantius] error', authRes.status, body)
    return new Response(body, {
      status: authRes.status,
      headers: Object.fromEntries(authRes.headers.entries()),
    })
  }

  const semantiusUser = await authRes.json()
  console.log('[semantius] semantiusUser context') //, semantiusUser)
  c.set('semantiusUser', semantiusUser)

  // Create per-tenant database connection from semantiusUser.databaseUrl
  const dbUrl = (semantiusUser as any)?.databaseUrl || getEnvVar('DATABASE_URL', defaultConnectionString)
  const db = createDatabase(dbUrl)
  c.set('db', db as DrizzleDatabase)

  await next()
})

// Root endpoint with available routes
app.get('/', (c) => {
  return c.json({
    name: 'Drizzle Cube Analytics API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      'GET /': 'This endpoint - API information',
      'GET /health': 'Health check',
      'GET /api/docs': 'API documentation with examples',
      'GET /cubejs-api/v1/meta': 'Available cubes and schema',
      'POST /cubejs-api/v1/load': 'Execute analytics queries',
      'GET /cubejs-api/v1/load?query=...': 'Execute queries via URL',
      'POST /cubejs-api/v1/sql': 'Generate SQL without execution',
      'POST /cubejs-api/v1/explain': 'Get query execution plan (EXPLAIN)',
      'GET /api/analytics-pages': 'List all dashboards',
      'POST /api/analytics-pages': 'Create new dashboard',
      'POST /api/analytics-pages/create-example': 'Create example dashboard',
      'GET /api/notebooks': 'List all notebooks',
      'POST /api/notebooks': 'Create new notebook',
      'POST /cubejs-api/v1/agent/chat': 'Agentic notebook chat (SSE)',
      'POST /api/ai/generate': 'Generate content with Gemini AI (proxy)',
      'POST /api/ai/explain/analyze': 'Analyze EXPLAIN plan with AI recommendations',
      'GET /api/ai/health': 'AI service health check'
    },
    frontend: {
      'React Dashboard': 'http://localhost:3000',
      'pgAdmin': 'http://localhost:5050'
    },
    database: {
      'PostgreSQL': 'localhost:54921'
    }
  })
})

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API documentation endpoint
app.get('/api/docs', (c) => {
  // Get metadata from the cube app (we could also create a temporary semantic layer for this)
  // For now, we'll provide static documentation. In a real app, you might extract this from the cubes
  const { allCubes } = buildCubes()
  const metadata = allCubes.map(cube => ({
    name: cube.name,
    title: cube.title || cube.name,
    description: cube.description,
    dimensions: Object.keys(cube.dimensions || {}),
    measures: Object.keys(cube.measures || {})
  }))

  return c.json({
    title: 'Employee Analytics API',
    description: 'Drizzle-cube powered analytics API with Cube.js compatibility',
    version: '1.0.0',
    endpoints: {
      'GET /cubejs-api/v1/meta': 'Get available cubes and their schema',
      'POST /cubejs-api/v1/load': 'Execute analytics queries',
      'GET /cubejs-api/v1/load': 'Execute queries via query string',
      'POST /cubejs-api/v1/sql': 'Generate SQL without execution',
      'GET /cubejs-api/v1/sql': 'Generate SQL via query string',
      'POST /cubejs-api/v1/explain': 'Get query execution plan (EXPLAIN ANALYZE)',
      'POST /cubejs-api/v1/agent/chat': 'Agentic notebook chat (requires X-Agent-Api-Key)',
      'GET /api/notebooks': 'List notebooks',
      'POST /api/notebooks': 'Create notebook',
      'POST /api/ai/explain/analyze': 'Analyze EXPLAIN plan with AI recommendations'
    },
    cubes: metadata,
    examples: {
      'Employee count by department': {
        measures: ['Employees.count'],
        dimensions: ['Departments.name'],
        cubes: ['Employees', 'Departments']
      },
      'Salary analytics': {
        measures: ['Employees.avgSalary', 'Employees.totalSalary'],
        dimensions: ['Departments.name'],
        cubes: ['Employees', 'Departments']
      },
      'Active employees only': {
        measures: ['Employees.activeCount'],
        dimensions: ['Departments.name'],
        cubes: ['Employees', 'Departments'],
        filters: [{
          member: 'Employees.isActive',
          operator: 'equals',
          values: [true]
        }]
      }
    }
  })
})

// Per-request cube app: fetch domain cubes, build cubes, and create isolated app
app.all('/:domain/cubejs-api/*', async (c) => {
  const domain = c.req.param('domain')
  console.log('domain:', domain)
  c.set('domain', domain)

  // Fetch domain_cubes from Semantius and set on context
  const semantiusUser = c.get('semantiusUser') as { postgrestUrl: string; access_token: string }
  if (semantiusUser?.postgrestUrl && semantiusUser?.access_token) {
    try {
      const rpcRes = await fetch(`${semantiusUser.postgrestUrl}/rpc/get_module_cubes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${semantiusUser.access_token}`,
        },
        body: JSON.stringify({ p_module_name: domain }),
      })
      const domain_cubes = await rpcRes.json() as any[]
      c.set('domain_cubes', domain_cubes)
      console.log(`[get_module_cubes] fetched ${domain_cubes.length} cubes for domain "${domain}"`)
    } catch (err) {
      console.error('[get_module_cubes] error:', err)
    }
  }

  // buildCubes reads domain_cubes from context and derives everything
  const { schema, allCubes, cubeSchemaJSON } = buildCubes(c)

  // Expose cubeSchemaJSON as module_cubes for downstream consumers
  c.set('module_cubes', cubeSchemaJSON)

  const db = c.get('db')

  const rlsSetup: RLSSetupFn = async (tx, securityContext) => {

    console.log('RLS setup -claims:', securityContext.semantiusUser?.claims)

    const sub = securityContext.semantiusUser?.claims?.sub
        
    await tx.execute(sql.raw(`SET ROLE authenticated`))
    await tx.execute(sql.raw(`SELECT set_config('role', 'semantius_user', true)`))
    await tx.execute(sql.raw(`SELECT set_config('request.jwt.claim.sub', '${sub}', true)`))
    await tx.execute(sql.raw(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`))
    await tx.execute(sql.raw(`SELECT set_config('request.jwt.claim.aud', '', true)`))
  }



  const cubeApp = createCubeApp({
    cubes: allCubes,
    drizzle: db,
    schema: schema as any,
    engineType: 'postgres',
    basePath: '/v1',
    rlsSetup,
    agent: {
      allowClientApiKey: true,
      maxTurns: 25
    },
    extractSecurityContext: async () => {
      // console.log('[semantius] extractSecurityContext - semantiusUser:', semantiusUser)
      return {
        semantiusUser
      };
    }
  })

  // Strip /:domain/cubejs-api prefix so the inner app sees /v1/*
  const url = new URL(c.req.url)
  url.pathname = url.pathname.replace(`/${domain}/cubejs-api`, '')
  const rewrittenRequest = new Request(url.toString(), c.req.raw)
  return cubeApp.fetch(rewrittenRequest, c.env)
})

// Mount analytics pages API with database and PDF export configuration
app.use('/api/analytics-pages/*', async (c, next) => {
  // PDF export configuration (from .env for Node.js)
  c.set('cfAccountId', getEnvVar('CLOUDFLARE_ACCOUNT_ID'))
  c.set('cfApiToken', getEnvVar('CF_BROWSER_RENDERING_TOKEN'))
  c.set('publicUrl', getEnvVar('PUBLIC_URL'))
  await next()
})
app.route('/api/analytics-pages', analyticsApp)

// Mount notebooks API with database access
app.use('/api/notebooks/*', async (_c, next) => {
  await next()
})
app.route('/api/notebooks', notebooksApp)

// Mount AI proxy routes with database access
app.use('/api/ai/*', async (_c, next) => {
  await next()
})
app.route('/api/ai', aiApp)

// GitHub stars endpoint with in-memory caching (for local dev)
let githubStarsCache: { stars: number; timestamp: number } | null = null
const CACHE_TTL_MS = 3600000 // 1 hour

app.get('/api/github-stars', async (c) => {
  // Check cache
  if (githubStarsCache && Date.now() - githubStarsCache.timestamp < CACHE_TTL_MS) {
    return c.json({ stars: githubStarsCache.stars, cached: true })
  }

  try {
    const res = await fetch('https://api.github.com/repos/cliftonc/drizzle-cube', {
      headers: { 'User-Agent': 'drizzle-cube-try-site' }
    })

    if (!res.ok) {
      console.error(`GitHub API error: ${res.status}`)
      return c.json({ stars: null, error: 'GitHub API unavailable' }, 502)
    }

    const data = await res.json() as { stargazers_count?: number }
    const stars = data.stargazers_count ?? 0

    // Cache the result
    githubStarsCache = { stars, timestamp: Date.now() }

    return c.json({ stars, cached: false })
  } catch (error) {
    console.error('GitHub stars fetch error:', error)
    return c.json({ stars: null, error: 'Failed to fetch stars' }, 500)
  }
})

// Example protected endpoint showing how to use the same security context
app.get('/api/user-info', async (c) => {
  try {
    const securityContext = await extractSecurityContext(c)

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

// Error handling
app.onError((err, c) => {
  console.error('Application error:', err)

  // Use safe check for process.env to support edge runtimes (Cloudflare Workers, etc.)
  const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'

  return c.json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong'
  }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: 'The requested endpoint was not found'
  }, 404)
})

export default app

