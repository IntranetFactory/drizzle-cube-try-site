import { getEnv, setEnv } from './env.ts'

interface TenantInfo {
  id: string
  name: string
  logo: string | null
  postgrest_url: string
  client_id: string
  database_url: string | null
}

const tenantCache = new Map<string, TenantInfo>()

export async function resolveTenant(slug: string): Promise<TenantInfo | null> {
  if (tenantCache.has(slug)) return tenantCache.get(slug)!
  const info = await resolveControlPlane(slug)
  if (info) tenantCache.set(slug, info)
  return info
}

export function slugFromHost(host: string): string {
  const slug = host.split('.')[0]
  console.log('[slugFromHost] host:', host, '→ slug:', slug)
  return slug
}

export function getTenantName(): string {
  // If CONTROL_PLANE_ORG is set, use it directly
  const org = getEnv('CONTROL_PLANE_ORG')?.trim()
  if (org) return org

  // Otherwise derive from hostname: first segment of the domain
  // e.g. abc.test.com → abc, localhost → localhost
  try {
    let hostname = 'localhost'
    // @ts-ignore - Deno may not exist
    if (typeof globalThis.Deno !== 'undefined' && globalThis.Deno.hostname) {
      // @ts-ignore
      hostname = globalThis.Deno.hostname()
    }
    return hostname.split('.')[0]
  } catch {
    return 'localhost'
  }
}

export async function resolveControlPlane(overrideTenantName?: string): Promise<TenantInfo | null> {
  const controlPlaneUrl =  "https://api.semantius.cloud" // (getEnv('CONTROL_PLANE_URL') ?? 'https://app.semantius.com').trim()
  const tenantName = overrideTenantName || getTenantName()
  const url = `${controlPlaneUrl.replace(/\/+$/, '')}/organization/${encodeURIComponent(tenantName)}`

  console.log(`Resolving tenant "${tenantName}" from control plane: ${url}`)

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Control plane returned ${response.status} for tenant "${tenantName}": ${await response.text()}`)
      return null
    }

    const tenant: TenantInfo = await response.json()
    console.log(`Tenant "${tenant.name}" resolved → postgrest_url: ${tenant.postgrest_url}`)

    // Only set API_BASE_URL if not already explicitly configured
    if (!getEnv('API_BASE_URL') && tenant.postgrest_url) {
      setEnv('API_BASE_URL', tenant.postgrest_url)
    }

    return tenant
  } catch (err) {
    console.error('Failed to resolve tenant from control plane:', err)
    return null
  }
}
