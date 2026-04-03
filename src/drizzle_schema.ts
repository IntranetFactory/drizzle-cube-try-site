/**
 * Example database schema for Hono drizzle-cube demo
 * This demonstrates a typical business analytics schema with employees and departments
 */

const _schemaStart = performance.now()
import { pgTable, integer, text, real, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Employee table
export const employees = pgTable('employees', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  email: text('email'),
  active: boolean('active').default(true),
  department_id: integer('department_id'),
  organisation_id: integer('organisation_id').notNull(),
  salary: real('salary'),
  // Location fields
  city: text('city'),
  region: text('region'),
  country: text('country'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  created_at: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_employees_org').on(table.organisation_id),
  index('idx_employees_org_created').on(table.organisation_id, table.created_at),
  index('idx_employees_org_country').on(table.organisation_id, table.country),
  index('idx_employees_org_city').on(table.organisation_id, table.city)
])

// Department table
export const departments = pgTable('departments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  organisation_id: integer('organisation_id').notNull(),
  budget: real('budget')
}, (table) => [
  index('idx_departments_org').on(table.organisation_id)
])

// Productivity metrics table - daily productivity data per employee
export const productivity = pgTable('productivity', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  employee_id: integer('employee_id').notNull(),
  department_id: integer('department_id'),
  date: timestamp('date').notNull(),
  lines_of_code: integer('lines_of_code').default(0),
  pull_requests: integer('pull_requests').default(0),
  live_deployments: integer('live_deployments').default(0),
  days_off: boolean('days_off').default(false),
  happiness_index: integer('happiness_index'), // 1-10 scale
  organisation_id: integer('organisation_id').notNull(),
  created_at: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_productivity_org').on(table.organisation_id),
  index('idx_productivity_org_date').on(table.organisation_id, table.date),
  index('idx_productivity_org_created').on(table.organisation_id, table.created_at)
])

// Time Entries table - for tracking employee time allocation with fan-out scenarios
export const time_entries = pgTable('time_entries', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  employee_id: integer('employee_id').notNull(),
  department_id: integer('department_id').notNull(),
  date: timestamp('date').notNull(),
  allocation_type: text('allocation_type').notNull(), // 'development', 'maintenance', 'meetings', 'research'
  hours: real('hours').notNull(),
  description: text('description'),
  billable_hours: real('billable_hours').default(0),
  organisation_id: integer('organisation_id').notNull(),
  created_at: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_time_entries_org').on(table.organisation_id),
  index('idx_time_entries_org_date').on(table.organisation_id, table.date),
  index('idx_time_entries_org_created').on(table.organisation_id, table.created_at)
])

// PR Events table - tracks PR lifecycle events for funnel analysis
// Event types: created, review_requested, reviewed, changes_requested, approved, merged, closed
export const pr_events = pgTable('pr_events', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  pr_number: integer('pr_number').notNull(),
  event_type: text('event_type').notNull(),
  employee_id: integer('employee_id').notNull(),
  organisation_id: integer('organisation_id').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  created_at: timestamp('created_at').defaultNow()
}, (table) => [
  // Basic org filter
  index('idx_pr_events_org').on(table.organisation_id),
  // Flow analysis: lookup events for a PR in timestamp order
  index('idx_pr_events_flow_lookup').on(table.organisation_id, table.pr_number, table.timestamp),
  // Start step filtering: find events by type
  index('idx_pr_events_start_step').on(table.organisation_id, table.event_type),
  // Optimized start step: covers all columns needed for flow start queries
  index('idx_pr_events_start_step_optimized').on(table.organisation_id, table.event_type, table.timestamp, table.pr_number),
  // Funnel analysis: events by type with creation time
  index('idx_pr_events_funnel_start').on(table.organisation_id, table.event_type, table.created_at),
  // Time-based queries
  index('idx_pr_events_org_timestamp').on(table.organisation_id, table.timestamp),
  index('idx_pr_events_org_created').on(table.organisation_id, table.created_at)
])

// Teams table
export const teams = pgTable('teams', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  department_id: integer('department_id'),
  organisation_id: integer('organisation_id').notNull(),
  created_at: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_teams_org').on(table.organisation_id),
  index('idx_teams_org_dept').on(table.organisation_id, table.department_id)
])

