/**
 * Domain cube path: converts Semantius domain_cubes (semantic model) into
 * Drizzle schema + Cube[] definitions.
 */

import { writeFileSync } from 'fs'
import { jsonToSchema, type SchemaJSON, type SerializedColumn } from './schemaGenerator'
import { entityCubesToCubes } from './entityCubeCore'
import type { EntityCube, EntityCubeJoin, EntityDimension, EntityMeasure } from './entityCubeCore'


// ─── Helpers ───

function toPascalCase(snake: string): string {
  return snake.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
}

function domainPropToDimensionType(prop: any): 'string' | 'number' | 'boolean' | 'time' {
  if (prop.format === 'date' || prop.format === 'date-time') return 'time'
  if (prop.type === 'integer' || prop.type === 'number') return 'number'
  if (prop.type === 'boolean') return 'boolean'
  return 'string'
}

function domainPropToSqlType(prop: any): SerializedColumn['type'] {
  if (prop.format === 'reference' || prop.format === 'parent') return 'integer'
  if (prop.format === 'date' || prop.format === 'date-time') return 'timestamp'
  if (prop.type === 'integer') return 'integer'
  if (prop.type === 'number') return 'real'
  if (prop.type === 'boolean') return 'boolean'
  return 'text'
}

// ─── domain_cubes → EntityCube[] ───

function domainCubesToEntityCubes(domainCubes: any[]): EntityCube[] {
  const tableNames = new Set(domainCubes.map((dc: any) => dc.table.table_name))
  const tableIdColumns = new Map<string, string>(domainCubes.map((dc: any) => [dc.table.table_name, dc.table.id_column ?? 'id']))

  const cubes = domainCubes.map((dc: any) => {
    const tableName: string = dc.table.table_name
    const cubeName = toPascalCase(tableName)
    const properties: Record<string, any> = dc.properties || {}

    const dimensions: Record<string, EntityDimension> = {}
    const measures: Record<string, EntityMeasure> = {}
    const joins: Record<string, EntityCubeJoin> = {}
    const pkColumn: string = dc.table.id_column ?? 'id'

    let countMeasure = false
    const amountFields: { fieldName: string; title: string }[] = []

    for (const [fieldName, prop] of Object.entries(properties) as [string, any][]) {
      // Skip system timestamp fields
      if (prop.inputMode === 'disabled') continue

      // Measure flags per field
      if (prop.cube_type === 'auto' && prop.ctype === 'id') countMeasure = true
      if (prop.cube_type === 'measure' && prop.format === 'string') countMeasure = true

      let amountMeasure = false
      if (prop.cube_type === 'auto' && prop.type === 'number') amountMeasure = true
      if (prop.cube_type === 'measure' && prop.type === 'integer') amountMeasure = true
      if (amountMeasure) amountFields.push({ fieldName, title: prop.title || fieldName })

      // Reference fields → belongsTo join + FK dimension
      if (prop.format === 'reference' || prop.format === 'parent') {
        if (prop.reference_table && tableNames.has(prop.reference_table)) {
          const targetCubeName = toPascalCase(prop.reference_table)
          joins[targetCubeName] = {
            targetCube: targetCubeName,
            relationship: 'belongsTo',
            on: [{
              source: `${tableName}.${fieldName}`,
              target: `${prop.reference_table}.${tableIdColumns.get(prop.reference_table) ?? 'id'}`
            }]
          }
        }
        dimensions[fieldName] = {
          name: fieldName,
          title: prop.title || fieldName,
          type: 'number',
          column: `${tableName}.${fieldName}`
        }
        continue
      }

      // Regular field → dimension
      const isPk = prop.ctype === 'id'
      dimensions[fieldName] = {
        name: fieldName,
        title: prop.title || fieldName,
        type: isPk ? 'number' : domainPropToDimensionType(prop),
        column: `${tableName}.${fieldName}`,
        ...(isPk && { primaryKey: true })
      }
    }

    // Add measures based on flags
    const label = dc.table.plural_label || cubeName
    if (countMeasure) {
      measures.count = {
        name: 'count',
        title: `${label} Count`,
        type: 'count',
        column: `${tableName}.${pkColumn}`
      }
    }

    for (const { fieldName, title } of amountFields) {
      const pascal = toPascalCase(fieldName)
      const col = `${tableName}.${fieldName}`
      measures[`total${pascal}`] = {
        name: `total${pascal}`, title: `Total ${title}`, type: 'sum', column: col
      }
      measures[`avg${pascal}`] = {
        name: `avg${pascal}`, title: `Average ${title}`, type: 'avg', column: col
      }
      measures[`median${pascal}`] = {
        name: `median${pascal}`, title: `Median ${title}`, type: 'median', column: col
      }
      measures[`stddev${pascal}`] = {
        name: `stddev${pascal}`, title: `${title} Std Dev`, type: 'stddev', column: col
      }
    }

    // Children → hasMany joins
    if (dc.children) {
      for (const child of dc.children as any[]) {
        const [childTable, childColumn] = (child.id as string).split('.')
        if (tableNames.has(childTable)) {
          const childCubeName = toPascalCase(childTable)
          if (!joins[childCubeName]) {
            joins[childCubeName] = {
              targetCube: childCubeName,
              relationship: 'hasMany',
              on: [{ source: `${tableName}.${pkColumn}`, target: `${childTable}.${childColumn}` }]
            }
          }
        }
      }
    }

    return {
      name: cubeName,
      title: dc.table.plural_label || cubeName,
      description: dc.description || '',
      tableName,
      dimensions,
      measures,
      ...(Object.keys(joins).length > 0 && { joins })
    } as EntityCube
  })

  // ── Pass 2: infer reverse hasMany joins from belongsTo ──
  const cubesByName = new Map(cubes.map(c => [c.name, c]))

  for (const cube of cubes) {
    if (!cube.joins) continue
    for (const join of Object.values(cube.joins)) {
      
      if (join.relationship !== 'belongsTo') continue
      const targetCube = cubesByName.get(join.targetCube)
      if (!targetCube || targetCube.name === cube.name) continue

      if (!targetCube.joins) targetCube.joins = {}
      if (targetCube.joins[cube.name]) continue

      targetCube.joins[cube.name] = {
        targetCube: cube.name,
        relationship: 'hasMany',
        on: join.on.map(({ source, target }) => ({ source: target, target: source })),
      }
    }
  }

  return cubes
}

