/**
 * Analytics Pages API Routes
 * CRUD operations for dashboard configurations
 */

import { Hono } from 'hono'
import { eq, and, asc } from 'drizzle-orm'
import type { DrizzleDatabase } from 'drizzle-cube/server'
import { analytics_pages } from '../drizzle_schema'
import { productivityDashboardConfig } from './dashboard-config'

interface Variables {
  db: DrizzleDatabase
  organisationId: number
  r2?: R2Bucket
  cfAccountId?: string
  cfApiToken?: string
  publicUrl?: string
}

const analyticsApp = new Hono<{ Variables: Variables }>()

// Middleware to ensure organisationId is set
analyticsApp.use('*', async (c, next) => {
  // For demo purposes, using a fixed organisation ID
  // In a real app, this would come from session/auth
  c.set('organisationId', 1)
  await next()
})

// Get all analytics pages
analyticsApp.get('/', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')

  try {
    const pages = await db
      .select()
      .from(analytics_pages)
      .where(
        and(
          eq(analytics_pages.organisation_id, organisationId),
          eq(analytics_pages.is_active, true)
        )
      )
      .orderBy(asc(analytics_pages.order), asc(analytics_pages.name))

    return c.json({
      data: pages,
      meta: { total: pages.length }
    })
  } catch (error) {
    console.error('Error fetching analytics pages:', error)
    return c.json({ error: 'Failed to fetch analytics pages' }, 500)
  }
})

// Get specific analytics page
analyticsApp.get('/:id', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid page ID' }, 400)
  }

  try {
    const page = await db
      .select()
      .from(analytics_pages)
      .where(
        and(
          eq(analytics_pages.id, id),
          eq(analytics_pages.organisation_id, organisationId),
          eq(analytics_pages.is_active, true)
        )
      )
      .limit(1)

    if (page.length === 0) {
      return c.json({ error: 'Analytics page not found' }, 404)
    }

    return c.json({ data: page[0] })
  } catch (error) {
    console.error('Error fetching analytics page:', error)
    return c.json({ error: 'Failed to fetch analytics page' }, 500)
  }
})

// Create new analytics page
analyticsApp.post('/', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')

  try {
    // Check dashboard count limit
    const existingPages = await db
      .select({ id: analytics_pages.id })
      .from(analytics_pages)
      .where(
        and(
          eq(analytics_pages.organisation_id, organisationId),
          eq(analytics_pages.is_active, true)
        )
      )

    if (existingPages.length >= 10) {
      return c.json({ 
        error: 'Maximum number of dashboards reached (10). Please delete a dashboard first.' 
      }, 400)
    }

    const body = await c.req.json()
    const { name, description, config, order = 0 } = body

    if (!name || !config || !config.portlets) {
      return c.json({ 
        error: 'Missing required fields: name, config, or config.portlets' 
      }, 400)
    }

    if (!Array.isArray(config.portlets)) {
      return c.json({ error: 'Config portlets must be an array' }, 400)
    }

    // Limit portlets to maximum of 20
    if (config.portlets.length > 20) {
      config.portlets = config.portlets.slice(0, 20)
    }

    const newPage = await db
      .insert(analytics_pages)
      .values({
        name,
        description,
        order,
        organisation_id: organisationId,
        config
      })
      .returning()

    return c.json({ data: newPage[0] }, 201)
  } catch (error) {
    console.error('Error creating analytics page:', error)
    return c.json({ error: 'Failed to create analytics page' }, 500)
  }
})

// Create example analytics page
analyticsApp.post('/create-example', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')

  try {
    // Check dashboard count limit
    const existingPages = await db
      .select({ id: analytics_pages.id })
      .from(analytics_pages)
      .where(
        and(
          eq(analytics_pages.organisation_id, organisationId),
          eq(analytics_pages.is_active, true)
        )
      )

    if (existingPages.length >= 10) {
      return c.json({ 
        error: 'Maximum number of dashboards reached (10). Please delete a dashboard first.' 
      }, 400)
    }
    const newPage = await db
      .insert(analytics_pages)
      .values({
        ...productivityDashboardConfig,
        organisation_id: organisationId
      })
      .returning()

    return c.json({ 
      data: newPage[0], 
      message: 'Example analytics page created successfully' 
    }, 201)
  } catch (error) {
    console.error('Error creating example analytics page:', error)
    return c.json({ error: 'Failed to create example analytics page' }, 500)
  }
})

