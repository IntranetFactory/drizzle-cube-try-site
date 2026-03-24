import { SchemaVisualization } from 'drizzle-cube/client/schema'

export default function SchemaPage() {
  return (
    <div className="-m-6 min-h-screen flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-dc-border px-4 sm:px-6 py-4">
        <h1 className="text-xl sm:text-2xl font-bold text-dc-text">Schema Visualization</h1>
        <p className="mt-1 text-sm text-dc-text-secondary leading-relaxed">
          Interactive diagram of cube relationships. Drag nodes to reposition, right-click for auto layout.
          Click fields to inspect them.
        </p>
      </div>

      {/* Schema Visualization */}
      <div className="mx-4 sm:mx-6 my-4 border border-dc-border rounded-lg overflow-hidden flex-1 bg-dc-surface">
        <SchemaVisualization height="calc(100vh - 210px)" />
      </div>
    </div>
  )
}
