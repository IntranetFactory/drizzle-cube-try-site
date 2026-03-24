import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  BookOpenIcon,
  CheckIcon,
  SparklesIcon,
  LinkIcon,
  BoltIcon,
  ArrowRightIcon,
  CommandLineIcon,
  Square3Stack3DIcon,
  ChartBarIcon,
  MapIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'
import PageHead from '../components/PageHead'
import GitHubStarsButton from '../components/GitHubStarsButton'
import { getTheme, watchThemeChanges, type Theme } from '../theme/utils'
import { useAnalyticsPages } from '../hooks/useAnalyticsPages'

function loadPrism(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).Prism) { resolve(); return }
    const theme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    const isDark = theme !== 'light'
    const lightTheme = document.createElement('link')
    lightTheme.id = 'prism-light-theme'
    lightTheme.rel = 'stylesheet'
    lightTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/themes/prism.min.css'
    lightTheme.disabled = isDark
    document.head.appendChild(lightTheme)
    const darkTheme = document.createElement('link')
    darkTheme.id = 'prism-dark-theme'
    darkTheme.rel = 'stylesheet'
    darkTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/themes/prism-tomorrow.min.css'
    darkTheme.disabled = !isDark
    document.head.appendChild(darkTheme)
    const coreScript = document.createElement('script')
    coreScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/components/prism-core.min.js'
    coreScript.onload = () => {
      const auto = document.createElement('script')
      auto.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0/plugins/autoloader/prism-autoloader.min.js'
      auto.onload = () => resolve()
      document.head.appendChild(auto)
    }
    document.head.appendChild(coreScript)
  })
}

type AITool = 'claude-desktop' | 'claude-web' | 'chatgpt' | 'n8n'

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
  </svg>
)

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

