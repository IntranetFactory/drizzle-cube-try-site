import { pgTable, integer, text, real, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { getTableColumns } from 'drizzle-orm'
import { is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import type { Column } from 'drizzle-orm'

export interface SerializedColumn {
  key: string
  name: string
  type: 'integer' | 'text' | 'real' | 'boolean' | 'timestamp' | 'jsonb'
  primaryKey: boolean
  notNull: boolean
  hasDefault: boolean
  defaultValue?: unknown
  defaultNow?: boolean
  generatedIdentity?: 'always' | 'byDefault'
}

export interface SerializedTable {
  tableName: string
  columns: SerializedColumn[]
}

export type SchemaJSON = Record<string, SerializedTable>

const columnTypeMap: Record<string, SerializedColumn['type']> = {
  PgInteger: 'integer',
  PgText: 'text',
  PgReal: 'real',
  PgBoolean: 'boolean',
  PgTimestamp: 'timestamp',
  PgJsonb: 'jsonb',
}

export function tableToObject(table: PgTable): SerializedTable {
  const config = getTableConfig(table)
  const columns = getTableColumns(table)

  const serializedColumns: SerializedColumn[] = []

  for (const [key, column] of Object.entries(columns)) {
    const col = column as Column
    const type = columnTypeMap[col.columnType]
    if (!type) {
      throw new Error(`Unsupported column type: ${col.columnType}`)
    }

    const serialized: SerializedColumn = {
      key,
      name: col.name,
      type,
      primaryKey: col.primary,
      notNull: col.notNull,
      hasDefault: col.hasDefault,
    }

    if (col.generatedIdentity) {
      serialized.generatedIdentity = col.generatedIdentity.type
    } else if (col.hasDefault) {
      if (col.default !== undefined && typeof col.default !== 'object') {
        serialized.defaultValue = col.default
      } else if (type === 'timestamp') {
        serialized.defaultNow = true
      }
    }

    serializedColumns.push(serialized)
  }

  return {
    tableName: config.name,
    columns: serializedColumns,
  }
}

export function schemaToJSON(schemaObj: Record<string, unknown>): SchemaJSON {
  const result: SchemaJSON = {}

  for (const [key, value] of Object.entries(schemaObj)) {
    if (is(value, PgTable)) {
      result[key] = tableToObject(value)
    }
  }

  return result
}

const columnBuilders: Record<SerializedColumn['type'], (dbName: string) => any> = {
  integer: (name) => integer(name),
  text: (name) => text(name),
  real: (name) => real(name),
  boolean: (name) => boolean(name),
  timestamp: (name) => timestamp(name),
  jsonb: (name) => jsonb(name),
}

export function objectToTable(serialized: SerializedTable): PgTable {
  const columnDefs: Record<string, any> = {}

  for (const col of serialized.columns) {
    let builder = columnBuilders[col.type](col.name)

    if (col.primaryKey) {
      builder = builder.primaryKey()
    }
    if (col.generatedIdentity) {
      builder = col.generatedIdentity === 'always'
        ? builder.generatedAlwaysAsIdentity()
        : builder.generatedByDefaultAsIdentity()
    }
    if (col.notNull && !col.primaryKey) {
      builder = builder.notNull()
    }
    if (col.defaultNow) {
      builder = builder.defaultNow()
    } else if (col.defaultValue !== undefined) {
      builder = builder.default(col.defaultValue)
    }

    columnDefs[col.key] = builder
  }

  return pgTable(serialized.tableName, columnDefs)
}

export function jsonToSchema(json: SchemaJSON): Record<string, PgTable> {
  const result: Record<string, PgTable> = {}

  for (const [key, serialized] of Object.entries(json)) {
    result[key] = objectToTable(serialized)
  }

  return result
}