// Update analytics page
analyticsApp.put('/:id', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid page ID' }, 400)
  }

  try {
    const body = await c.req.json()
    const { name, description, config, order } = body

    if (!name && !config && order === undefined && !description) {
      return c.json({ error: 'At least one field must be provided for update' }, 400)
    }

    const updateData: any = {
      updated_at: new Date()
    }

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (order !== undefined) updateData.order = order
    if (config !== undefined) {
      if (!config.portlets || !Array.isArray(config.portlets)) {
        return c.json({ error: 'Config portlets must be an array' }, 400)
      }
      // Limit portlets to maximum of 20
      if (config.portlets.length > 20) {
        config.portlets = config.portlets.slice(0, 20)
      }
      updateData.config = config
    }

    const updatedPage = await db
      .update(analytics_pages)
      .set(updateData)
      .where(
        and(
          eq(analytics_pages.id, id),
          eq(analytics_pages.organisation_id, organisationId)
        )
      )
      .returning()

    if (updatedPage.length === 0) {
      return c.json({ error: 'Analytics page not found' }, 404)
    }

    return c.json({ data: updatedPage[0] })
  } catch (error) {
    console.error('Error updating analytics page:', error)
    return c.json({ error: 'Failed to update analytics page' }, 500)
  }
})

// Reset analytics page to default configuration
analyticsApp.post('/:id/reset', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid page ID' }, 400)
  }

  try {
    const resetPage = await db
      .update(analytics_pages)
      .set({
        ...productivityDashboardConfig,
        organisation_id: organisationId,
        updated_at: new Date()
      })
      .where(
        and(
          eq(analytics_pages.id, id),
          eq(analytics_pages.organisation_id, organisationId)
        )
      )
      .returning()

    if (resetPage.length === 0) {
      return c.json({ error: 'Analytics page not found' }, 404)
    }

    return c.json({ 
      data: resetPage[0],
      message: 'Dashboard reset to default configuration successfully' 
    })
  } catch (error) {
    console.error('Error resetting analytics page:', error)
    return c.json({ error: 'Failed to reset analytics page' }, 500)
  }
})

// Save thumbnail for analytics page
// - In production (Cloudflare Workers): uploads to R2 and stores CDN URL
// - In development (local Node.js): stores base64 directly in config
analyticsApp.post('/:id/thumbnail', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')
  const r2 = c.get('r2')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid page ID' }, 400)
  }

  try {
    const body = await c.req.json()
    const { thumbnailData } = body

    if (!thumbnailData || typeof thumbnailData !== 'string') {
      return c.json({ error: 'thumbnailData (base64 string) is required' }, 400)
    }

    // Get current page to verify it exists
    const existingPage = await db
      .select()
      .from(analytics_pages)
      .where(
        and(
          eq(analytics_pages.id, id),
          eq(analytics_pages.organisation_id, organisationId),
          eq(analytics_pages.is_active, true)
        )
      )
      .limit(1)

    if (existingPage.length === 0) {
      return c.json({ error: 'Analytics page not found' }, 404)
    }

    let thumbnailUrl: string
    let updatedConfig: typeof existingPage[0]['config']

    // Check if R2 is available (Cloudflare Workers production environment)
    if (r2) {
      // Production: Upload to R2 and store CDN URL
      const base64Data = thumbnailData.replace(/^data:image\/\w+;base64,/, '')
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Upload to R2 with timestamp in filename for cache busting
      const timestamp = Date.now()
      const key = `dashboards/${organisationId}/${id}-${timestamp}.png`
      await r2.put(key, bytes, {
        httpMetadata: {
          contentType: 'image/png'
        }
      })

      // Build CDN URL (custom domain configured in Cloudflare)
      thumbnailUrl = `https://thumbnails.try.drizzle-cube.dev/${key}`

      updatedConfig = {
        ...existingPage[0].config,
        thumbnailUrl,
        thumbnailData: undefined  // Clear base64 data since we have URL now
      }
    } else {
      // Development: Store base64 directly in config (no R2 available)
      thumbnailUrl = thumbnailData  // Return the base64 as the "URL"

      updatedConfig = {
        ...existingPage[0].config,
        thumbnailData,  // Store base64 directly
        thumbnailUrl: undefined  // Clear any existing CDN URL
      }
    }

    await db
      .update(analytics_pages)
      .set({
        config: updatedConfig,
        updated_at: new Date()
      })
      .where(
        and(
          eq(analytics_pages.id, id),
          eq(analytics_pages.organisation_id, organisationId)
        )
      )

    return c.json({
      thumbnailUrl,
      message: r2 ? 'Thumbnail uploaded to R2 successfully' : 'Thumbnail saved (dev mode - stored as base64)'
    })
  } catch (error) {
    console.error('Error saving thumbnail:', error)
    return c.json({ error: 'Failed to save thumbnail' }, 500)
  }
})