export default function HomePage() {
  const [theme, setTheme] = useState<Theme>('light')
  const [activeAITool, setActiveAITool] = useState<AITool>('claude-desktop')
  const { data: dashboards } = useAnalyticsPages()
  const firstDashboardPath = dashboards?.[0] ? `/dashboards/${dashboards[0].id}` : '/dashboards'

  useEffect(() => {
    loadPrism().then(() => {
      setTimeout(() => { try { ;(window as any).Prism.highlightAll() } catch (_) {} }, 0)
    })
  }, [])

  useEffect(() => {
    setTimeout(() => { try { if ((window as any).Prism) (window as any).Prism.highlightAll() } catch (_) {} }, 0)
  }, [activeAITool])

  useEffect(() => {
    setTheme(getTheme())
    return watchThemeChanges(setTheme)
  }, [])

  return (
    <>
      <PageHead />
      <style>{`
        .language-ts, .language-json, pre[class*="language-"] { background: transparent !important; }
        code[class*="language-"], pre[class*="language-"] { background: transparent !important; text-shadow: none !important; }
        .dark code[class*="language-"], .dark pre[class*="language-"], .dark .token { text-shadow: none !important; }
      `}</style>

      {/* ================================================================
          HERO
          Split layout: left text + CTAs, right dashboard screenshot
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 lg:pt-20 pb-10 sm:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-12 items-center">
          {/* Left */}
          <div>
            <h1
              className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15] text-dc-text mb-4 animate-fade-up stagger-1"
              style={{ textShadow: '0 0 20px var(--dc-text-glow), 0 0 40px var(--dc-text-glow)' }}
            >
              Embedded self-service analytics and agentic notebooks, in hours not&nbsp;weeks
            </h1>

            <p
              className="text-lg text-dc-text-secondary leading-relaxed max-w-[48ch] mb-7 animate-fade-up stagger-2"
              style={{ textShadow: '0 0 16px var(--dc-text-glow), 0 0 32px var(--dc-text-glow)' }}
            >
              Give your users dashboards, an analysis builder, and AI-powered notebooks
              using your existing Drizzle schema. Zero new infrastructure. Multi-tenant by&nbsp;default.
            </p>

            {/* Primary CTAs -- high visual weight */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 animate-fade-up stagger-3">
              <Link
                to={firstDashboardPath}
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] shadow-[0_2px_12px_-2px_rgba(16,185,129,0.4)]"
              >
                <ChartBarIcon className="w-5 h-5" />
                Try the Live Demo
                <ArrowRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="https://www.drizzle-cube.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-dc-surface border border-dc-border-secondary text-dc-text font-semibold rounded-lg transition-all duration-200 hover:bg-dc-surface-secondary active:scale-[0.98]"
              >
                <BookOpenIcon className="w-4.5 h-4.5" />
                Documentation
              </a>
            </div>

            {/* Install hint */}
            <div className="flex items-center gap-3 mb-5 animate-fade-up stagger-4">
              <div className="inline-flex items-center gap-2 bg-dc-surface-secondary border border-dc-border rounded-md px-3 py-1.5">
                <CommandLineIcon className="w-3.5 h-3.5 text-dc-text-muted" />
                <code className="text-xs font-mono text-dc-text-secondary">npm install drizzle-cube</code>
              </div>
              <span className="text-xs text-dc-text-muted">MIT Licensed</span>
            </div>

            {/* Social proof row */}
            <div className="flex items-center gap-4 text-sm text-dc-text-muted animate-fade-in stagger-4">
              <GitHubStarsButton />
              <a href="https://discord.gg/kFvT97hZsv" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[#5865F2] transition-colors">
                <DiscordIcon className="w-4 h-4" />
                Discord
              </a>
            </div>

            {/* Hand-drawn callout pointing to explore strip below */}
            <div className="mt-8 flex items-center gap-2 animate-fade-in stagger-5" style={{ transform: 'rotate(-2deg)' }}>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400" style={{ fontFamily: "'Caveat', cursive" }}>
                Try all the features live
              </span>
              <svg width="48" height="40" viewBox="0 0 48 40" fill="none" className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-1">
                <path d="M4 6C8 4 16 6 22 12C28 18 30 26 32 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M26 28L32 33L36 26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
          </div>

          {/* Right: Dashboard screenshot */}
          <div className="animate-slide-in-right stagger-3">
            <div
              className="rounded-xl overflow-hidden border border-dc-border"
              style={{ boxShadow: '0 24px 48px -12px rgba(0,0,0,0.15)' }}
            >
              <img
                src={theme === 'light' ? '/dashboard_light.png' : '/dashboard_dark.png'}
                alt="Drizzle Cube dashboard"
                className="w-full h-auto block"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          EXPLORE STRIP -- 4 prominent entry points
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 pb-14 sm:pb-20">
        {/* Primary features — full width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {[
            { to: firstDashboardPath, icon: ChartBarIcon, label: 'Dashboards', desc: 'Charts, KPIs, data tables', accent: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', border: 'hover:border-emerald-400', wave: 'wave-1' },
            { to: '/notebooks', icon: SparklesIcon, label: 'Agentic Notebooks', desc: 'AI-powered analysis', accent: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', border: 'hover:border-amber-400', wave: 'wave-2' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3.5 px-4 py-4 bg-dc-surface border border-dc-border rounded-xl transition-all duration-200 active:scale-[0.98] animate-wave ${item.border} ${item.wave}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.accent}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-dc-text block">{item.label}</span>
                <span className="text-xs text-dc-text-muted">{item.desc}</span>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-dc-text-disabled ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
        {/* Secondary features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/analysis-builder', icon: Square3Stack3DIcon, label: 'Analysis Builder', desc: 'Drag-and-drop queries', accent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', border: 'hover:border-blue-400', wave: 'wave-3' },
            { to: '/schema', icon: MapIcon, label: 'Schema Explorer', desc: 'Visualize cube relationships', accent: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400', border: 'hover:border-rose-400', wave: 'wave-4' },
            { to: '/data-browser', icon: CubeIcon, label: 'Data Browser', desc: 'Browse raw cube data', accent: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', border: 'hover:border-purple-400', wave: 'wave-1' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`group flex items-center gap-3.5 px-4 py-4 bg-dc-surface border border-dc-border rounded-xl transition-all duration-200 active:scale-[0.98] animate-wave ${item.border} ${item.wave}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.accent}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-dc-text block">{item.label}</span>
                <span className="text-xs text-dc-text-muted">{item.desc}</span>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-dc-text-disabled ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </section>

      {/* ================================================================
          DRIZBY CALLOUT -- prominent, right after explore strip
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
        <a
          href="https://www.drizby.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-2xl border border-dc-border hover:border-emerald-400 transition-all duration-300 active:scale-[0.995] bg-dc-surface"
          style={{ boxShadow: '0 4px 24px -4px rgba(0,0,0,0.08)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-cyan-50/50 to-blue-50 dark:from-emerald-950/40 dark:via-cyan-950/30 dark:to-blue-950/40 group-hover:from-emerald-100 group-hover:via-cyan-50 group-hover:to-blue-100 dark:group-hover:from-emerald-950/60 dark:group-hover:via-cyan-950/50 dark:group-hover:to-blue-950/60 transition-all duration-300" />
          <div className="relative flex flex-col sm:flex-row items-center gap-5 sm:gap-8 px-6 sm:px-10 py-7 sm:py-8">
            <img src="/drizby-cloud-logo.png" alt="Drizby" className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 group-hover:scale-105 transition-transform duration-300" />
            <div className="text-center sm:text-left flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-dc-text group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors mb-1">
                Want standalone analytics without embedding in your app?
              </h3>
              <p className="text-sm text-dc-text-muted">
                Try <strong className="text-dc-text">Drizby</strong> -- a full self-service BI platform built on Drizzle Cube. Open source or cloud hosted.
              </p>
            </div>
            <span className="shrink-0 px-6 py-3 bg-dc-text text-dc-surface font-semibold rounded-lg text-sm group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 flex items-center gap-2">
              www.drizby.com
              <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </a>
      </section>

      {/* ================================================================
          WHY + HOW -- two distinct panels
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
          {/* Why -- tinted panel */}
          <div className="bg-dc-surface border border-dc-border rounded-2xl p-6 sm:p-8" style={{ boxShadow: '0 2px 16px -4px rgba(0,0,0,0.05)' }}>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-dc-text mb-2">
              Why a semantic layer?
            </h2>
            <p className="text-sm text-dc-text-muted leading-relaxed mb-6 max-w-[44ch]">
              Decouple analytics from raw schemas. Define metrics once, access them
              through dashboards, APIs, or AI agents.
            </p>
            <div className="space-y-1">
              {[
                { t: 'Natural language ready', d: 'AI agents query data using business terms' },
                { t: 'Single source of truth', d: 'Define metrics once, use everywhere' },
                { t: 'Decoupled from schema', d: 'Migrate databases without breaking analytics' },
                { t: 'Multi-tenant security', d: 'Row-level isolation at every query' },
                { t: 'Any AI workflow', d: 'Claude, ChatGPT, n8n, or your own agents' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-dc-border last:border-0">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-dc-text">{item.t}</p>
                    <p className="text-xs text-dc-text-muted mt-0.5">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How: 5 steps -- timeline panel */}
          <div className="bg-dc-surface border border-dc-border rounded-2xl p-6 sm:p-8" style={{ boxShadow: '0 2px 16px -4px rgba(0,0,0,0.05)' }}>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-dc-text mb-2">
              Five steps to production
            </h2>
            <p className="text-sm text-dc-text-muted leading-relaxed mb-6 max-w-[44ch]">
              Built on your existing Drizzle ORM schema. No new databases,
              no ETL pipelines, no separate BI.
            </p>
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[13px] top-4 bottom-4 w-px bg-dc-border" />
              <div className="space-y-0">
                {[
                  { n: '1', t: 'Use your existing schema', d: 'Already have Drizzle ORM? You\'re 80% done.' },
                  { n: '2', t: 'Define analytics cubes', d: 'Map tables to business metrics with type safety.' },
                  { n: '3', t: 'Add REST endpoints', d: 'One-line integration with Hono, Express, or Next.js.' },
                  { n: '4', t: 'Embed React components', d: 'Drop charts, dashboards, notebooks into your UI.' },
                  { n: '5', t: 'Ship to your users', d: 'Self-service analytics, live in production.' },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-3.5 py-2.5">
                    <div className="w-7 h-7 rounded-full bg-dc-surface border-2 border-dc-primary flex items-center justify-center text-xs font-bold text-dc-primary shrink-0 font-mono relative z-[1]">
                      {step.n}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm font-semibold text-dc-text">{step.t}</p>
                      <p className="text-xs text-dc-text-muted mt-0.5">{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          CODE EXAMPLE -- directly follows the 5 steps
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-dc-text mb-2">
            See it in code.
          </h2>
          <p className="text-sm text-dc-text-muted max-w-[48ch]">
            From your existing Drizzle schema to a working analytics API in minutes.
          </p>
        </div>

        <div className="bg-dc-surface rounded-xl border border-dc-border p-4 sm:p-6" style={{ boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)' }}>
          <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
            {/* Col 1 */}
            <div className="space-y-6">
              <CodeBlock n="1" title="Your existing Drizzle schema" lang="ts">{`// schema.ts
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  organisationId: integer('organisation_id'),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
})`}</CodeBlock>

              <CodeBlock n="2" title="Define a cube" lang="ts">{`// cubes.ts
import { defineCube } from 'drizzle-cube/server'

export const productsCube = defineCube('Products', {
  title: 'Product Analytics',
  sql: (ctx) => ({
    from: schema.products,
    where: eq(schema.products.organisationId,
      ctx.securityContext.organisationId)
  }),
  dimensions: {
    category: { title: 'Category', type: 'string',
      sql: schema.products.category },
    createdAt: { title: 'Created', type: 'time',
      sql: schema.products.createdAt },
  },
  measures: {
    count:    { title: 'Count', type: 'count',
      sql: schema.products.id },
    avgPrice: { title: 'Avg Price', type: 'avg',
      sql: schema.products.price },
  }
})`}</CodeBlock>
            </div>

            {/* Col 2 */}
            <div className="space-y-6">
              <CodeBlock n="3" title="Add to your app" lang="ts">{`// app.ts
import { createCubeApp } from 'drizzle-cube/adapters/hono'

const cubeApp = createCubeApp({
  cubes: [productsCube],
  drizzle: db, schema,
  extractSecurityContext: async (c) => ({
    organisationId: c.get('user')?.organisationId
  }),
  engineType: 'postgres'
})

app.route('/', cubeApp) // Done!`}</CodeBlock>

              <CodeBlock n="4" title="Query with a simple API" lang="json">{`{
  "measures": ["Products.count", "Products.avgPrice"],
  "dimensions": ["Products.category"],
  "timeDimensions": [{
    "dimension": "Products.createdAt",
    "granularity": "month"
  }]
}`}</CodeBlock>

              <CodeBlock n="5" title="Get structured results" lang="json">{`[{
  "Products.category": "Electronics",
  "Products.createdAt": "2024-01",
  "Products.count": "15",
  "Products.avgPrice": "299.99"
}]`}</CodeBlock>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FULL-FEATURED ANALYTICS -- screenshot + feature list
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-0 items-stretch">
          <div className="flex items-center justify-end order-2 lg:order-1">
            <div
              className="rounded-xl overflow-hidden border border-dc-border relative"
              style={{ boxShadow: '0 20px 48px -12px rgba(0,0,0,0.12)', zIndex: 1 }}
            >
              <img
                src={theme === 'light' ? '/dashboard_light.png' : '/dashboard_dark.png'}
                alt="Dashboard with charts and tables"
                className="w-full h-auto block"
              />
            </div>
          </div>

          <div className="relative order-1 lg:order-2">
            <div className="absolute inset-0 bg-dc-surface-secondary rounded-2xl lg:rounded-r-2xl lg:rounded-l-none lg:-left-16" />
            <div className="relative p-6 sm:p-8" style={{ zIndex: 1 }}>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-dc-text mb-5">
                Full-featured analytics built&nbsp;in
              </h3>
              <ul className="space-y-3.5">
                {[
                  { t: 'Rich visualizations', d: 'Bar, line, area, pie, scatter, KPI cards, data tables' },
                  { t: 'Multiple analysis modes', d: 'Builder, funnel analysis, and flow analysis' },
                  { t: 'Fully themeable', d: 'Try the theme switcher to see it in action' },
                  { t: 'AI-powered analysis', d: 'Natural language queries for your users' },
                  { t: 'Agentic notebooks', d: 'Conversational analysis, charts, markdown in one place' },
                  { t: 'Multi-tenant security', d: 'Row-level isolation built into every query' },
                  { t: 'RLS support', d: 'Works with Postgres RLS on Supabase and compatible databases' },
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckIcon className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-base text-dc-text-secondary">
                      <strong className="text-dc-text">{f.t}</strong> -- {f.d}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          AI-READY DATA LAYER
          ================================================================ */}
      <section id="ai-ready" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 scroll-mt-8">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-dc-surface-secondary border border-dc-border rounded-full px-3 py-1.5 mb-3">
            <SparklesIcon className="w-3.5 h-3.5 text-dc-text-muted" />
            <span className="text-xs font-semibold text-dc-text-secondary tracking-wide uppercase">AI-Ready</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-dc-text mb-2">
            AI agents in your customer's workflow.
          </h2>
          <p className="text-sm text-dc-text-muted max-w-[56ch] leading-relaxed">
            Your customers connect Claude, ChatGPT, or any MCP-compatible agent
            to your analytics. Secure, multi-tenant, ready out of the box.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* MCP Tools */}
          <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-dc-surface-secondary rounded-lg flex items-center justify-center border border-dc-border">
                <LinkIcon className="w-4 h-4 text-dc-text-muted" />
              </div>
              <h3 className="text-sm font-semibold text-dc-text">Built-in MCP Tools</h3>
            </div>
            <div className="space-y-2">
              {[
                { name: 'drizzle_cube_discover', desc: 'Find cubes by topic or intent' },
                { name: 'drizzle_cube_validate', desc: 'Validate queries, get auto-corrections' },
                { name: 'drizzle_cube_load', desc: 'Execute queries, return results' },
              ].map((tool) => (
                <div key={tool.name} className="bg-dc-surface-secondary rounded-lg px-3 py-2.5 border border-dc-border">
                  <code className="text-xs font-mono text-dc-text">{tool.name}</code>
                  <p className="text-xs text-dc-text-muted mt-0.5">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How AI works */}
          <div className="bg-dc-surface border border-dc-border rounded-xl p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-dc-surface-secondary rounded-lg flex items-center justify-center border border-dc-border">
                <BoltIcon className="w-4 h-4 text-dc-text-muted" />
              </div>
              <h3 className="text-sm font-semibold text-dc-text">How It Works</h3>
            </div>
            <div className="space-y-3.5">
              {[
                { n: '1', t: 'Rich Semantic Metadata', d: 'Agents fetch cube definitions, descriptions, relationships' },
                { n: '2', t: 'Cross-Cube Queries', d: 'AI builds queries spanning cubes -- joins handled automatically' },
                { n: '3', t: 'Secure Execution', d: 'Every query runs through your security context' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-dc-surface-secondary border border-dc-border flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-dc-text-muted font-mono">{s.n}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dc-text">{s.t}</p>
                    <p className="text-xs text-dc-text-muted">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connect AI tools */}
        <div className="bg-dc-surface border border-dc-border rounded-xl p-5 sm:p-6" style={{ boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-dc-text mb-1">Connect AI Tools to Your App</h3>
              <p className="text-xs text-dc-text-muted mb-4">Your customers connect their AI tools directly to your analytics</p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {([
                  { id: 'claude-desktop' as const, label: 'Claude Desktop' },
                  { id: 'claude-web' as const, label: 'Claude.ai' },
                  { id: 'chatgpt' as const, label: 'ChatGPT' },
                  { id: 'n8n' as const, label: 'n8n' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAITool(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      activeAITool === tab.id
                        ? 'bg-dc-text text-dc-surface'
                        : 'bg-dc-surface-secondary text-dc-text-muted hover:text-dc-text border border-dc-border'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="bg-dc-surface-secondary rounded-lg border border-dc-border">
                {activeAITool === 'claude-desktop' && (
                  <div className="p-3.5">
                    <p className="text-xs text-dc-text-secondary mb-2.5">
                      Add to <code className="text-dc-text bg-dc-surface-tertiary px-1 py-0.5 rounded font-mono text-[11px]">claude_desktop_config.json</code>:
                    </p>
                    <div className="bg-dc-surface rounded-md p-3 border border-dc-border overflow-x-auto">
                      <pre className="text-xs font-mono text-dc-text-secondary whitespace-pre"><code className="language-json">{`{
  "mcpServers": {
    "your-app-analytics": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-remote",
        "https://try.drizzle-cube.dev/mcp"]
    }
  }
}`}</code></pre>
                    </div>
                  </div>
                )}
                {activeAITool === 'claude-web' && (
                  <div className="p-3.5">
                    <p className="text-xs text-dc-text-secondary mb-2.5">Add as a Connector in Claude.ai:</p>
                    <div className="bg-dc-surface rounded-md p-3 border border-dc-border overflow-x-auto">
                      <pre className="text-xs font-mono text-dc-text-secondary whitespace-pre"><code>{`Server URL: https://try.drizzle-cube.dev/mcp

Tools: drizzle_cube_discover, drizzle_cube_validate, drizzle_cube_load`}</code></pre>
                    </div>
                    <p className="text-[11px] text-dc-text-muted mt-2">Settings &rarr; Connectors &rarr; Add Connector</p>
                  </div>
                )}
                {activeAITool === 'chatgpt' && (
                  <div className="p-3.5">
                    <p className="text-xs text-dc-text-secondary mb-2.5">Enable Developer Mode in ChatGPT:</p>
                    <div className="bg-dc-surface rounded-md p-3 border border-dc-border overflow-x-auto">
                      <pre className="text-xs font-mono text-dc-text-secondary whitespace-pre"><code>{`Server URL: https://try.drizzle-cube.dev/mcp

Tools: drizzle_cube_discover, drizzle_cube_validate, drizzle_cube_load`}</code></pre>
                    </div>
                    <p className="text-[11px] text-dc-text-muted mt-2">Settings &rarr; Connectors &rarr; Advanced &rarr; Developer Mode</p>
                  </div>
                )}
                {activeAITool === 'n8n' && (
                  <div className="p-3.5">
                    <p className="text-xs text-dc-text-secondary mb-2.5">Use the n8n MCP Client node:</p>
                    <div className="bg-dc-surface rounded-md p-3 border border-dc-border overflow-x-auto">
                      <pre className="text-xs font-mono text-dc-text-secondary whitespace-pre"><code>{`MCP Server: https://try.drizzle-cube.dev/mcp
Workflow:   AI Agent -> MCP Client -> Your Analytics`}</code></pre>
                    </div>
                    <p className="text-[11px] text-dc-text-muted mt-2">
                      See <a href="https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.mcpclienttool/" target="_blank" rel="noopener noreferrer" className="text-dc-primary hover:underline">n8n MCP Client docs</a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <div className="rounded-lg overflow-hidden border border-dc-border max-w-sm" style={{ boxShadow: '0 8px 24px -6px rgba(0,0,0,0.1)' }}>
                <img src="/claude_mcp.png" alt="Claude using Drizzle Cube MCP tools" className="w-full h-auto block" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Drizby callout removed from here -- moved up after explore strip */}

      {/* ================================================================
          PLATFORMS
          ================================================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <h2 className="text-sm font-semibold text-dc-text-muted text-center mb-6 uppercase tracking-wide">
          Used by these platforms
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
          {[
            { href: 'https://www.fintune.app', img: 'https://www.fintune.app/img/logo_small.png', name: 'Fintune', desc: 'Team & financial planning' },
            { href: 'https://www.drizby.com', img: '/drizby-cloud-logo.png', name: 'Drizby', desc: 'Self-service BI' },
            { href: 'https://www.guidemode.dev', img: 'https://www.guidemode.dev/logo.svg', name: 'Guidemode', desc: 'Discovery x Delivery' },
            { href: 'https://try.icelight.dev', img: '/icelight-logo.png', name: 'Icelight', desc: 'Events to Iceberg' },
          ].map((p) => (
            <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2.5 px-4 py-4 bg-dc-surface border border-dc-border rounded-xl hover:border-dc-primary transition-all duration-200 active:scale-[0.98] text-center"
            >
              <img src={p.img} alt={`${p.name}`} className="w-10 h-10 object-contain" />
              <div>
                <span className="text-sm font-semibold text-dc-text group-hover:text-dc-primary transition-colors block">{p.name}</span>
                <span className="text-[11px] text-dc-text-muted">{p.desc}</span>
              </div>
            </a>
          ))}
          <a href="https://github.com/cliftonc/drizzle-cube/discussions/categories/show-and-tell" target="_blank" rel="noopener noreferrer"
            className="group flex flex-col items-center justify-center gap-2 px-4 py-4 bg-dc-surface border border-dashed border-dc-border rounded-xl hover:border-dc-primary transition-all duration-200 active:scale-[0.98] text-center"
          >
            <div className="w-10 h-10 rounded-lg bg-dc-surface-secondary flex items-center justify-center group-hover:bg-dc-accent-bg transition-colors">
              <span className="text-lg text-dc-text-muted group-hover:text-dc-primary font-light">+</span>
            </div>
            <span className="text-sm font-semibold text-dc-text group-hover:text-dc-primary transition-colors">Add yours</span>
          </a>
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="border-t border-dc-border bg-dc-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src="/drizzle-cube.png" alt="Drizzle Cube" className="w-6 h-6" />
                <span className="text-sm font-bold text-dc-text">Drizzle Cube</span>
              </div>
              <p className="text-xs text-dc-text-muted leading-relaxed max-w-[28ch]">
                Embeddable analytics and AI agent data access for your platform.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-dc-text uppercase tracking-wide mb-3">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/dashboards" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">Dashboards</Link></li>
                <li><Link to="/analysis-builder" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">Analysis Builder</Link></li>
                <li><Link to="/notebooks" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">Notebooks</Link></li>
                <li><Link to="/schema" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">Schema Explorer</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-semibold text-dc-text uppercase tracking-wide mb-3">Resources</h4>
              <ul className="space-y-2">
                <li><a href="https://www.drizzle-cube.dev" target="_blank" rel="noopener noreferrer" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">Documentation</a></li>
                <li><a href="https://github.com/cliftonc/drizzle-cube" target="_blank" rel="noopener noreferrer" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">GitHub</a></li>
                <li><a href="https://www.npmjs.com/package/drizzle-cube" target="_blank" rel="noopener noreferrer" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">npm</a></li>
                <li><a href="https://github.com/cliftonc/drizzle-cube/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">MIT License</a></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="text-xs font-semibold text-dc-text uppercase tracking-wide mb-3">Community</h4>
              <ul className="space-y-2">
                <li><a href="https://discord.gg/kFvT97hZsv" target="_blank" rel="noopener noreferrer" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors inline-flex items-center gap-1"><DiscordIcon className="w-3 h-3" /> Discord</a></li>
                <li><a href="https://github.com/cliftonc/drizzle-cube/discussions" target="_blank" rel="noopener noreferrer" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors inline-flex items-center gap-1"><GitHubIcon className="w-3 h-3" /> Discussions</a></li>
                <li><a href="https://www.drizby.com" target="_blank" rel="noopener noreferrer" className="text-xs text-dc-text-muted hover:text-dc-text transition-colors">Drizby</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-dc-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-dc-text-disabled">
              MIT Licensed. Built with Drizzle ORM, Hono, and React.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com/cliftonc/drizzle-cube" target="_blank" rel="noopener noreferrer" className="text-dc-text-disabled hover:text-dc-text transition-colors">
                <GitHubIcon className="w-4 h-4" />
              </a>
              <a href="https://discord.gg/kFvT97hZsv" target="_blank" rel="noopener noreferrer" className="text-dc-text-disabled hover:text-dc-text transition-colors">
                <DiscordIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

/* ── Helper: Code block with step number ── */
function CodeBlock({ n, title, lang, children }: { n: string; title: string; lang: string; children: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold mb-2 text-dc-text flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-dc-surface-secondary border border-dc-border flex items-center justify-center text-[10px] font-mono text-dc-text-muted">{n}</span>
        {title}
      </h4>
      <div className="border border-dc-border rounded-lg text-xs bg-dc-surface-secondary overflow-x-auto">
        <pre className={`language-${lang} text-dc-text-secondary p-3 bg-dc-surface-secondary min-w-0`}>
          <code className={`language-${lang}`}>{children}</code>
        </pre>
      </div>
    </div>
  )
}
