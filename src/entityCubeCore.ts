/**
 * Shared types and EntityCube → Cube conversion engine.
 * Used by both domainCubes.ts and drizzleCubes.ts.
 */

import { eq, ne, gt, gte, lt, lte, inArray, notInArray, like, ilike, isNull, isNotNull, between, and, or, sql } from 'drizzle-orm'
import type { SQL, AnyColumn } from 'drizzle-orm'
import { defineCube } from 'drizzle-cube/server'
import type { BaseQueryDefinition, Cube, Dimension, Measure, CubeJoin, CubeRelationship, Hierarchy } from 'drizzle-cube/server'


// ─── EntityCube: same shape as Cube, will be refined to be fully serializable ───

export interface EntityCubeJoin {
  targetCube: string
  relationship: CubeRelationship
  on: Array<{ source: string; target: string }>
  sqlJoinType?: 'inner' | 'left' | 'right' | 'full'
  preferredFor?: string[]
}

export type EntityDimension = Omit<Dimension, 'sql'> & (
  | { column: string; sql?: never }
  | { column?: never; sql: string }
)

type FilterPrimitive = string | number | boolean

export type EntityFilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' |
  'inArray' | 'notInArray' | 'like' | 'ilike' | 'isNull' | 'isNotNull' | 'between'

export type EntityFilter =
  | { column: string; operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike'; value: FilterPrimitive }
  | { column: string; operator: 'isNull' | 'isNotNull' }
  | { column: string; operator: 'between'; value: [FilterPrimitive, FilterPrimitive] }
  | { column: string; operator: 'inArray' | 'notInArray'; value: FilterPrimitive[] }
  | { and: EntityFilter[] }
  | { or: EntityFilter[] }

export type EntityMeasure = Omit<Measure, 'sql' | 'filters'> & (
  | { column: string; sql?: never }
  | { column?: never; sql?: string }
) & {
  filters?: EntityFilter[]
}

export interface EntityCube {
  name: string
  title?: string
  description?: string
  exampleQuestions?: string[]
  tableName: string
  dimensions: Record<string, EntityDimension>
  measures: Record<string, EntityMeasure>
  joins?: Record<string, EntityCubeJoin>
  hierarchies?: Record<string, Hierarchy>
  public?: boolean
  sqlAlias?: string
  dataSource?: string
  meta?: Record<string, any>
}

// ─── Conversion helpers ───

function resolveColumn(schemaObj: Record<string, unknown>, ref: string): AnyColumn {
  const [tableName, columnName] = ref.split('.')
  const table = schemaObj[tableName] as Record<string, AnyColumn> | undefined
  if (!table) throw new Error(`Table "${tableName}" not found in schema (referenced by "${ref}")`)
  const col = table[columnName]
  if (!col) throw new Error(`Column "${columnName}" not found in table "${tableName}" (referenced by "${ref}")`)
  return col
}

/**
 * Parse an expression string like '(${schema["time_entries"].billable_hours} / NULLIF(${schema["time_entries"].hours}, 0) * 100)'
 * into a Drizzle SQL object, replacing ${schema["table"].column} patterns with actual schema column objects.
 * This preserves column identity so CTE aliasing and query building work correctly.
 */
function buildDynamicSql(schemaObj: Record<string, unknown>, expression: string): SQL {
  // Split on ${schema["tableName"].columnName} patterns, keeping the delimiters
  const pattern = /(\$\{schema\["([a-z_][a-z0-9_]*)"\]\.([a-z_][a-z0-9_]*)\})/gi
  const chunks: (AnyColumn | SQL)[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(expression)) !== null) {
    if (match.index > lastIndex) {
      chunks.push(sql.raw(expression.slice(lastIndex, match.index)))
    }
    const tableName = match[2]
    const columnName = match[3]
    const table = schemaObj[tableName] as Record<string, AnyColumn> | undefined
    if (!table) throw new Error(`Table "${tableName}" not found in schema (referenced in sql expression)`)
    const col = table[columnName]
    if (!col) throw new Error(`Column "${columnName}" not found in table "${tableName}" (referenced in sql expression)`)
    chunks.push(col)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < expression.length) {
    chunks.push(sql.raw(expression.slice(lastIndex)))
  }
  return sql.join(chunks)
}