// Delete (soft delete) analytics page
analyticsApp.delete('/:id', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid page ID' }, 400)
  }

  try {
    const deletedPage = await db
      .update(analytics_pages)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(
        and(
          eq(analytics_pages.id, id),
          eq(analytics_pages.organisation_id, organisationId)
        )
      )
      .returning()

    if (deletedPage.length === 0) {
      return c.json({ error: 'Analytics page not found' }, 404)
    }

    return c.json({ message: 'Analytics page deleted successfully' })
  } catch (error) {
    console.error('Error deleting analytics page:', error)
    return c.json({ error: 'Failed to delete analytics page' }, 500)
  }
})

// Export dashboard to PDF using Cloudflare Browser Rendering API
analyticsApp.post('/:id/export-pdf', async (c) => {
  const db = c.get('db')
  const organisationId = c.get('organisationId')
  const cfAccountId = c.get('cfAccountId')
  const cfApiToken = c.get('cfApiToken')
  const publicUrl = c.get('publicUrl')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid page ID' }, 400)
  }

  // Check for required environment variables
  if (!cfAccountId || !cfApiToken || !publicUrl) {
    console.error('PDF export requires CLOUDFLARE_ACCOUNT_ID, CF_BROWSER_RENDERING_TOKEN, and PUBLIC_URL environment variables')
    return c.json({
      error: 'PDF export is not configured. Missing required environment variables.'
    }, 500)
  }

  try {
    // Verify page exists
    const page = await db
      .select()
      .from(analytics_pages)
      .where(
        and(
          eq(analytics_pages.id, id),
          eq(analytics_pages.organisation_id, organisationId),
          eq(analytics_pages.is_active, true)
        )
      )
      .limit(1)

    if (page.length === 0) {
      return c.json({ error: 'Analytics page not found' }, 404)
    }

    const pageName = page[0].name

    // Construct print URL
    const printUrl = `${publicUrl}/dashboards/${id}?print=true`

    // Call Cloudflare Browser Rendering API
    // Use a wide viewport to match desktop dashboard layout (1600px for comfortable margin)
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/browser-rendering/pdf`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: printUrl,
          viewport: {
            width: 1800,
            height: 8000  // Very tall viewport so all portlets are "in view" for IntersectionObserver
          },
          pdfOptions: {
            preferCSSPageSize: true,  // Let CSS @page control dimensions (fixes right-side cutoff)
            width: '1832px',  // 1800 + 32px for padding (px-4 = 16px each side) - fallback
            height: '1100px', // fallback
            printBackground: true,
            margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
          },
          gotoOptions: {
            waitUntil: 'networkidle0',
            timeout: 30000
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cloudflare Browser Rendering API error:', response.status, errorText)
      return c.json({
        error: 'PDF generation failed',
        details: response.status === 403 ? 'Invalid API token or insufficient permissions' : 'Browser Rendering API error'
      }, 500)
    }

    const pdfBuffer = await response.arrayBuffer()

    // Return PDF with download headers
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pageName.replace(/[^a-zA-Z0-9\s-]/g, '')}-report.pdf"`
      }
    })
  } catch (error) {
    console.error('Error exporting PDF:', error)
    return c.json({ error: 'Failed to export PDF' }, 500)
  }
})

export default analyticsApp