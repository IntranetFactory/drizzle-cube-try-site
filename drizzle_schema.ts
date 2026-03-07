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
  departmentId: integer('department_id'),
  organisationId: integer('organisation_id').notNull(),
  salary: real('salary'),
  // Location fields
  city: text('city'),
  region: text('region'),
  country: text('country'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_employees_org').on(table.organisationId),
  index('idx_employees_org_created').on(table.organisationId, table.createdAt),
  index('idx_employees_org_country').on(table.organisationId, table.country),
  index('idx_employees_org_city').on(table.organisationId, table.city)
])

// Department table
export const departments = pgTable('departments', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  organisationId: integer('organisation_id').notNull(),
  budget: real('budget')
}, (table) => [
  index('idx_departments_org').on(table.organisationId)
])

// Productivity metrics table - daily productivity data per employee
export const productivity = pgTable('productivity', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer('employee_id').notNull(),
  departmentId: integer('department_id'),
  date: timestamp('date').notNull(),
  linesOfCode: integer('lines_of_code').default(0),
  pullRequests: integer('pull_requests').default(0),
  liveDeployments: integer('live_deployments').default(0),
  daysOff: boolean('days_off').default(false),
  happinessIndex: integer('happiness_index'), // 1-10 scale
  organisationId: integer('organisation_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_productivity_org').on(table.organisationId),
  index('idx_productivity_org_date').on(table.organisationId, table.date),
  index('idx_productivity_org_created').on(table.organisationId, table.createdAt)
])

// Time Entries table - for tracking employee time allocation with fan-out scenarios
export const timeEntries = pgTable('time_entries', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer('employee_id').notNull(),
  departmentId: integer('department_id').notNull(),
  date: timestamp('date').notNull(),
  allocationType: text('allocation_type').notNull(), // 'development', 'maintenance', 'meetings', 'research'
  hours: real('hours').notNull(),
  description: text('description'),
  billableHours: real('billable_hours').default(0),
  organisationId: integer('organisation_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_time_entries_org').on(table.organisationId),
  index('idx_time_entries_org_date').on(table.organisationId, table.date),
  index('idx_time_entries_org_created').on(table.organisationId, table.createdAt)
])

// PR Events table - tracks PR lifecycle events for funnel analysis
// Event types: created, review_requested, reviewed, changes_requested, approved, merged, closed
export const prEvents = pgTable('pr_events', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  prNumber: integer('pr_number').notNull(),
  eventType: text('event_type').notNull(),
  employeeId: integer('employee_id').notNull(),
  organisationId: integer('organisation_id').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  // Basic org filter
  index('idx_pr_events_org').on(table.organisationId),
  // Flow analysis: lookup events for a PR in timestamp order
  index('idx_pr_events_flow_lookup').on(table.organisationId, table.prNumber, table.timestamp),
  // Start step filtering: find events by type
  index('idx_pr_events_start_step').on(table.organisationId, table.eventType),
  // Optimized start step: covers all columns needed for flow start queries
  index('idx_pr_events_start_step_optimized').on(table.organisationId, table.eventType, table.timestamp, table.prNumber),
  // Funnel analysis: events by type with creation time
  index('idx_pr_events_funnel_start').on(table.organisationId, table.eventType, table.createdAt),
  // Time-based queries
  index('idx_pr_events_org_timestamp').on(table.organisationId, table.timestamp),
  index('idx_pr_events_org_created').on(table.organisationId, table.createdAt)
])

// Teams table
export const teams = pgTable('teams', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  departmentId: integer('department_id'),
  organisationId: integer('organisation_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => [
  index('idx_teams_org').on(table.organisationId),
  index('idx_teams_org_dept').on(table.organisationId, table.departmentId)
])

// Employee-Teams junction table for many-to-many relationship
export const employeeTeams = pgTable('employee_teams', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer('employee_id').notNull(),
  teamId: integer('team_id').notNull(),
  role: text('role'), // 'lead', 'member', 'contributor'
  joinedAt: timestamp('joined_at').defaultNow(),
  organisationId: integer('organisation_id').notNull()
}, (table) => [
  index('idx_employee_teams_org').on(table.organisationId),
  index('idx_employee_teams_employee').on(table.employeeId),
  index('idx_employee_teams_team').on(table.teamId)
])

// Analytics Pages table - for storing dashboard configurations
export const analyticsPages = pgTable('analytics_pages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  organisationId: integer('organisation_id').notNull(),
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
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_analytics_pages_org').on(table.organisationId),
  index('idx_analytics_pages_org_active').on(table.organisationId, table.isActive)
])

// Notebooks table - for storing AI notebook configurations
export const notebooks = pgTable('notebooks', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  description: text('description'),
  organisationId: integer('organisation_id').notNull(),
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
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// Settings table - for storing application configuration and counters
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  organisationId: integer('organisation_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => [
  index('idx_settings_org').on(table.organisationId)
])

// Define relations for better type inference
export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id]
  }),
  productivityMetrics: many(productivity),
  timeEntries: many(timeEntries),
  prEvents: many(prEvents),
  employeeTeams: many(employeeTeams)
}))

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
  timeEntries: many(timeEntries),
  teams: many(teams)
}))

export const productivityRelations = relations(productivity, ({ one }) => ({
  employee: one(employees, {
    fields: [productivity.employeeId],
    references: [employees.id]
  })
}))

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  employee: one(employees, {
    fields: [timeEntries.employeeId],
    references: [employees.id]
  }),
  department: one(departments, {
    fields: [timeEntries.departmentId],
    references: [departments.id]
  })
}))

export const prEventsRelations = relations(prEvents, ({ one }) => ({
  employee: one(employees, {
    fields: [prEvents.employeeId],
    references: [employees.id]
  })
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  department: one(departments, {
    fields: [teams.departmentId],
    references: [departments.id]
  }),
  employeeTeams: many(employeeTeams)
}))

export const employeeTeamsRelations = relations(employeeTeams, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeTeams.employeeId],
    references: [employees.id]
  }),
  team: one(teams, {
    fields: [employeeTeams.teamId],
    references: [teams.id]
  })
}))

// Export schema for use with Drizzle
export const schema = {
  employees,
  departments,
  productivity,
  timeEntries,
  prEvents,
  teams,
  employeeTeams,
  analyticsPages,
  notebooks,
  settings,
  employeesRelations,
  departmentsRelations,
  productivityRelations,
  timeEntriesRelations,
  prEventsRelations,
  teamsRelations,
  employeeTeamsRelations
}

export type Schema = typeof schema

console.log(`schema.ts execution: ${(performance.now() - _schemaStart).toFixed(2)}ms`)