// ─── domain_cubes → SchemaJSON ───

function domainCubesToSchemaJSON(domainCubes: any[]): SchemaJSON {
  const result: SchemaJSON = {}

  for (const dc of domainCubes) {
    const tableName: string = dc.table.table_name
    const properties: Record<string, any> = dc.properties || {}
    const columns: SerializedColumn[] = []

    for (const [fieldName, prop] of Object.entries(properties) as [string, any][]) {
      const isPk = prop.ctype === 'id'
      columns.push({
        key: fieldName,
        name: fieldName,
        type: domainPropToSqlType(prop),
        primaryKey: isPk,
        notNull: isPk || prop.inputMode === 'required',
        hasDefault: isPk || (!!prop.default && prop.default !== ''),
        ...(isPk && { generatedIdentity: 'always' as const }),
      })
    }

    result[tableName] = { tableName, columns }
  }

  return result
}

// ─── Build entry point ───

export function buildDomainCubes(domainCubes: any[]) {
  const entityCubes = domainCubesToEntityCubes(domainCubes)
  // writeFileSync('domainCubes.json', JSON.stringify(entityCubes, null, 2))
  const cubeSchemaJSON = domainCubesToSchemaJSON(domainCubes)
  const schema = jsonToSchema(cubeSchemaJSON)
  const allCubes = entityCubesToCubes(entityCubes, schema as unknown as Record<string, unknown>)
  return { schema, allCubes, cubeSchemaJSON }
}

export { domainCubesToEntityCubes, domainCubesToSchemaJSON }
