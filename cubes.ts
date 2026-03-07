/**
 * Example cube definitions for Hono drizzle-cube demo
 * This demonstrates how to define type-safe analytics cubes using Drizzle ORM
 */

import { eq, sql } from 'drizzle-orm'
import { defineCube } from 'drizzle-cube/server'
import type { BaseQueryDefinition, Cube, Dimension, Measure, CubeJoin, CubeRelationship, Hierarchy } from 'drizzle-cube/server'
import type { AnyColumn } from 'drizzle-orm'
import * as staticSchema from './drizzle_schema'
import { schemaToJSON, jsonToSchema } from './schemaGenerator'

const t0 = performance.now()
const schemaJSON = schemaToJSON(staticSchema as unknown as Record<string, unknown>)
const t1 = performance.now()

// Persist schema as JSON when running in Node.js (skipped in Cloudflare Workers)
if (typeof process !== 'undefined' && process.versions?.node) {
  import('fs').then(fs => {
    import('url').then(url => {
      const dir = url.fileURLToPath(new URL('.', import.meta.url))
      fs.writeFileSync(dir + 'schema.json', JSON.stringify(schemaJSON, null, 2))
    })
  })
}

const t2 = performance.now()
const schema = jsonToSchema(schemaJSON) as unknown as typeof staticSchema
const t3 = performance.now()

console.log(`schemaToJSON: ${(t1 - t0).toFixed(2)}ms | jsonToSchema: ${(t3 - t2).toFixed(2)}ms`)

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
  | { column?: never; sql: Dimension['sql'] }
)

export type EntityMeasure = Omit<Measure, 'sql'> & (
  | { column: string; sql?: never }
  | { column?: never; sql?: Measure['sql'] }
)

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

// EntityCube registry - simple storage, no proxy handling needed
const entityCubeRegistry = new Map<string, EntityCube>()

function registerEntityCube(name: string, config: Omit<EntityCube, 'name'>): EntityCube {
  const cube: EntityCube = { name, ...config }
  entityCubeRegistry.set(name, cube)
  return cube
}

// Cube registry - handles proxy objects for lazy targetCube resolution
const cubeRegistry = new Map<string, Cube>()
const cubeProxies = new Map<string, Cube>()

function getCube(name: string): Cube {
  let proxy = cubeProxies.get(name)
  if (!proxy) {
    proxy = {} as Cube
    cubeProxies.set(name, proxy)
  }
  return proxy
}

/**
 * Employees cube - employee analytics (single table)
 */
