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
import { Pool, neonConfig } from '@neondatabase/serverless'
import { createCubeApp } from 'drizzle-cube/adapters/hono'
import type { SecurityContext, DrizzleDatabase, CacheConfig } from 'drizzle-cube/server'
import { CloudflareKVProvider } from './cache/cloudflare-kv-provider'

import { buildDomainCubes } from './domainCubes'
import * as drizzleSchema from './drizzle_schema'
import analyticsApp from './analytics-routes'
import notebooksApp from './notebooks-routes'

import { sql } from 'drizzle-orm'
import type { RLSSetupFn } from 'drizzle-cube'
import { resolveControlPlane } from "./utils/controlPlane.ts"

interface Bindings {
  CACHE?: KVNamespace
  THUMBNAILS?: R2Bucket
  CLOUDFLARE_ACCOUNT_ID?: string
  CF_BROWSER_RENDERING_TOKEN?: string
  PUBLIC_URL?: string
  ENABLE_QUERY_CACHE?: string  // set to "true" to enable KV-backed cube query caching
  AUTH_SERVER_API_KEY?: string
}

interface Variables {
  db: DrizzleDatabase
  r2?: R2Bucket
  cfAccountId?: string
  cfApiToken?: string
  publicUrl?: string
  semantiusUser: unknown
  tenantInfo: unknown
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

// Enable WebSocket-based transactions for Neon when running in Cloudflare Workers
if (getEnvironment() === 'worker') {
  neonConfig.webSocketConstructor = WebSocket
}

// Extract org from request host (e.g. testj.semantius.ai → "testj"), falling back to env var
function getOrg(c: any): string {
  const host = c.req.header("x-forwarded-host") || c.req.header("host");
  const fromHost = (host || "").split(".")[0];
  const org = fromHost || getEnvVar('SEMANTIUS_ORG', '', c.env);
  console.log('Extracted org:', org)
  return org
}

// Build KV-backed cache config if ENABLE_QUERY_CACHE=true and CACHE binding is present
function buildCacheConfig(cacheKV?: KVNamespace, enableQueryCache?: string): CacheConfig | undefined {
  if (enableQueryCache !== 'true' || !cacheKV) return undefined
  return {
    provider: new CloudflareKVProvider(cacheKV, { defaultTtlMs: 3600000 }),
    defaultTtlMs: 3600000,
    keyPrefix: 'drizzle-cube:',
    includeSecurityContext: true,
    onError: (error: Error, operation: string) => {
      console.error(`[Cache Error] ${operation}: ${error.message}`)
    }
  }
}

// Get environment variable with fallback for different runtimes.
// Pass `env` (i.e. `c.env`) when inside a Cloudflare Workers request handler.
function getEnvVar(key: string, fallback: string = '', env?: Record<string, any>): string {
  if (env?.[key] !== undefined) return (env[key] as string) || fallback
  if (typeof (globalThis as any).Deno !== 'undefined') return (globalThis as any).Deno.env.get(key) || fallback
  if (typeof process !== 'undefined' && process.env) return process.env[key] || fallback
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
const app = new Hono<{ Variables: Variables; Bindings: Bindings }>()

const rlsSetup: RLSSetupFn = async (tx, securityContext) => {
  const sub = securityContext.semantiusUser?.claims?.sub
  const tid = securityContext.semantiusUser?.claims?.tid
  console.log('RLS setup - claims:', securityContext.semantiusUser?.claims)
  await tx.execute(sql.raw(`SET ROLE authenticated`))
  await tx.execute(sql.raw(`SELECT set_config('role', 'semantius_user', true)`))
  await tx.execute(sql.raw(`SELECT set_config('request.jwt.claim.sub', '${sub}', true)`))
  await tx.execute(sql.raw(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`))
  await tx.execute(sql.raw(`SELECT set_config('request.jwt.claim.aud', 'tenant://${tid}', true)`))
}

// Add middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Agent-Api-Key', 'X-Agent-Provider', 'X-Agent-Model', 'X-Agent-Base-URL', 'MCP-Protocol-Version', 'Mcp-Session-Id'],
  exposeHeaders: ['MCP-Protocol-Version', 'Mcp-Session-Id'],
}))

function buildOutHeaders(c: any, extra?: Record<string, string>): Record<string, string> | null {
  const headers: Record<string, string> = {
    'x-auth-server-api-key': getEnvVar('AUTH_SERVER_API_KEY', '', c.env),
    ...extra,
  }
  const authorization = c.req.header('Authorization')
  const xApiKey = c.req.header('x-api-key')
  if (authorization) headers['Authorization'] = authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`
  if (xApiKey) headers['x-api-key'] = xApiKey
  if (!authorization && !xApiKey) return null;
  return headers
}

// Semantius auth middleware - validates every request
app.use('*', async (c, next) => {

  const envOrg = getEnvVar('SEMANTIUS_ORG', '', c.env)
  let tenantName: string
  if (envOrg) {
    tenantName = envOrg
  } else {
    const host = (c.req.header('x-forwarded-host') || c.req.header('host') || '').split(':')[0]
    tenantName = host.split('.')[0]
  }

  const tenantInfo = await resolveControlPlane(tenantName)
  console.log(`[semantius] resolved tenant ${tenantName} info:`, tenantInfo)

  c.set('tenantInfo', tenantInfo)

  if (c.req.path.startsWith('/.well-known/')) return next()

  let headers = buildOutHeaders(c)

  const authRes = headers ? await fetch(`https://api.semantius.cloud/tenant/${tenantName}`, { headers }) : null

  if (!authRes || authRes.status !== 200) {
    const body = authRes ? await authRes.text() : 'Unauthorized'
    console.log('[semantius] error', authRes?.status, body)
    return new Response(body, {
      status: authRes?.status ?? 401,
      headers: authRes ? Object.fromEntries(authRes.headers.entries()) : {},
    })
  }

  const semantiusUser = await authRes.json()
  console.log('[semantius] semantiusUser context') //, semantiusUser)
  c.set('semantiusUser', semantiusUser)

  // Create per-tenant database connection from semantiusUser.databaseUrl
  const dbUrl = (semantiusUser as any)?.databaseUrl || getEnvVar('DATABASE_URL', defaultConnectionString, c.env)
  const db = createDatabase(dbUrl)
  c.set('db', db as DrizzleDatabase)

  await next()
})


// Returns the auth server base URL: AUTH_SERVER_URL env override, or derived from tenant name
function getAuthServerBaseUrl(c: any): string {
  const authServerUrl = getEnvVar('AUTH_SERVER_URL', '', c.env);
  if (authServerUrl) return authServerUrl;
  const tenantInfo = c.get('tenantInfo');
  const requestTenant = tenantInfo?.name;
  return `https://${requestTenant}.semantius.cloud`;
}

export function authorizationServerMetadata(c: any) {
  const base = `${getAuthServerBaseUrl(c)}/api/auth`
  return c.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    revocation_endpoint: `${base}/oauth/token/revoke`,
    scopes_supported: ['mcp:read'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'],
  })
}

const oauthMetadataHandler = (c: any) => {
  let tenantInfo = c.get('tenantInfo');
  const protocol = c.req.header("x-forwarded-proto") || new URL(c.req.url).protocol.slice(0, -1);
  const host = c.req.header("x-forwarded-host") || c.req.header("host");
  const baseUrl = `${protocol}://${host}`;

  const authServerUrl = `${getAuthServerBaseUrl(c)}/api/auth`;

  return c.json({
    resource: `${baseUrl}/mcp`,
    authorization_servers: [authServerUrl],
    scopes_supported: tenantInfo ? [`tenant:${tenantInfo.id}:user`] : [],
    bearer_methods_supported: ["header"],
  });
};

app.get('/.well-known/oauth-protected-resource', oauthMetadataHandler)
app.get('/.well-known/oauth-protected-resource/mcp', oauthMetadataHandler)
app.get('/.well-known/oauth-authorization-server', authorizationServerMetadata)

// MCP endpoint
app.all('/mcp/*', async (c) => {
  const domain = ''
  c.set('domain', domain)

  const semantiusUser = c.get('semantiusUser') as { postgrestUrl: string; access_token: string }
  if (semantiusUser?.postgrestUrl && semantiusUser?.access_token) {
    try {
      const rpcUrl = domain
        ? `${semantiusUser.postgrestUrl}/rpc/get_module_cubes`
        : `${semantiusUser.postgrestUrl}/rpc/get_user_cubes`
      const rpcBody = domain ? JSON.stringify({ p_module_name: domain }) : JSON.stringify({})
      const rpcRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${semantiusUser.access_token}`,
        },
        body: rpcBody,
      })
      if (!rpcRes.ok) {
        const errBody = await rpcRes.text()
        console.error(`[get_user_cubes] ${rpcRes.status} error from ${rpcUrl}:`, errBody)
        return c.json(JSON.parse(errBody), rpcRes.status as any)
      }
      const domain_cubes = await rpcRes.json() as any[]
      c.set('domain_cubes', domain_cubes)
      console.log(`[get_user_cubes] fetched ${domain_cubes.length} cubes`)
    } catch (err) {
      console.error('[get_user_cubes] error:', err)
    }
  }

  const domainCubeData: any[] | undefined = c.get('domain_cubes')
  const { schema, allCubes } = buildDomainCubes(domainCubeData)
  const db = c.get('db')

  const cubeApp = createCubeApp({
    cubes: allCubes,
    drizzle: db,
    schema: schema as any,
    mcp: { enabled: true, app: true },
    engineType: 'postgres',
    basePath: '/v1',
    rlsSetup,
    cache: buildCacheConfig(c.env?.CACHE, c.env?.ENABLE_QUERY_CACHE),
    agent: { allowClientApiKey: true, maxTurns: 25 },
    extractSecurityContext: async () => ({ semantiusUser }),
  })

  return await cubeApp.fetch(c.req.raw, c.env)
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

/* TODO decide if we need /api/docs at all
// API documentation endpoint
import { buildDrizzleCubes } from './drizzleCubes'
app.get('/api/docs', (c) => {
  // Get metadata from the cube app (we could also create a temporary semantic layer for this)
  // For now, we'll provide static documentation. In a real app, you might extract this from the cubes
  const { allCubes } = buildDrizzleCubes() // TODO remove drizzle cubes
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
*/ 


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
      // writeFileSync('get_domain_cubes.json', JSON.stringify(domain_cubes, null, 2))
    } catch (err) {
      console.error('[get_module_cubes] error:', err)
    }
  }

  // Build cubes from domain_cubes (semantic model)
  const domainCubeData: any[] | undefined = c.get('domain_cubes')
  const { schema, allCubes, cubeSchemaJSON } = buildDomainCubes(domainCubeData);

  // Expose cubeSchemaJSON as module_cubes for downstream consumers
  c.set('module_cubes', cubeSchemaJSON)

  const db = c.get('db')

  const cubeApp = createCubeApp({
    cubes: allCubes,
    drizzle: db,
    schema: schema as any,
    mcp: {
      enabled: true,
      app: true
    },
    engineType: 'postgres',
    basePath: '/v1',
    rlsSetup,
    cache: buildCacheConfig(c.env?.CACHE, c.env?.ENABLE_QUERY_CACHE),
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
  const response = await cubeApp.fetch(rewrittenRequest, c.env)

  // Save /meta response for debugging
  if (false && url.pathname === '/v1/meta' && response.ok) {
    try {
      const cloned = response.clone()
      const body = await cloned.json()
      writeFileSync('meta.json', JSON.stringify(body, null, 2))
      console.log('[meta] saved meta.json')
    } catch (e) {
      console.error('[meta] failed to save meta.json:', e)
    }
  }

  return response
})




// Mount analytics pages API with database and PDF export configuration
app.use('/api/analytics-pages/*', async (c, next) => {
  c.set('r2', c.env?.THUMBNAILS)
  c.set('cfAccountId', getEnvVar('CLOUDFLARE_ACCOUNT_ID', '', c.env))
  c.set('cfApiToken', getEnvVar('CF_BROWSER_RENDERING_TOKEN', '', c.env))
  c.set('publicUrl', getEnvVar('PUBLIC_URL', '', c.env))
  await next()
})
app.route('/api/analytics-pages', analyticsApp)

// Mount notebooks API with database access
app.use('/api/notebooks/*', async (_c, next) => {
  await next()
})

app.route('/api/notebooks', notebooksApp)

/* TODO decide if/how we want to expuse /api/ai
  
  import aiApp from './ai-routes'
  // Mount AI proxy routes with database access
  app.use('/api/ai/*', async (_c, next) => {
    await next()
  })

  app.route('/api/ai', aiApp)
*/

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

