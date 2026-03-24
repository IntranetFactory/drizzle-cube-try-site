import { Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
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

function App() {
  return (
    <HelmetProvider>
      <CubeProvider
        apiOptions={{ apiUrl: '/cubejs-api/v1' }}
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