registerEntityCube('Employees', {
  title: 'Employee Analytics',
  description: 'Employee data and metrics',
  
  tableName: "employees",

  // Cube-level joins for cross-cube queries
  joins: {
    Departments: {
      targetCube: 'Departments',
      relationship: 'belongsTo',
      on: [
        { source: "employees.departmentId", target: "departments.id" }
      ]
    },
    Productivity: {
      targetCube: 'Productivity',
      relationship: 'hasMany',
      on: [
        { source: "employees.id", target: "productivity.employeeId" }
      ]
    },
    TimeEntries: {
      targetCube: 'TimeEntries',
      relationship: 'hasMany',
      on: [
        { source: "employees.id", target: "timeEntries.employeeId" }
      ]
    },
    PREvents: {
      targetCube: 'PREvents',
      relationship: 'hasMany',
      on: [
        { source: "employees.id", target: "prEvents.employeeId" }
      ]
    },
    EmployeeTeams: {
      targetCube: 'EmployeeTeams',
      relationship: 'hasMany',
      preferredFor: ['Teams'],
      on: [
        { source: "employees.id", target: "employeeTeams.employeeId" }
      ]
    }
  },

  hierarchies: {
    location: {
      name: 'location',
      title: 'Geographic Location',
      levels: ['country', 'region', 'city']
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Employee ID',
      type: 'number',
      column: "employees.id",
      primaryKey: true
    },
    name: {
      name: 'name',
      title: 'Employee Name',
      type: 'string',
      column: "employees.name"
    },
    email: {
      name: 'email',
      title: 'Email Address',
      type: 'string',
      column: "employees.email"
    },
    departmentId: {
      name: 'departmentId',
      title: 'Department ID',
      type: 'number',
      column: "employees.departmentId"
    },
    isActive: {
      name: 'isActive',
      title: 'Active Status',
      type: 'boolean',
      column: "employees.active"
    },
    createdAt: {
      name: 'createdAt',
      title: 'Hire Date',
      type: 'time',
      column: "employees.createdAt"
    },
    // Location dimensions
    city: {
      name: 'city',
      title: 'City',
      type: 'string',
      column: "employees.city"
    },
    region: {
      name: 'region',
      title: 'State/Region',
      type: 'string',
      column: "employees.region"
    },
    country: {
      name: 'country',
      title: 'Country',
      type: 'string',
      column: "employees.country"
    },
    latitude: {
      name: 'latitude',
      title: 'Latitude',
      type: 'number',
      column: "employees.latitude"
    },
    longitude: {
      name: 'longitude',
      title: 'Longitude',
      type: 'number',
      column: "employees.longitude"
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Employees',
      type: 'countDistinct',
      column: "employees.id",
      drillMembers: ['Employees.name', 'Employees.email', 'Employees.isActive', 'Departments.name']
    },
    activeCount: {
      name: 'activeCount',
      title: 'Active Employees',
      type: 'countDistinct',
      column: "employees.id",
      filters: [
        () => eq(schema["employees"].active, true)
      ],
      drillMembers: ['Employees.name', 'Employees.email', 'Departments.name']
    },
    totalSalary: {
      name: 'totalSalary',
      title: 'Total Salary',
      type: 'sum',
      column: "employees.salary",
      drillMembers: ['Employees.name', 'Departments.name', 'Employees.city']
    },
    avgSalary: {
      name: 'avgSalary',
      title: 'Average Salary',
      type: 'avg',
      column: "employees.salary",
      format: 'currency',
      drillMembers: ['Employees.name', 'Departments.name', 'Employees.city']
    },
    // Statistical measures
    medianSalary: {
      name: 'medianSalary',
      title: 'Median Salary',
      type: 'median',
      column: "employees.salary",
      description: 'Median salary (50th percentile)'
    },
    stddevSalary: {
      name: 'stddevSalary',
      title: 'Salary Std Dev',
      type: 'stddev',
      column: "employees.salary",
      description: 'Standard deviation of salaries'
    }
  }
})


/**
 * Departments cube - department-level analytics (single table)
 */
