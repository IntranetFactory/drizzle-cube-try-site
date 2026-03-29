/**
 * Drizzle cube path: static EntityCube definitions for the demo schema.
 * Builds Cube[] from hardcoded EntityCube registrations.
 */

import { jsonToSchema, type SchemaJSON, type SerializedColumn } from './schemaGenerator'
import { entityCubesToCubes } from './entityCubeCore'
import type { EntityCube } from './entityCubeCore'


// ─── EntityCube registry ───

const entityCubeRegistry = new Map<string, EntityCube>()

function registerEntityCube(name: string, config: Omit<EntityCube, 'name'>): EntityCube {
  console.log(`[registerEntityCube] Registering cube: ${name}`)
  const cube: EntityCube = { name, ...config }
  entityCubeRegistry.set(name, cube)
  return cube
}

// ─── Static cube definitions ───

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
        { source: "employees.department_id", target: "departments.id" }
      ]
    },
    Productivity: {
      targetCube: 'Productivity',
      relationship: 'hasMany',
      on: [
        { source: "employees.id", target: "productivity.employee_id" }
      ]
    },
    TimeEntries: {
      targetCube: 'TimeEntries',
      relationship: 'hasMany',
      on: [
        { source: "employees.id", target: "time_entries.employee_id" }
      ]
    },
    PREvents: {
      targetCube: 'PREvents',
      relationship: 'hasMany',
      on: [
        { source: "employees.id", target: "pr_events.employee_id" }
      ]
    },
    EmployeeTeams: {
      targetCube: 'EmployeeTeams',
      relationship: 'hasMany',
      preferredFor: ['Teams'],
      on: [
        { source: "employees.id", target: "employee_teams.employee_id" }
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
      column: "employees.department_id"
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
      column: "employees.created_at"
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
        { column: 'employees.active', operator: 'eq', value: true }
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
        { source: "departments.id", target: "employees.department_id" }
      ]
    },
    TimeEntries: {
      targetCube: 'TimeEntries',
      relationship: 'hasMany',
      on: [
        { source: "departments.id", target: "time_entries.department_id" }
      ]
    },
    Productivity: {
      targetCube: 'Productivity',
      relationship: 'hasMany',
      on: [
        { source: "departments.id", target: "productivity.department_id" }
      ]
    },
    Teams: {
      targetCube: 'Teams',
      relationship: 'hasMany',
      on: [
        { source: "departments.id", target: "teams.department_id" }
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
        { source: "productivity.employee_id", target: "employees.id" }
      ]
    },
    EmployeeTeams: {
      targetCube: 'EmployeeTeams',
      relationship: 'hasMany',
      preferredFor: ['Teams'],
      on: [
        { source: "productivity.employee_id", target: "employee_teams.employee_id" }
      ]
    },
    Departments: {
      targetCube: 'Departments',
      relationship: 'belongsTo',
      on: [
        { source: "productivity.department_id", target: "departments.id" }
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
      column: "productivity.created_at"
    },
    isDayOff: {
      name: 'isDayOff',
      title: 'Day Off',
      type: 'boolean',
      column: "productivity.days_off"
    },
    happinessIndex: {
      name: 'happinessIndex',
      title: 'Happiness Index',
      type: 'number',
      column: "productivity.happiness_index"
    },
    happinessLevel: {
      name: 'happinessLevel',
      title: 'Happiness Level',
      type: 'string',
      sql: 'CASE WHEN ${schema["productivity"].happiness_index} >= 8 THEN \'High\' WHEN ${schema["productivity"].happiness_index} >= 6 THEN \'Medium\' ELSE \'Low\' END'
    },
    departmentId: {
      name: 'departmentId',
      title: 'Department ID',
      type: 'number',
      column: "productivity.department_id"
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      column: "productivity.employee_id"
    },
    linesOfCode: {
      name: 'linesOfCode',
      title: 'Lines of Code',
      type: 'number',
      column: "productivity.lines_of_code",
      description: 'Raw lines of code for this record'
    },
    pullRequests: {
      name: 'pullRequests',
      title: 'Pull Requests',
      type: 'number',
      column: "productivity.pull_requests",
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
        { column: 'productivity.days_off', operator: 'eq', value: false }
      ],
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.isDayOff']
    },
    daysOffCount: {
      name: 'daysOffCount',
      title: 'Days Off',
      type: 'count',
      column: "productivity.id",
      filters: [
        { column: 'productivity.days_off', operator: 'eq', value: true }
      ],
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.isDayOff']
    },
    avgLinesOfCode: {
      name: 'avgLinesOfCode',
      title: 'Average Lines of Code',
      type: 'avg',
      column: "productivity.lines_of_code",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.linesOfCode', 'Departments.name']
    },
    totalLinesOfCode: {
      name: 'totalLinesOfCode',
      title: 'Total Lines of Code',
      type: 'sum',
      column: "productivity.lines_of_code",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.linesOfCode', 'Departments.name']
    },
    totalPullRequests: {
      name: 'totalPullRequests',
      title: 'Total Pull Requests',
      type: 'sum',
      column: "productivity.pull_requests",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.pullRequests', 'Departments.name']
    },
    avgPullRequests: {
      name: 'avgPullRequests',
      title: 'Average Pull Requests',
      type: 'avg',
      column: "productivity.pull_requests",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.pullRequests', 'Departments.name']
    },
    totalDeployments: {
      name: 'totalDeployments',
      title: 'Total Deployments',
      type: 'sum',
      column: "productivity.live_deployments"
    },
    avgDeployments: {
      name: 'avgDeployments',
      title: 'Average Deployments',
      type: 'avg',
      column: "productivity.live_deployments"
    },
    avgHappinessIndex: {
      name: 'avgHappinessIndex',
      title: 'Average Happiness',
      type: 'avg',
      column: "productivity.happiness_index",
      drillMembers: ['Productivity.date', 'Employees.name', 'Productivity.happinessIndex', 'Productivity.happinessLevel']
    },
    productivityScore: {
      name: 'productivityScore',
      title: 'Productivity Score',
      type: 'avg',
      sql: '(${schema["productivity"].lines_of_code} + ${schema["productivity"].pull_requests} * 50 + ${schema["productivity"].live_deployments} * 100)',
      description: 'Composite productivity score based on code output, reviews, and deployments'
    },

    // Statistical measures - Code Output Distribution
    stddevLinesOfCode: {
      name: 'stddevLinesOfCode',
      title: 'Lines of Code Std Dev',
      type: 'stddev',
      column: "productivity.lines_of_code",
      description: 'Variation in daily code output'
    },
    medianLinesOfCode: {
      name: 'medianLinesOfCode',
      title: 'Median Lines of Code',
      type: 'median',
      column: "productivity.lines_of_code",
      description: 'Median daily code output'
    },
    p95LinesOfCode: {
      name: 'p95LinesOfCode',
      title: '95th Percentile Lines',
      type: 'p95',
      column: "productivity.lines_of_code",
      description: 'High performer code output threshold'
    },
    // Statistical measures - Happiness Distribution
    stddevHappinessIndex: {
      name: 'stddevHappinessIndex',
      title: 'Happiness Std Dev',
      type: 'stddev',
      column: "productivity.happiness_index",
      description: 'Variation in team happiness'
    },
    medianHappinessIndex: {
      name: 'medianHappinessIndex',
      title: 'Median Happiness',
      type: 'median',
      column: "productivity.happiness_index",
      description: 'Median happiness score'
    },
    // Statistical measures - Pull Requests
    medianPullRequests: {
      name: 'medianPullRequests',
      title: 'Median Pull Requests',
      type: 'median',
      column: "productivity.pull_requests",
      description: 'Median daily pull requests'
    },
    p95PullRequests: {
      name: 'p95PullRequests',
      title: '95th Percentile PRs',
      type: 'p95',
      column: "productivity.pull_requests",
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

  tableName: "time_entries",

  joins: {
    Employees: {
      targetCube: 'Employees',
      relationship: 'belongsTo',
      on: [
        { source: "time_entries.employee_id", target: "employees.id" }
      ]
    },
    Departments: {
      targetCube: 'Departments',
      relationship: 'belongsTo',
      on: [
        { source: "time_entries.department_id", target: "departments.id" }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Time Entry ID',
      type: 'number',
      column: "time_entries.id",
      primaryKey: true
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      column: "time_entries.employee_id"
    },
    departmentId: {
      name: 'departmentId',
      title: 'Department ID',
      type: 'number',
      column: "time_entries.department_id"
    },
    allocationType: {
      name: 'allocationType',
      title: 'Allocation Type',
      type: 'string',
      column: "time_entries.allocation_type"
    },
    description: {
      name: 'description',
      title: 'Task Description',
      type: 'string',
      column: "time_entries.description"
    },
    date: {
      name: 'date',
      title: 'Date',
      type: 'time',
      column: "time_entries.date"
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      column: "time_entries.created_at"
    }
  },

  measures: {
    // Basic count measures
    count: {
      name: 'count',
      title: 'Total Time Entries',
      type: 'count',
      column: "time_entries.id",
      description: 'Total number of time entries'
    },

    // Hours-based measures
    totalHours: {
      name: 'totalHours',
      title: 'Total Hours',
      type: 'sum',
      column: "time_entries.hours",
      description: 'Sum of all logged hours'
    },
    avgHours: {
      name: 'avgHours',
      title: 'Average Hours per Entry',
      type: 'avg',
      column: "time_entries.hours",
      description: 'Average hours per time entry'
    },
    minHours: {
      name: 'minHours',
      title: 'Minimum Hours',
      type: 'min',
      column: "time_entries.hours"
    },
    maxHours: {
      name: 'maxHours',
      title: 'Maximum Hours',
      type: 'max',
      column: "time_entries.hours"
    },

    // Billable hours measures
    totalBillableHours: {
      name: 'totalBillableHours',
      title: 'Total Billable Hours',
      type: 'sum',
      column: "time_entries.billable_hours",
      description: 'Sum of all billable hours'
    },
    avgBillableHours: {
      name: 'avgBillableHours',
      title: 'Average Billable Hours',
      type: 'avg',
      column: "time_entries.billable_hours"
    },

    // Allocation-specific measures with filters
    developmentHours: {
      name: 'developmentHours',
      title: 'Development Hours',
      type: 'sum',
      column: "time_entries.hours",
      filters: [
        { column: 'time_entries.allocation_type', operator: 'eq', value: 'development' }
      ],
      description: 'Total hours spent on development tasks'
    },
    meetingHours: {
      name: 'meetingHours',
      title: 'Meeting Hours',
      type: 'sum',
      column: "time_entries.hours",
      filters: [
        { column: 'time_entries.allocation_type', operator: 'eq', value: 'meetings' }
      ],
      description: 'Total hours spent in meetings'
    },
    maintenanceHours: {
      name: 'maintenanceHours',
      title: 'Maintenance Hours',
      type: 'sum',
      column: "time_entries.hours",
      filters: [
        { column: 'time_entries.allocation_type', operator: 'eq', value: 'maintenance' }
      ]
    },

    // Distinct count measures
    distinctEmployees: {
      name: 'distinctEmployees',
      title: 'Unique Employees',
      type: 'countDistinct',
      column: "time_entries.employee_id",
      description: 'Number of unique employees with time entries'
    },
    distinctDepartments: {
      name: 'distinctDepartments',
      title: 'Unique Departments',
      type: 'countDistinct',
      column: "time_entries.department_id"
    },
    distinctAllocations: {
      name: 'distinctAllocations',
      title: 'Unique Allocation Types',
      type: 'countDistinct',
      column: "time_entries.allocation_type"
    },

    // Complex calculated measures
    utilizationRate: {
      name: 'utilizationRate',
      title: 'Utilization Rate (%)',
      type: 'avg',
      sql: '(${schema["time_entries"].billable_hours} / NULLIF(${schema["time_entries"].hours}, 0) * 100)',
      description: 'Percentage of billable vs total hours'
    },
    avgDailyHours: {
      name: 'avgDailyHours',
      title: 'Average Daily Hours',
      type: 'avg',
      column: "time_entries.hours",
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

  tableName: "pr_events",

  joins: {
    Employees: {
      targetCube: 'Employees',
      relationship: 'belongsTo',
      on: [
        { source: "pr_events.employee_id", target: "employees.id" }
      ]
    }
  },

  dimensions: {
    id: {
      name: 'id',
      title: 'Event ID',
      type: 'number',
      column: "pr_events.id",
      primaryKey: true
    },
    prNumber: {
      name: 'prNumber',
      title: 'PR Number',
      type: 'number',
      column: "pr_events.pr_number"
    },
    eventType: {
      name: 'eventType',
      title: 'Event Type',
      type: 'string',
      column: "pr_events.event_type"
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      column: "pr_events.employee_id"
    },
    timestamp: {
      name: 'timestamp',
      title: 'Event Timestamp',
      type: 'time',
      column: "pr_events.timestamp"
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      column: "pr_events.created_at"
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Event Count',
      type: 'count',
      column: "pr_events.id",
      drillMembers: ['PREvents.prNumber', 'PREvents.eventType', 'PREvents.timestamp', 'Employees.name']
    },
    uniquePRs: {
      name: 'uniquePRs',
      title: 'Unique PRs',
      type: 'countDistinct',
      column: "pr_events.pr_number",
      drillMembers: ['PREvents.prNumber', 'PREvents.eventType', 'PREvents.timestamp']
    },
    uniqueActors: {
      name: 'uniqueActors',
      title: 'Unique Actors',
      type: 'countDistinct',
      column: "pr_events.employee_id",
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
        { source: "teams.department_id", target: "departments.id" }
      ]
    },
    EmployeeTeams: {
      targetCube: 'EmployeeTeams',
      relationship: 'hasMany',
      preferredFor: ['Productivity'],
      on: [
        { source: "teams.id", target: "employee_teams.team_id" }
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
      column: "teams.department_id"
    },
    createdAt: {
      name: 'createdAt',
      title: 'Created At',
      type: 'time',
      column: "teams.created_at"
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

  tableName: "employee_teams",

  joins: {
    Employees: {
      targetCube: 'Employees',
      relationship: 'belongsTo',
      preferredFor: ['Productivity'],
      on: [
        { source: "employee_teams.employee_id", target: "employees.id" }
      ]
    },
    Teams: {
      targetCube: 'Teams',
      relationship: 'belongsTo',
      preferredFor: ['Productivity'],
      on: [
        { source: "employee_teams.team_id", target: "teams.id" }
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
      column: "employee_teams.id",
      primaryKey: true
    },
    employeeId: {
      name: 'employeeId',
      title: 'Employee ID',
      type: 'number',
      column: "employee_teams.employee_id"
    },
    teamId: {
      name: 'teamId',
      title: 'Team ID',
      type: 'number',
      column: "employee_teams.team_id"
    },
    role: {
      name: 'role',
      title: 'Team Role',
      type: 'string',
      column: "employee_teams.role"
    },
    joinedAt: {
      name: 'joinedAt',
      title: 'Joined Team',
      type: 'time',
      column: "employee_teams.joined_at"
    }
  },

  measures: {
    count: {
      name: 'count',
      title: 'Total Memberships',
      type: 'count',
      column: "employee_teams.id",
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.role', 'EmployeeTeams.joinedAt']
    },
    uniqueEmployees: {
      name: 'uniqueEmployees',
      title: 'Unique Employees',
      type: 'countDistinct',
      column: "employee_teams.employee_id",
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.role']
    },
    uniqueTeams: {
      name: 'uniqueTeams',
      title: 'Unique Teams',
      type: 'countDistinct',
      column: "employee_teams.team_id",
      drillMembers: ['Teams.name', 'Employees.name', 'EmployeeTeams.role']
    },
    leadCount: {
      name: 'leadCount',
      title: 'Team Leads',
      type: 'count',
      column: "employee_teams.id",
      filters: [
        { column: 'employee_teams.role', operator: 'eq', value: 'lead' }
      ],
      drillMembers: ['Employees.name', 'Teams.name', 'EmployeeTeams.joinedAt']
    }
  }
})

// ─── Generate schema JSON from EntityCube definitions ───

const cubeTypeToSqlType: Record<string, SerializedColumn['type']> = {
  number: 'integer',
  string: 'text',
  boolean: 'boolean',
  time: 'timestamp',
}

function entityCubesToJSONSchema(entityCubes: EntityCube[]): SchemaJSON {
  // Collect columns per table: dimensions first (with types), then measures (default to number)
  const tableColumns = new Map<string, Map<string, SerializedColumn>>()

  function ensureTable(tableName: string) {
    if (!tableColumns.has(tableName)) {
      tableColumns.set(tableName, new Map())
    }
    return tableColumns.get(tableName)!
  }

  function addColumn(tableName: string, columnName: string, type: SerializedColumn['type'], primaryKey: boolean) {
    const cols = ensureTable(tableName)
    if (!cols.has(columnName)) {
      cols.set(columnName, {
        key: columnName,
        name: columnName,
        type,
        primaryKey,
        notNull: primaryKey,
        hasDefault: primaryKey,
        ...(primaryKey && { generatedIdentity: 'always' as const }),
      })
    }
  }

  for (const cube of entityCubes) {
    ensureTable(cube.tableName)

    // Scan dimensions — these define columns with types
    for (const dim of Object.values(cube.dimensions)) {
      if (!dim.column) continue
      const [tableName, columnName] = dim.column.split('.')
      const sqlType = cubeTypeToSqlType[dim.type]
      if (!sqlType) throw new Error(`Unknown dimension type "${dim.type}" for column ${dim.column}`)
      addColumn(tableName, columnName, sqlType, !!dim.primaryKey)
    }

    // Scan measures — add as number if not yet defined via dimensions
    for (const measure of Object.values(cube.measures)) {
      if (!measure.column) continue
      const [tableName, columnName] = measure.column.split('.')
      addColumn(tableName, columnName, 'integer', false)
    }
  }

  // Build SchemaJSON
  const result: SchemaJSON = {}
  for (const [tableName, cols] of tableColumns) {
    result[tableName] = {
      tableName,
      columns: Array.from(cols.values()),
    }
  }
  return result
}

// ─── Build entry point ───

export function buildDrizzleCubes() {
  const entityCubes = Array.from(entityCubeRegistry.values())
  const cubeSchemaJSON = entityCubesToJSONSchema(entityCubes)
  const schema = jsonToSchema(cubeSchemaJSON)
  const allCubes = entityCubesToCubes(entityCubes, schema as unknown as Record<string, unknown>)
  return { schema, allCubes, cubeSchemaJSON }
}