function resolveEntityFilter(schemaObj: Record<string, unknown>, filter: EntityFilter): SQL {
  if ('and' in filter) {
    const conditions = filter.and.map(f => resolveEntityFilter(schemaObj, f))
    return and(...conditions)!
  }
  if ('or' in filter) {
    const conditions = filter.or.map(f => resolveEntityFilter(schemaObj, f))
    return or(...conditions)!
  }
  const col = resolveColumn(schemaObj, filter.column)
  switch (filter.operator) {
    case 'eq': return eq(col, filter.value)
    case 'ne': return ne(col, filter.value)
    case 'gt': return gt(col, filter.value)
    case 'gte': return gte(col, filter.value)
    case 'lt': return lt(col, filter.value)
    case 'lte': return lte(col, filter.value)
    case 'like': return like(col, filter.value as string)
    case 'ilike': return ilike(col, filter.value as string)
    case 'inArray': return inArray(col, filter.value as any[])
    case 'notInArray': return notInArray(col, filter.value as any[])
    case 'isNull': return isNull(col)
    case 'isNotNull': return isNotNull(col)
    case 'between': return between(col, (filter.value as [any, any])[0], (filter.value as [any, any])[1])
  }
}

// ─── Core engine: EntityCube[] → Cube[] ───

export function entityCubesToCubes(entityCubes: EntityCube[], schemaObj: Record<string, unknown>): Cube[] {
  // Per-call registries so cubes can lazily reference each other within one
  // build, without leaking state across requests/tenants.
  const cubeRegistry = new Map<string, Cube>()
  const cubeProxies = new Map<string, Cube>()
  const getCube = (name: string): Cube => {
    let proxy = cubeProxies.get(name)
    if (!proxy) {
      proxy = {} as Cube
      cubeProxies.set(name, proxy)
    }
    return proxy
  }

  for (const ec of entityCubes) {
    const { name, joins, tableName, ...rest } = ec

    // Convert tableName to sql function
    const table = schemaObj[tableName] as BaseQueryDefinition['from']
    const sqlFn = (): BaseQueryDefinition => ({ from: table })

    // Convert EntityCubeJoin -> CubeJoin by resolving string refs to schema columns
    const cubeJoins: Record<string, CubeJoin> | undefined = joins
      ? Object.fromEntries(
          Object.entries(joins).map(([key, join]) => [key, {
            ...join,
            targetCube: () => getCube(join.targetCube),
            on: join.on.map(({ source, target }) => ({
              source: (() => { try { return resolveColumn(schemaObj, source) } catch (e: any) { throw new Error(`[cube "${name}" join "${key}"] ${e.message}`) } })(),
              target: (() => { try { return resolveColumn(schemaObj, target) } catch (e: any) { throw new Error(`[cube "${name}" join "${key}"] ${e.message}`) } })(),
            })),
          }])
        )
      : undefined

    // Resolve column or sql strings to Drizzle column/SQL references in dimensions and measures
    const dimensions = Object.fromEntries(
      Object.entries(rest.dimensions).map(([key, dim]) => {
        const { column, sql: sqlStr, ...dimRest } = dim as EntityDimension & { column?: string; sql?: string }
        const sqlValue = column ? (() => { try { return resolveColumn(schemaObj, column) } catch (e: any) { throw new Error(`[cube "${name}" dimension "${key}"] ${e.message}`) } })() : sqlStr ? buildDynamicSql(schemaObj, sqlStr) : undefined
        return [key, sqlValue ? { ...dimRest, sql: sqlValue } : dimRest]
      })
    ) as Record<string, Dimension>

    const measures = Object.fromEntries(
      Object.entries(rest.measures).map(([key, m]) => {
        const { column, sql: sqlStr, filters, ...mRest } = m as EntityMeasure & { column?: string; sql?: string }
        const sqlValue = column ? (() => { try { return resolveColumn(schemaObj, column) } catch (e: any) { throw new Error(`[cube "${name}" measure "${key}"] ${e.message}`) } })() : sqlStr ? buildDynamicSql(schemaObj, sqlStr) : undefined
        const resolvedFilters = filters?.map(f => () => resolveEntityFilter(schemaObj, f))
        return [key, { ...mRest, ...(sqlValue && { sql: sqlValue }), ...(resolvedFilters && { filters: resolvedFilters }) }]
      })
    ) as Record<string, Measure>

    const config: Omit<Cube, 'name'> = { ...rest, sql: sqlFn, dimensions, measures, ...(cubeJoins && { joins: cubeJoins }) }
    const cube = defineCube(name, config) as Cube
    const proxy = getCube(name)
    Object.assign(proxy, cube)
    cubeRegistry.set(name, proxy)
  }

  return Array.from(cubeRegistry.values())
}