// Employee-Teams junction table for many-to-many relationship
export const employee_teams = pgTable('employee_teams', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  employee_id: integer('employee_id').notNull(),
  team_id: integer('team_id').notNull(),
  role: text('role'), // 'lead', 'member', 'contributor'
  joined_at: timestamp('joined_at').defaultNow(),
  organisation_id: integer('organisation_id').notNull()
}, (table) => [
  index('idx_employee_teams_org').on(table.organisation_id),
  index('idx_employee_teams_employee').on(table.employee_id),
  index('idx_employee_teams_team').on(table.team_id)
])

// Analytics Pages table - for storing dashboard configurations
export const analytics_pages = pgTable('analytics_pages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  organisation_id: integer('organisation_id').notNull(),
  config: jsonb('config').notNull().$type<{
    portlets: Array<{
      id: string
      title: string
      query: string
      chartType: string
      chartConfig?: Record<string, unknown>
      displayConfig?: Record<string, unknown>
      dashboardFilterMapping?: string[]
      w: number
      h: number
      x: number
      y: number
    }>
    filters?: Array<{
      id: string
      label: string
      isUniversalTime?: boolean
      filter: {
        member: string
        operator: string
        values: unknown[]
      }
    }>
  }>(),
  order: integer('order').default(0),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_analytics_pages_org').on(table.organisation_id),
  index('idx_analytics_pages_org_active').on(table.organisation_id, table.is_active)
])

// Notebooks table - for storing AI notebook configurations
export const notebooks = pgTable('notebooks', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  organisation_id: integer('organisation_id').notNull(),
  config: jsonb('config').$type<{
    blocks: Array<{
      id: string
      type: 'portlet' | 'markdown'
      title?: string
      content?: string
      query?: string
      chartType?: string
      chartConfig?: Record<string, unknown>
      displayConfig?: Record<string, unknown>
    }>
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      toolCalls?: Array<{ name: string; status: string; result?: unknown }>
      timestamp: number
    }>
  }>(),
  order: integer('order').default(0),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
})

// Settings table - for storing application configuration and counters
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  organisation_id: integer('organisation_id').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_settings_org').on(table.organisation_id)
])

// Define relations for better type inference
export const employees_relations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.department_id],
    references: [departments.id]
  }),
  productivity_metrics: many(productivity),
  time_entries: many(time_entries),
  pr_events: many(pr_events),
  employee_teams: many(employee_teams)
}))

export const departments_relations = relations(departments, ({ many }) => ({
  employees: many(employees),
  time_entries: many(time_entries),
  teams: many(teams)
}))

export const productivity_relations = relations(productivity, ({ one }) => ({
  employee: one(employees, {
    fields: [productivity.employee_id],
    references: [employees.id]
  })
}))

export const time_entries_relations = relations(time_entries, ({ one }) => ({
  employee: one(employees, {
    fields: [time_entries.employee_id],
    references: [employees.id]
  }),
  department: one(departments, {
    fields: [time_entries.department_id],
    references: [departments.id]
  })
}))

export const pr_events_relations = relations(pr_events, ({ one }) => ({
  employee: one(employees, {
    fields: [pr_events.employee_id],
    references: [employees.id]
  })
}))

export const teams_relations = relations(teams, ({ one, many }) => ({
  department: one(departments, {
    fields: [teams.department_id],
    references: [departments.id]
  }),
  employee_teams: many(employee_teams)
}))

export const employee_teams_relations = relations(employee_teams, ({ one }) => ({
  employee: one(employees, {
    fields: [employee_teams.employee_id],
    references: [employees.id]
  }),
  team: one(teams, {
    fields: [employee_teams.team_id],
    references: [teams.id]
  })
}))

// Export schema for use with Drizzle
export const schema = {
  employees,
  departments,
  productivity,
  time_entries,
  pr_events,
  teams,
  employee_teams,
  analytics_pages,
  notebooks,
  settings,
  employees_relations,
  departments_relations,
  productivity_relations,
  time_entries_relations,
  pr_events_relations,
  teams_relations,
  employee_teams_relations
}

export type Schema = typeof schema

console.log(`schema.ts execution: ${(performance.now() - _schemaStart).toFixed(2)}ms`)