registerEntityCube('Departments', {
  title: 'Department Analytics',
  description: 'Department-level metrics and budget analysis',
  
  tableName: "departments",

  // Cube-level joins for cross-cube queries
  joins: {
    Employees: {
      targetCube: 'Employees',
      relationship: 'hasMany',
      on: [
        { source: "departments.id", target: "employees.departmentId" }
      ]
    },
    TimeEntries: {
      targetCube: 'TimeEntries',
      relationship: 'hasMany',
      on: [
        { source: "departments.id", target: "timeEntries.departmentId" }
      ]
    },
    Productivity: {
      targetCube: 'Productivity',
      relationship: 'hasMany',
      on: [
        { source: "departments.id", target: "productivity.departmentId" }
      ]
    },
    Teams: {
      targetCube: 'Teams',
      relationship: 'hasMany',
      on: [
        { source: "departments.id", target: "teams.departmentId" }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Department ID',
      type: 'number',
      column: "departments.id",
      primaryKey: true
    },
    name: {
      name: 'name',
      title: 'Department Name',
      type: 'string',
      column: "departments.name"
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Department Count',
      type: 'countDistinct',
      column: "departments.id",
      drillMembers: ['Departments.name']
    },
    totalBudget: {
      name: 'totalBudget',
      title: 'Total Budget',
      type: 'sum',
      column: "departments.budget",
      drillMembers: ['Departments.name']
    },
    avgBudget: {
      name: 'avgBudget',
      title: 'Average Budget',
      type: 'avg',
      column: "departments.budget",
      drillMembers: ['Departments.name']
    }
  }
})

/**
 * Productivity cube - productivity metrics with time dimensions
 */
registerEntityCube('Productivity', {
  title: 'Productivity Analytics',
  description: 'Daily productivity metrics including code output and deployments',
  
  tableName: "productivity",

  // Cube-level joins for multi-cube queries
  joins: {
    Employees: {
      targetCube: 'Employees',
      relationship: 'belongsTo',
      preferredFor: ['Teams'],
      on: [
        { source: "productivity.employeeId", target: "employees.id" }
      ]
    },
    EmployeeTeams: {
      targetCube: 'EmployeeTeams',
      relationship: 'hasMany',
      preferredFor: ['Teams'],
      on: [
        { source: "productivity.employeeId", target: "employeeTeams.employeeId" }
      ]
    },
    Departments: {
      targetCube: 'Departments',
      relationship: 'belongsTo',
      on: [
        { source: "productivity.departmentId", target: "departments.id" }
      ]
    }
  },

  hierarchies: {
    happinessHierarchy: {
      name: 'happinessHierarchy',
      title: 'Happiness Breakdown',
      levels: ['happinessLevel', 'happinessIndex']
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Record ID',
      type: 'number',
      column: "productivity.id",
      primaryKey: true
    },
    date: {
      name: 'date',
      title: 'Date',
      type: 'time',
      column: "productivity.date"
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      column: "productivity.createdAt"
    },
    isDayOff: {
      name: 'isDayOff',
      title: 'Day Off',
      type: 'boolean',
      column: "productivity.daysOff"
    },
    happinessIndex: {
      name: 'happinessIndex',
      title: 'Happiness Index',
      type: 'number',
      column: "productivity.happinessIndex"
    },
    happinessLevel: {
      name: 'happinessLevel',
      title: 'Happiness Level',
      type: 'string',
      sql: sql`
        CASE 
          WHEN ${schema["productivity"].happinessIndex} >= 8 THEN 'High'
          WHEN ${schema["productivity"].happinessIndex} >= 6 THEN 'Medium'
          ELSE 'Low'
        END
      `
    },
    departmentId: {
      name: 'departmentId',
      title: 'Department ID',
      type: 'number',
      column: "productivity.departmentId"
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      column: "productivity.employeeId"
    },
    linesOfCode: {
      name: 'linesOfCode',
      title: 'Lines of Code',
      type: 'number',
      column: "productivity.linesOfCode",
      description: 'Raw lines of code for this record'
    },
    pullRequests: {
      name: 'pullRequests',
      title: 'Pull Requests',
      type: 'number',
      column: "productivity.pullRequests",
      description: 'Raw PR count for this record'
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Records',
      type: 'count',
      column: "productivity.id",
      drillMembers: ['Productivity.date', 'Employees.name', 'Departments.name']
    },
    recordCount: {
      name: 'recordCount',
      title: 'Record Count',
      type: 'count',
      column: "productivity.id",
      drillMembers: ['Productivity.date', 'Employees.name', 'Departments.name']
    },
    workingDaysCount: {
      name: 'workingDaysCount',
      title: 'Working Days',
      type: 'count',
      column: "productivity.id",
      filters: [
        () => eq(schema["productivity"].daysOff, false)
      ],
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.isDayOff']
    },
    daysOffCount: {
      name: 'daysOffCount',
      title: 'Days Off',
      type: 'count',
      column: "productivity.id",
      filters: [
        () => eq(schema["productivity"].daysOff, true)
      ],
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.isDayOff']
    },
    avgLinesOfCode: {
      name: 'avgLinesOfCode',
      title: 'Average Lines of Code',
      type: 'avg',
      column: "productivity.linesOfCode",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.linesOfCode', 'Departments.name']
    },
    totalLinesOfCode: {
      name: 'totalLinesOfCode',
      title: 'Total Lines of Code',
      type: 'sum',
      column: "productivity.linesOfCode",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.linesOfCode', 'Departments.name']
    },
    totalPullRequests: {
      name: 'totalPullRequests',
      title: 'Total Pull Requests',
      type: 'sum',
      column: "productivity.pullRequests",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.pullRequests', 'Departments.name']
    },
    avgPullRequests: {
      name: 'avgPullRequests',
      title: 'Average Pull Requests',
      type: 'avg',
      column: "productivity.pullRequests",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.pullRequests', 'Departments.name']
    },
    totalDeployments: {
      name: 'totalDeployments',
      title: 'Total Deployments',
      type: 'sum',
      column: "productivity.liveDeployments"
    },
    avgDeployments: {
      name: 'avgDeployments',
      title: 'Average Deployments',
      type: 'avg',
      column: "productivity.liveDeployments"
    },
    avgHappinessIndex: {
      name: 'avgHappinessIndex',
      title: 'Average Happiness',
      type: 'avg',
      column: "productivity.happinessIndex",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.happinessIndex', 'Productivity.happinessLevel']
    },
    productivityScore: {
      name: 'productivityScore',
      title: 'Productivity Score',
      type: 'avg',
      sql: sql`(${schema["productivity"].linesOfCode} + ${schema["productivity"].pullRequests} * 50 + ${schema["productivity"].liveDeployments} * 100)`,
      description: 'Composite productivity score based on code output, reviews, and deployments'
    },

    // Statistical measures - Code Output Distribution
    stddevLinesOfCode: {
      name: 'stddevLinesOfCode',
      title: 'Lines of Code Std Dev',
      type: 'stddev',
      column: "productivity.linesOfCode",
      description: 'Variation in daily code output'
    },
    medianLinesOfCode: {
      name: 'medianLinesOfCode',
      title: 'Median Lines of Code',
      type: 'median',
      column: "productivity.linesOfCode",
      description: 'Median daily code output'
    },
    p95LinesOfCode: {
      name: 'p95LinesOfCode',
      title: '95th Percentile Lines',
      type: 'p95',
      column: "productivity.linesOfCode",
      description: 'High performer code output threshold'
    },
    // Statistical measures - Happiness Distribution
    stddevHappinessIndex: {
      name: 'stddevHappinessIndex',
      title: 'Happiness Std Dev',
      type: 'stddev',
      column: "productivity.happinessIndex",
      description: 'Variation in team happiness'
    },
    medianHappinessIndex: {
      name: 'medianHappinessIndex',
      title: 'Median Happiness',
      type: 'median',
      column: "productivity.happinessIndex",
      description: 'Median happiness score'
    },
    // Statistical measures - Pull Requests
    medianPullRequests: {
      name: 'medianPullRequests',
      title: 'Median Pull Requests',
      type: 'median',
      column: "productivity.pullRequests",
      description: 'Median daily pull requests'
    },
    p95PullRequests: {
      name: 'p95PullRequests',
      title: '95th Percentile PRs',
      type: 'p95',
      column: "productivity.pullRequests",
      description: 'High performer PR threshold'
    },

    // ============================================
    // Post-Aggregation Window Function Measures
    // These operate on aggregated data - the base measure is aggregated first,
    // then the window function is applied to the aggregated results.
    // ============================================

    // LAG - Compare to previous period's total (difference)
    linesOfCodeChange: {
      name: 'linesOfCodeChange',
      title: 'Lines Change (vs Previous)',
      type: 'lag',
      description: 'Change in lines of code compared to previous period',
      windowConfig: {
        measure: 'totalLinesOfCode',
        operation: 'difference',
        orderBy: [{ field: 'date', direction: 'asc' }]
      }
    },

    // LAG - Get previous period's total (raw value)
    previousPeriodLines: {
      name: 'previousPeriodLines',
      title: 'Previous Period Lines',
      type: 'lag',
      description: 'Lines of code from the previous period',
      windowConfig: {
        measure: 'totalLinesOfCode',
        operation: 'raw',
        orderBy: [{ field: 'date', direction: 'asc' }]
      }
    },

    // LAG - Percent change from previous period
    linesPercentChange: {
      name: 'linesPercentChange',
      title: 'Lines % Change',
      type: 'lag',
      description: 'Percent change in lines of code from previous period',
      windowConfig: {
        measure: 'totalLinesOfCode',
        operation: 'percentChange',
        orderBy: [{ field: 'date', direction: 'asc' }]
      }
    },

    // RANK - Rank periods by total lines (most productive = rank 1)
    productivityRank: {
      name: 'productivityRank',
      title: 'Productivity Rank',
      type: 'rank',
      description: 'Rank by total lines of code (1 = most productive period)',
      windowConfig: {
        measure: 'totalLinesOfCode',
        operation: 'raw',
        orderBy: [{ field: 'totalLinesOfCode', direction: 'desc' }]
      }
    },

    // Running total - Cumulative sum of lines
    runningTotalLines: {
      name: 'runningTotalLines',
      title: 'Running Total Lines',
      type: 'movingSum',
      description: 'Cumulative total lines of code over time',
      windowConfig: {
        measure: 'totalLinesOfCode',
        operation: 'raw',
        orderBy: [{ field: 'date', direction: 'asc' }],
        frame: {
          type: 'rows',
          start: 'unbounded',
          end: 'current'
        }
      }
    },

    // Moving 7-period average for trend analysis
    movingAvg7Period: {
      name: 'movingAvg7Period',
      title: '7-Period Moving Avg',
      type: 'movingAvg',
      description: '7-period moving average of lines of code',
      windowConfig: {
        measure: 'totalLinesOfCode',
        operation: 'raw',
        orderBy: [{ field: 'date', direction: 'asc' }],
        frame: {
          type: 'rows',
          start: 6,
          end: 'current'
        }
      }
    }
  }
})

/**
 * Time Entries cube - time tracking analytics with allocation types
 */
registerEntityCube('TimeEntries', {
  title: 'Time Entries Analytics', 
  description: 'Employee time tracking with allocation types, departments, and billable hours',
  
  tableName: "timeEntries",

  joins: {
    Employees: {
      targetCube: 'Employees',
      relationship: 'belongsTo',
      on: [
        { source: "timeEntries.employeeId", target: "employees.id" }
      ]
    },
    Departments: {
      targetCube: 'Departments',
      relationship: 'belongsTo',
      on: [
        { source: "timeEntries.departmentId", target: "departments.id" }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Time Entry ID',
      type: 'number',
      column: "timeEntries.id",
      primaryKey: true
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      column: "timeEntries.employeeId"
    },
    departmentId: {
      name: 'departmentId', 
      title: 'Department ID',
      type: 'number',
      column: "timeEntries.departmentId"
    },
    allocationType: {
      name: 'allocationType',
      title: 'Allocation Type',
      type: 'string',
      column: "timeEntries.allocationType"
    },
    description: {
      name: 'description',
      title: 'Task Description',
      type: 'string',
      column: "timeEntries.description"
    },
    date: {
      name: 'date',
      title: 'Date',
      type: 'time',
      column: "timeEntries.date"
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      column: "timeEntries.createdAt"
    }
  },

  measures: {
    // Basic count measures
    count: {
      name: 'count',
      title: 'Total Time Entries',
      type: 'count',
      column: "timeEntries.id",
      description: 'Total number of time entries'
    },
    
    // Hours-based measures
    totalHours: {
      name: 'totalHours',
      title: 'Total Hours',
      type: 'sum',
      column: "timeEntries.hours",
      description: 'Sum of all logged hours'
    },
    avgHours: {
      name: 'avgHours',
      title: 'Average Hours per Entry',
      type: 'avg',
      column: "timeEntries.hours",
      description: 'Average hours per time entry'
    },
    minHours: {
      name: 'minHours',
      title: 'Minimum Hours',
      type: 'min',
      column: "timeEntries.hours"
    },
    maxHours: {
      name: 'maxHours',
      title: 'Maximum Hours',
      type: 'max',
      column: "timeEntries.hours"
    },
    
    // Billable hours measures
    totalBillableHours: {
      name: 'totalBillableHours',
      title: 'Total Billable Hours',
      type: 'sum',
      column: "timeEntries.billableHours",
      description: 'Sum of all billable hours'
    },
    avgBillableHours: {
      name: 'avgBillableHours',
      title: 'Average Billable Hours',
      type: 'avg',
      column: "timeEntries.billableHours"
    },
    
    // Allocation-specific measures with filters
    developmentHours: {
      name: 'developmentHours',
      title: 'Development Hours',
      type: 'sum',
      column: "timeEntries.hours",
      filters: [
        () => eq(schema["timeEntries"].allocationType, 'development')
      ],
      description: 'Total hours spent on development tasks'
    },
    meetingHours: {
      name: 'meetingHours',
      title: 'Meeting Hours',
      type: 'sum',
      column: "timeEntries.hours",
      filters: [
        () => eq(schema["timeEntries"].allocationType, 'meetings')
      ],
      description: 'Total hours spent in meetings'
    },
    maintenanceHours: {
      name: 'maintenanceHours',
      title: 'Maintenance Hours',
      type: 'sum',
      column: "timeEntries.hours",
      filters: [
        () => eq(schema["timeEntries"].allocationType, 'maintenance')
      ]
    },
    
    // Distinct count measures
    distinctEmployees: {
      name: 'distinctEmployees',
      title: 'Unique Employees',
      type: 'countDistinct',
      column: "timeEntries.employeeId",
      description: 'Number of unique employees with time entries'
    },
    distinctDepartments: {
      name: 'distinctDepartments',
      title: 'Unique Departments',
      type: 'countDistinct', 
      column: "timeEntries.departmentId"
    },
    distinctAllocations: {
      name: 'distinctAllocations',
      title: 'Unique Allocation Types',
      type: 'countDistinct',
      column: "timeEntries.allocationType"
    },
    
    // Complex calculated measures
    utilizationRate: {
      name: 'utilizationRate',
      title: 'Utilization Rate (%)',
      type: 'avg',
      sql: sql`(${schema["timeEntries"].billableHours} / NULLIF(${schema["timeEntries"].hours}, 0) * 100)`,
      description: 'Percentage of billable vs total hours'
    },
    avgDailyHours: {
      name: 'avgDailyHours',  
      title: 'Average Daily Hours',
      type: 'avg',
      column: "timeEntries.hours",
      description: 'Average hours logged per day'
    }
  }
})

/**
 * PR Events cube - PR lifecycle events for funnel analysis
 */
registerEntityCube('PREvents', {
  title: 'PR Events',
  description: 'Pull request lifecycle events for funnel analysis',

  tableName: "prEvents",

  joins: {
    Employees: {
      targetCube: 'Employees',
      relationship: 'belongsTo',
      on: [
        { source: "prEvents.employeeId", target: "employees.id" }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Event ID',
      type: 'number',
      column: "prEvents.id",
      primaryKey: true
    },
    prNumber: {
      name: 'prNumber',
      title: 'PR Number',
      type: 'number',
      column: "prEvents.prNumber"
    },
    eventType: {
      name: 'eventType',
      title: 'Event Type',
      type: 'string',
      column: "prEvents.eventType"
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      column: "prEvents.employeeId"
    },
    timestamp: {
      name: 'timestamp',
      title: 'Event Timestamp',
      type: 'time',
      column: "prEvents.timestamp"
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      column: "prEvents.createdAt"
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Event Count',
      type: 'count',
      column: "prEvents.id",
      drillMembers: ['PREvents.prNumber', 'PREvents.eventType', 'PREvents.timestamp', 'Employees.name']
    },
    uniquePRs: {
      name: 'uniquePRs',
      title: 'Unique PRs',
      type: 'countDistinct',
      column: "prEvents.prNumber",
      drillMembers: ['PREvents.prNumber', 'PREvents.eventType', 'PREvents.timestamp']
    },
    uniqueActors: {
      name: 'uniqueActors',
      title: 'Unique Actors',
      type: 'countDistinct',
      column: "prEvents.employeeId",
      drillMembers: ['Employees.name', 'PREvents.prNumber', 'PREvents.eventType']
    }
  },

  // Event stream marker for funnel queries
  meta: {
    eventStream: {
      bindingKey: 'PREvents.prNumber',
      timeDimension: 'PREvents.timestamp'
    }
  }
})

/**
 * Teams cube - team analytics
 */
registerEntityCube('Teams', {
  title: 'Team Analytics',
  description: 'Team structure and membership analysis',

  tableName: "teams",

  joins: {
    Departments: {
      targetCube: 'Departments',
      relationship: 'belongsTo',
      on: [
        { source: "teams.departmentId", target: "departments.id" }
      ]
    },
    EmployeeTeams: {
      targetCube: 'EmployeeTeams',
      relationship: 'hasMany',
      preferredFor: ['Productivity'],
      on: [
        { source: "teams.id", target: "employeeTeams.teamId" }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Team ID',
      type: 'number',
      column: "teams.id",
      primaryKey: true
    },
    name: {
      name: 'name',
      title: 'Team Name',
      type: 'string',
      column: "teams.name"
    },
    description: {
      name: 'description',
      title: 'Description',
      type: 'string',
      column: "teams.description"
    },
    departmentId: {
      name: 'departmentId',
      title: 'Department ID',
      type: 'number',
      column: "teams.departmentId"
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      column: "teams.createdAt"
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Teams',
      type: 'countDistinct',
      column: "teams.id",
      drillMembers: ['Teams.name', 'Teams.description', 'Departments.name']
    }
  }
})

/**
 * EmployeeTeams cube - junction table for many-to-many analysis
 */
registerEntityCube('EmployeeTeams', {
  title: 'Employee Team Membership',
  description: 'Employee team assignments and roles',

  tableName: "employeeTeams",

  joins: {
    Employees: {
      targetCube: 'Employees',
      relationship: 'belongsTo',
      preferredFor: ['Productivity'],
      on: [
        { source: "employeeTeams.employeeId", target: "employees.id" }
      ]
    },
    Teams: {
      targetCube: 'Teams',
      relationship: 'belongsTo',
      preferredFor: ['Productivity'],
      on: [
        { source: "employeeTeams.teamId", target: "teams.id" }
      ]
    }
  },

  hierarchies: {
    roleHierarchy: {
      name: 'roleHierarchy',
      title: 'Team Role',
      levels: ['role']
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Membership ID',
      type: 'number',
      column: "employeeTeams.id",
      primaryKey: true
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      column: "employeeTeams.employeeId"
    },
    teamId: {
      name: 'teamId',
      title: 'Team ID',
      type: 'number',
      column: "employeeTeams.teamId"
    },
    role: {
      name: 'role',
      title: 'Team Role',
      type: 'string',
      column: "employeeTeams.role"
    },
    joinedAt: {
      name: 'joinedAt',
      title: 'Joined Team',
      type: 'time',
      column: "employeeTeams.joinedAt"
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Memberships',
      type: 'count',
      column: "employeeTeams.id",
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.role', 'EmployeeTeams.joinedAt']
    },
    uniqueEmployees: {
      name: 'uniqueEmployees',
      title: 'Unique Employees',
      type: 'countDistinct',
      column: "employeeTeams.employeeId",
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.role']
    },
    uniqueTeams: {
      name: 'uniqueTeams',
      title: 'Unique Teams',
      type: 'countDistinct',
      column: "employeeTeams.teamId",
      drillMembers: ['Teams.name', 'Employees.name', 'EmployeeTeams.role']
    },
    leadCount: {
      name: 'leadCount',
      title: 'Team Leads',
      type: 'count',
      column: "employeeTeams.id",
      filters: [
        () => eq(schema["employeeTeams"].role, 'lead')
      ],
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.joinedAt']
    }
  }
})

/**
 * Convert EntityCube registry to Cube[] via defineCube.
 * Resolves string targetCube references to lazy Cube proxy lookups.
 * This is where we will later also generate schema and replace strings with functions.
 */
function resolveColumn(ref: string): AnyColumn {
  const [tableName, columnName] = ref.split('.')
  const table = schema[tableName as keyof typeof schema] as unknown as Record<string, AnyColumn>
  return table[columnName]
}

function entityCubesToCubes(registry: Map<string, EntityCube>): Cube[] {
  for (const ec of registry.values()) {
    const { name, joins, tableName, ...rest } = ec

    // Convert tableName to sql function
    const table = schema[tableName as keyof typeof schema] as BaseQueryDefinition['from']
    const sqlFn = (): BaseQueryDefinition => ({ from: table })

    // Convert EntityCubeJoin -> CubeJoin by resolving string refs to schema columns
    const cubeJoins: Record<string, CubeJoin> | undefined = joins
      ? Object.fromEntries(
          Object.entries(joins).map(([key, join]) => [key, {
            ...join,
            targetCube: () => getCube(join.targetCube),
            on: join.on.map(({ source, target }) => ({
              source: resolveColumn(source),
              target: resolveColumn(target),
            })),
          }])
        )
      : undefined

    // Resolve column strings to sql references in dimensions and measures
    // Resolve column strings to sql references in dimensions and measures
    const dimensions = Object.fromEntries(
      Object.entries(rest.dimensions).map(([key, dim]) => {
        const { column, ...dimRest } = dim as EntityDimension & { column?: string }
        return [key, column ? { ...dimRest, sql: resolveColumn(column) } : dimRest]
      })
    ) as Record<string, Dimension>
    const measures = Object.fromEntries(
      Object.entries(rest.measures).map(([key, m]) => {
        const { column, ...mRest } = m as EntityMeasure & { column?: string }
        return [key, column ? { ...mRest, sql: resolveColumn(column) } : mRest]
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

export { schema }
export const allCubes: Cube[] = entityCubesToCubes(entityCubeRegistry)
