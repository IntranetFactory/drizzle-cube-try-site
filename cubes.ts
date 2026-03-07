/**
 * Example cube definitions for Hono drizzle-cube demo
 * This demonstrates how to define type-safe analytics cubes using Drizzle ORM
 */

import { eq, sql } from 'drizzle-orm'
import { defineCube } from 'drizzle-cube/server'
import type { QueryContext, BaseQueryDefinition, Cube } from 'drizzle-cube/server'
import * as schema from './schema'

// Forward declarations for circular dependency resolution
let employeesCube: Cube
let departmentsCube: Cube
let productivityCube: Cube
let timeEntriesCube: Cube
let prEventsCube: Cube
let teamsCube: Cube
let employeeTeamsCube: Cube

/**
 * Employees cube - employee analytics (single table)
 */
employeesCube = defineCube('Employees', {
  title: 'Employee Analytics',
  description: 'Employee data and metrics',
  
  sql: (ctx: QueryContext): BaseQueryDefinition => ({
    from: schema["employees"],
    where: eq(schema["employees"].organisationId, ctx.securityContext.organisationId as number)
  }),

  // Cube-level joins for cross-cube queries
  joins: {
    Departments: {
      targetCube: () => departmentsCube,
      relationship: 'belongsTo',
      on: [
        { source: schema["employees"].departmentId, target: schema["departments"].id }
      ]
    },
    Productivity: {
      targetCube: () => productivityCube,
      relationship: 'hasMany',
      on: [
        { source: schema["employees"].id, target: schema["productivity"].employeeId }
      ]
    },
    TimeEntries: {
      targetCube: () => timeEntriesCube,
      relationship: 'hasMany',
      on: [
        { source: schema["employees"].id, target: schema["timeEntries"].employeeId }
      ]
    },
    PREvents: {
      targetCube: () => prEventsCube,
      relationship: 'hasMany',
      on: [
        { source: schema["employees"].id, target: schema["prEvents"].employeeId }
      ]
    },
    EmployeeTeams: {
      targetCube: () => employeeTeamsCube,
      relationship: 'hasMany',
      preferredFor: ['Teams'],
      on: [
        { source: schema["employees"].id, target: schema["employeeTeams"].employeeId }
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
      sql: schema["employees"].id,
      primaryKey: true
    },
    name: {
      name: 'name',
      title: 'Employee Name',
      type: 'string',
      sql: schema["employees"].name
    },
    email: {
      name: 'email',
      title: 'Email Address',
      type: 'string',
      sql: schema["employees"].email
    },
    departmentId: {
      name: 'departmentId',
      title: 'Department ID',
      type: 'number',
      sql: schema["employees"].departmentId
    },
    isActive: {
      name: 'isActive',
      title: 'Active Status',
      type: 'boolean',
      sql: schema["employees"].active
    },
    createdAt: {
      name: 'createdAt',
      title: 'Hire Date',
      type: 'time',
      sql: schema["employees"].createdAt
    },
    // Location dimensions
    city: {
      name: 'city',
      title: 'City',
      type: 'string',
      sql: schema["employees"].city
    },
    region: {
      name: 'region',
      title: 'State/Region',
      type: 'string',
      sql: schema["employees"].region
    },
    country: {
      name: 'country',
      title: 'Country',
      type: 'string',
      sql: schema["employees"].country
    },
    latitude: {
      name: 'latitude',
      title: 'Latitude',
      type: 'number',
      sql: schema["employees"].latitude
    },
    longitude: {
      name: 'longitude',
      title: 'Longitude',
      type: 'number',
      sql: schema["employees"].longitude
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Employees',
      type: 'countDistinct',
      sql: schema["employees"].id,
      drillMembers: ['Employees.name', 'Employees.email', 'Employees.isActive', 'Departments.name']
    },
    activeCount: {
      name: 'activeCount',
      title: 'Active Employees',
      type: 'countDistinct',
      sql: schema["employees"].id,
      filters: [
        () => eq(schema["employees"].active, true)
      ],
      drillMembers: ['Employees.name', 'Employees.email', 'Departments.name']
    },
    totalSalary: {
      name: 'totalSalary',
      title: 'Total Salary',
      type: 'sum',
      sql: schema["employees"].salary,
      drillMembers: ['Employees.name', 'Departments.name', 'Employees.city']
    },
    avgSalary: {
      name: 'avgSalary',
      title: 'Average Salary',
      type: 'avg',
      sql: schema["employees"].salary,
      format: 'currency',
      drillMembers: ['Employees.name', 'Departments.name', 'Employees.city']
    },
    // Statistical measures
    medianSalary: {
      name: 'medianSalary',
      title: 'Median Salary',
      type: 'median',
      sql: schema["employees"].salary,
      description: 'Median salary (50th percentile)'
    },
    stddevSalary: {
      name: 'stddevSalary',
      title: 'Salary Std Dev',
      type: 'stddev',
      sql: schema["employees"].salary,
      description: 'Standard deviation of salaries'
    }
  }
}) as Cube

console.log("START---");
//console.log(schema["employees"])
//console.log(employeesCube)


/**
 * Departments cube - department-level analytics (single table)
 */
departmentsCube = defineCube('Departments', {
  title: 'Department Analytics',
  description: 'Department-level metrics and budget analysis',
  
  sql: (ctx: QueryContext): BaseQueryDefinition => ({
    from: schema["departments"],
    where: eq(schema["departments"].organisationId, ctx.securityContext.organisationId as number)
  }),

  // Cube-level joins for cross-cube queries
  joins: {
    Employees: {
      targetCube: () => employeesCube,
      relationship: 'hasMany',
      on: [
        { source: schema["departments"].id, target: schema["employees"].departmentId }
      ]
    },
    TimeEntries: {
      targetCube: () => timeEntriesCube,
      relationship: 'hasMany',
      on: [
        { source: schema["departments"].id, target: schema["timeEntries"].departmentId }
      ]
    },
    Productivity: {
      targetCube: () => productivityCube,
      relationship: 'hasMany',
      on: [
        { source: schema["departments"].id, target: schema["productivity"].departmentId }
      ]
    },
    Teams: {
      targetCube: () => teamsCube,
      relationship: 'hasMany',
      on: [
        { source: schema["departments"].id, target: schema["teams"].departmentId }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Department ID',
      type: 'number',
      sql: schema["departments"].id,
      primaryKey: true
    },
    name: {
      name: 'name',
      title: 'Department Name',
      type: 'string',
      sql: schema["departments"].name
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Department Count',
      type: 'countDistinct',
      sql: schema["departments"].id,
      drillMembers: ['Departments.name']
    },
    totalBudget: {
      name: 'totalBudget',
      title: 'Total Budget',
      type: 'sum',
      sql: schema["departments"].budget,
      drillMembers: ['Departments.name']
    },
    avgBudget: {
      name: 'avgBudget',
      title: 'Average Budget',
      type: 'avg',
      sql: schema["departments"].budget,
      drillMembers: ['Departments.name']
    }
  }
}) as Cube

/**
 * Productivity cube - productivity metrics with time dimensions
 */
productivityCube = defineCube('Productivity', {
  title: 'Productivity Analytics',
  description: 'Daily productivity metrics including code output and deployments',
  
  sql: (ctx: QueryContext): BaseQueryDefinition => ({
    from: schema["productivity"],
    where: eq(schema["productivity"].organisationId, ctx.securityContext.organisationId as number)
  }),

  // Cube-level joins for multi-cube queries
  joins: {
    Employees: {
      targetCube: () => employeesCube,
      relationship: 'belongsTo',
      preferredFor: ['Teams'],
      on: [
        { source: schema["productivity"].employeeId, target: schema["employees"].id }
      ]
    },
    EmployeeTeams: {
      targetCube: () => employeeTeamsCube,
      relationship: 'hasMany',
      preferredFor: ['Teams'],
      on: [
        { source: schema["productivity"].employeeId, target: schema["employeeTeams"].employeeId }
      ]
    },
    Departments: {
      targetCube: () => departmentsCube,
      relationship: 'belongsTo',
      on: [
        { source: schema["productivity"].departmentId, target: schema["departments"].id }
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
      sql: schema["productivity"].id,
      primaryKey: true
    },
    date: {
      name: 'date',
      title: 'Date',
      type: 'time',
      sql: schema["productivity"].date
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      sql: schema["productivity"].createdAt
    },
    isDayOff: {
      name: 'isDayOff',
      title: 'Day Off',
      type: 'boolean',
      sql: schema["productivity"].daysOff
    },
    happinessIndex: {
      name: 'happinessIndex',
      title: 'Happiness Index',
      type: 'number',
      sql: schema["productivity"].happinessIndex
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
      sql: schema["productivity"].departmentId
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      sql: schema["productivity"].employeeId
    },
    linesOfCode: {
      name: 'linesOfCode',
      title: 'Lines of Code',
      type: 'number',
      sql: schema["productivity"].linesOfCode,
      description: 'Raw lines of code for this record'
    },
    pullRequests: {
      name: 'pullRequests',
      title: 'Pull Requests',
      type: 'number',
      sql: schema["productivity"].pullRequests,
      description: 'Raw PR count for this record'
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Records',
      type: 'count',
      sql: schema["productivity"].id,
      drillMembers: ['Productivity.date', 'Employees.name', 'Departments.name']
    },
    recordCount: {
      name: 'recordCount',
      title: 'Record Count',
      type: 'count',
      sql: schema["productivity"].id,
      drillMembers: ['Productivity.date', 'Employees.name', 'Departments.name']
    },
    workingDaysCount: {
      name: 'workingDaysCount',
      title: 'Working Days',
      type: 'count',
      sql: schema["productivity"].id,
      filters: [
        () => eq(schema["productivity"].daysOff, false)
      ],
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.isDayOff']
    },
    daysOffCount: {
      name: 'daysOffCount',
      title: 'Days Off',
      type: 'count',
      sql: schema["productivity"].id,
      filters: [
        () => eq(schema["productivity"].daysOff, true)
      ],
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.isDayOff']
    },
    avgLinesOfCode: {
      name: 'avgLinesOfCode',
      title: 'Average Lines of Code',
      type: 'avg',
      sql: schema["productivity"].linesOfCode,
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.linesOfCode', 'Departments.name']
    },
    totalLinesOfCode: {
      name: 'totalLinesOfCode',
      title: 'Total Lines of Code',
      type: 'sum',
      sql: schema["productivity"].linesOfCode,
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.linesOfCode', 'Departments.name']
    },
    totalPullRequests: {
      name: 'totalPullRequests',
      title: 'Total Pull Requests',
      type: 'sum',
      sql: schema["productivity"].pullRequests,
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.pullRequests', 'Departments.name']
    },
    avgPullRequests: {
      name: 'avgPullRequests',
      title: 'Average Pull Requests',
      type: 'avg',
      sql: schema["productivity"].pullRequests,
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.pullRequests', 'Departments.name']
    },
    totalDeployments: {
      name: 'totalDeployments',
      title: 'Total Deployments',
      type: 'sum',
      sql: schema["productivity"].liveDeployments
    },
    avgDeployments: {
      name: 'avgDeployments',
      title: 'Average Deployments',
      type: 'avg',
      sql: schema["productivity"].liveDeployments
    },
    avgHappinessIndex: {
      name: 'avgHappinessIndex',
      title: 'Average Happiness',
      type: 'avg',
      sql: schema["productivity"].happinessIndex,
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
      sql: schema["productivity"].linesOfCode,
      description: 'Variation in daily code output'
    },
    medianLinesOfCode: {
      name: 'medianLinesOfCode',
      title: 'Median Lines of Code',
      type: 'median',
      sql: schema["productivity"].linesOfCode,
      description: 'Median daily code output'
    },
    p95LinesOfCode: {
      name: 'p95LinesOfCode',
      title: '95th Percentile Lines',
      type: 'p95',
      sql: schema["productivity"].linesOfCode,
      description: 'High performer code output threshold'
    },
    // Statistical measures - Happiness Distribution
    stddevHappinessIndex: {
      name: 'stddevHappinessIndex',
      title: 'Happiness Std Dev',
      type: 'stddev',
      sql: schema["productivity"].happinessIndex,
      description: 'Variation in team happiness'
    },
    medianHappinessIndex: {
      name: 'medianHappinessIndex',
      title: 'Median Happiness',
      type: 'median',
      sql: schema["productivity"].happinessIndex,
      description: 'Median happiness score'
    },
    // Statistical measures - Pull Requests
    medianPullRequests: {
      name: 'medianPullRequests',
      title: 'Median Pull Requests',
      type: 'median',
      sql: schema["productivity"].pullRequests,
      description: 'Median daily pull requests'
    },
    p95PullRequests: {
      name: 'p95PullRequests',
      title: '95th Percentile PRs',
      type: 'p95',
      sql: schema["productivity"].pullRequests,
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
}) as Cube

/**
 * Time Entries cube - time tracking analytics with allocation types
 */
timeEntriesCube = defineCube('TimeEntries', {
  title: 'Time Entries Analytics', 
  description: 'Employee time tracking with allocation types, departments, and billable hours',
  
  sql: (ctx: QueryContext): BaseQueryDefinition => ({
    from: schema["timeEntries"],
    where: eq(schema["timeEntries"].organisationId, ctx.securityContext.organisationId as number)
  }),

  joins: {
    Employees: {
      targetCube: () => employeesCube,
      relationship: 'belongsTo',
      on: [
        { source: schema["timeEntries"].employeeId, target: schema["employees"].id }
      ]
    },
    Departments: {
      targetCube: () => departmentsCube,
      relationship: 'belongsTo', 
      on: [
        { source: schema["timeEntries"].departmentId, target: schema["departments"].id }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Time Entry ID',
      type: 'number',
      sql: schema["timeEntries"].id,
      primaryKey: true
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      sql: schema["timeEntries"].employeeId
    },
    departmentId: {
      name: 'departmentId', 
      title: 'Department ID',
      type: 'number',
      sql: schema["timeEntries"].departmentId
    },
    allocationType: {
      name: 'allocationType',
      title: 'Allocation Type',
      type: 'string',
      sql: schema["timeEntries"].allocationType
    },
    description: {
      name: 'description',
      title: 'Task Description',
      type: 'string',
      sql: schema["timeEntries"].description
    },
    date: {
      name: 'date',
      title: 'Date',
      type: 'time',
      sql: schema["timeEntries"].date
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      sql: schema["timeEntries"].createdAt
    }
  },

  measures: {
    // Basic count measures
    count: {
      name: 'count',
      title: 'Total Time Entries',
      type: 'count',
      sql: schema["timeEntries"].id,
      description: 'Total number of time entries'
    },
    
    // Hours-based measures
    totalHours: {
      name: 'totalHours',
      title: 'Total Hours',
      type: 'sum',
      sql: schema["timeEntries"].hours,
      description: 'Sum of all logged hours'
    },
    avgHours: {
      name: 'avgHours',
      title: 'Average Hours per Entry',
      type: 'avg',
      sql: schema["timeEntries"].hours,
      description: 'Average hours per time entry'
    },
    minHours: {
      name: 'minHours',
      title: 'Minimum Hours',
      type: 'min',
      sql: schema["timeEntries"].hours
    },
    maxHours: {
      name: 'maxHours',
      title: 'Maximum Hours',
      type: 'max',
      sql: schema["timeEntries"].hours
    },
    
    // Billable hours measures
    totalBillableHours: {
      name: 'totalBillableHours',
      title: 'Total Billable Hours',
      type: 'sum',
      sql: schema["timeEntries"].billableHours,
      description: 'Sum of all billable hours'
    },
    avgBillableHours: {
      name: 'avgBillableHours',
      title: 'Average Billable Hours',
      type: 'avg',
      sql: schema["timeEntries"].billableHours
    },
    
    // Allocation-specific measures with filters
    developmentHours: {
      name: 'developmentHours',
      title: 'Development Hours',
      type: 'sum',
      sql: schema["timeEntries"].hours,
      filters: [
        () => eq(schema["timeEntries"].allocationType, 'development')
      ],
      description: 'Total hours spent on development tasks'
    },
    meetingHours: {
      name: 'meetingHours',
      title: 'Meeting Hours',
      type: 'sum',
      sql: schema["timeEntries"].hours,
      filters: [
        () => eq(schema["timeEntries"].allocationType, 'meetings')
      ],
      description: 'Total hours spent in meetings'
    },
    maintenanceHours: {
      name: 'maintenanceHours',
      title: 'Maintenance Hours',
      type: 'sum',
      sql: schema["timeEntries"].hours,
      filters: [
        () => eq(schema["timeEntries"].allocationType, 'maintenance')
      ]
    },
    
    // Distinct count measures
    distinctEmployees: {
      name: 'distinctEmployees',
      title: 'Unique Employees',
      type: 'countDistinct',
      sql: schema["timeEntries"].employeeId,
      description: 'Number of unique employees with time entries'
    },
    distinctDepartments: {
      name: 'distinctDepartments',
      title: 'Unique Departments',
      type: 'countDistinct', 
      sql: schema["timeEntries"].departmentId
    },
    distinctAllocations: {
      name: 'distinctAllocations',
      title: 'Unique Allocation Types',
      type: 'countDistinct',
      sql: schema["timeEntries"].allocationType
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
      sql: schema["timeEntries"].hours,
      description: 'Average hours logged per day'
    }
  }
}) as Cube

/**
 * PR Events cube - PR lifecycle events for funnel analysis
 */
prEventsCube = defineCube('PREvents', {
  title: 'PR Events',
  description: 'Pull request lifecycle events for funnel analysis',

  sql: (ctx: QueryContext): BaseQueryDefinition => ({
    from: schema["prEvents"],
    where: eq(schema["prEvents"].organisationId, ctx.securityContext.organisationId as number)
  }),

  joins: {
    Employees: {
      targetCube: () => employeesCube,
      relationship: 'belongsTo',
      on: [
        { source: schema["prEvents"].employeeId, target: schema["employees"].id }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Event ID',
      type: 'number',
      sql: schema["prEvents"].id,
      primaryKey: true
    },
    prNumber: {
      name: 'prNumber',
      title: 'PR Number',
      type: 'number',
      sql: schema["prEvents"].prNumber
    },
    eventType: {
      name: 'eventType',
      title: 'Event Type',
      type: 'string',
      sql: schema["prEvents"].eventType
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      sql: schema["prEvents"].employeeId
    },
    timestamp: {
      name: 'timestamp',
      title: 'Event Timestamp',
      type: 'time',
      sql: schema["prEvents"].timestamp
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      sql: schema["prEvents"].createdAt
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Event Count',
      type: 'count',
      sql: schema["prEvents"].id,
      drillMembers: ['PREvents.prNumber', 'PREvents.eventType', 'PREvents.timestamp', 'Employees.name']
    },
    uniquePRs: {
      name: 'uniquePRs',
      title: 'Unique PRs',
      type: 'countDistinct',
      sql: schema["prEvents"].prNumber,
      drillMembers: ['PREvents.prNumber', 'PREvents.eventType', 'PREvents.timestamp']
    },
    uniqueActors: {
      name: 'uniqueActors',
      title: 'Unique Actors',
      type: 'countDistinct',
      sql: schema["prEvents"].employeeId,
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
}) as Cube

/**
 * Teams cube - team analytics
 */
teamsCube = defineCube('Teams', {
  title: 'Team Analytics',
  description: 'Team structure and membership analysis',

  sql: (ctx: QueryContext): BaseQueryDefinition => ({
    from: schema["teams"],
    where: eq(schema["teams"].organisationId, ctx.securityContext.organisationId as number)
  }),

  joins: {
    Departments: {
      targetCube: () => departmentsCube,
      relationship: 'belongsTo',
      on: [
        { source: schema["teams"].departmentId, target: schema["departments"].id }
      ]
    },
    EmployeeTeams: {
      targetCube: () => employeeTeamsCube,
      relationship: 'hasMany',
      preferredFor: ['Productivity'],
      on: [
        { source: schema["teams"].id, target: schema["employeeTeams"].teamId }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Team ID',
      type: 'number',
      sql: schema["teams"].id,
      primaryKey: true
    },
    name: {
      name: 'name',
      title: 'Team Name',
      type: 'string',
      sql: schema["teams"].name
    },
    description: {
      name: 'description',
      title: 'Description',
      type: 'string',
      sql: schema["teams"].description
    },
    departmentId: {
      name: 'departmentId',
      title: 'Department ID',
      type: 'number',
      sql: schema["teams"].departmentId
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      sql: schema["teams"].createdAt
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Teams',
      type: 'countDistinct',
      sql: schema["teams"].id,
      drillMembers: ['Teams.name', 'Teams.description', 'Departments.name']
    }
  }
}) as Cube

/**
 * EmployeeTeams cube - junction table for many-to-many analysis
 */
employeeTeamsCube = defineCube('EmployeeTeams', {
  title: 'Employee Team Membership',
  description: 'Employee team assignments and roles',

  sql: (ctx: QueryContext): BaseQueryDefinition => ({
    from: schema["employeeTeams"],
    where: eq(schema["employeeTeams"].organisationId, ctx.securityContext.organisationId as number)
  }),

  joins: {
    Employees: {
      targetCube: () => employeesCube,
      relationship: 'belongsTo',
      preferredFor: ['Productivity'],
      on: [
        { source: schema["employeeTeams"].employeeId, target: schema["employees"].id }
      ]
    },
    Teams: {
      targetCube: () => teamsCube,
      relationship: 'belongsTo',
      preferredFor: ['Productivity'],
      on: [
        { source: schema["employeeTeams"].teamId, target: schema["teams"].id }
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
      sql: schema["employeeTeams"].id,
      primaryKey: true
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      sql: schema["employeeTeams"].employeeId
    },
    teamId: {
      name: 'teamId',
      title: 'Team ID',
      type: 'number',
      sql: schema["employeeTeams"].teamId
    },
    role: {
      name: 'role',
      title: 'Team Role',
      type: 'string',
      sql: schema["employeeTeams"].role
    },
    joinedAt: {
      name: 'joinedAt',
      title: 'Joined Team',
      type: 'time',
      sql: schema["employeeTeams"].joinedAt
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Memberships',
      type: 'count',
      sql: schema["employeeTeams"].id,
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.role', 'EmployeeTeams.joinedAt']
    },
    uniqueEmployees: {
      name: 'uniqueEmployees',
      title: 'Unique Employees',
      type: 'countDistinct',
      sql: schema["employeeTeams"].employeeId,
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.role']
    },
    uniqueTeams: {
      name: 'uniqueTeams',
      title: 'Unique Teams',
      type: 'countDistinct',
      sql: schema["employeeTeams"].teamId,
      drillMembers: ['Teams.name', 'Employees.name', 'EmployeeTeams.role']
    },
    leadCount: {
      name: 'leadCount',
      title: 'Team Leads',
      type: 'count',
      sql: schema["employeeTeams"].id,
      filters: [
        () => eq(schema["employeeTeams"].role, 'lead')
      ],
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.joinedAt']
    }
  }
}) as Cube

/**
 * Export cubes for use in other modules
 */
export { employeesCube, departmentsCube, productivityCube, timeEntriesCube, prEventsCube, teamsCube, employeeTeamsCube }

/**
 * All cubes for registration
 */
export const allCubes = [
  employeesCube,
  departmentsCube,
  productivityCube,
  timeEntriesCube,
  prEventsCube,
  teamsCube,
  employeeTeamsCube
]
