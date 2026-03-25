import { Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { CubeProvider } from 'drizzle-cube/client'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import DashboardListPage from './pages/DashboardListPage'
import DashboardViewPage from './pages/DashboardViewPage'
import AnalysisBuilderPage from './pages/AnalysisBuilderPage'
import NotebooksListPage from './pages/NotebooksListPage'
import NotebookViewPage from './pages/NotebookViewPage'
import SchemaPage from './pages/SchemaPage'
import DataBrowserPage from './pages/DataBrowserPage'

const SEMANTIUS_API_KEY = import.meta.env.VITE_SEMANTIUS_API_KEY as string
const SEMANTIUS_ORG = import.meta.env.VITE_SEMANTIUS_ORG as string

interface SematiusOrg {
  id: string
  name: string
  logo: string | null
  postgrest_url: string
  client_id: string
  token: {
    access_token: string
    token_type: string
    expires_in: number
  }
}

async function fetchOrg(): Promise<SematiusOrg> {
  const res = await fetch(`https://api.semantius.cloud/organization/${SEMANTIUS_ORG}`, {
    headers: { 'x-api-key': SEMANTIUS_API_KEY }
  })
  if (!res.ok) throw new Error(`Failed to load organization (${res.status})`)
  return res.json()
}

function App() {
  const { data: org, isLoading, error } = useQuery({
    queryKey: ['semantius-org', SEMANTIUS_ORG],
    queryFn: fetchOrg,
    staleTime: 50 * 60 * 1000, // 50 min — refresh before 60 min token expiry
    retry: 2
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Loading…
      </div>
    )
  }

  if (error || !org) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'red' }}>
        {error instanceof Error ? error.message : 'Failed to load organization'}
      </div>
    )
  }

  return (
    <HelmetProvider>
      <CubeProvider
        apiOptions={{
          apiUrl: '/cubejs-api/v1',
          headers: {
            'Authorization': org.token.access_token
          }
        }}
        features={{
          showSchemaDiagram: true,
          useAnalysisBuilder: true,
          enableAI: true,
          aiEndpoint: '/api/ai/generate',
          thumbnail: {
            enabled: true,
            // Using defaults (1600x1200) for crisp thumbnails
            format: 'png'
          }
        }}
      >
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboards" element={<DashboardListPage />} />
            <Route path="/dashboards/:id" element={<DashboardViewPage />} />
            <Route path="/analysis-builder" element={<AnalysisBuilderPage />} />
            <Route path="/notebooks" element={<NotebooksListPage />} />
            <Route path="/notebooks/:id" element={<NotebookViewPage />} />
            <Route path="/schema" element={<SchemaPage />} />
            <Route path="/data-browser" element={<DataBrowserPage />} />
          </Routes>
        </Layout>
      </CubeProvider>
    </HelmetProvider>
  )
}

export default App
