/**
 * Seed utilities for Cloudflare Workers
 * This file contains the core seeding logic that can be used both in CLI and scheduled contexts
 *
 * Enhanced with 100 employees, 16 teams, and global office distribution
 */

import { employees, departments, productivity, time_entries, pr_events, teams, employee_teams, analytics_pages, notebooks, settings } from '../drizzle_schema'
import { eq, ne } from 'drizzle-orm'
import { productivityDashboardConfig } from './dashboard-config'
import sampleNotebookData from './notebook-seed-config.json'

// Sample data
const sampleDepartments = [
  { name: 'Engineering', organisation_id: 1, budget: 500000 },
  { name: 'Marketing', organisation_id: 1, budget: 250000 },
  { name: 'Sales', organisation_id: 1, budget: 300000 },
  { name: 'HR', organisation_id: 1, budget: 150000 }
]

// Office locations with geo coordinates
const officeLocations = [
  // US West Coast (40%)
  { city: 'San Francisco', region: 'California', country: 'USA', latitude: 37.7749, longitude: -122.4194 },
  { city: 'Seattle', region: 'Washington', country: 'USA', latitude: 47.6062, longitude: -122.3321 },
  { city: 'Los Angeles', region: 'California', country: 'USA', latitude: 34.0522, longitude: -118.2437 },
  { city: 'Portland', region: 'Oregon', country: 'USA', latitude: 45.5155, longitude: -122.6789 },
  // US East Coast & Central (25%)
  { city: 'New York', region: 'New York', country: 'USA', latitude: 40.7128, longitude: -74.0060 },
  { city: 'Boston', region: 'Massachusetts', country: 'USA', latitude: 42.3601, longitude: -71.0589 },
  { city: 'Austin', region: 'Texas', country: 'USA', latitude: 30.2672, longitude: -97.7431 },
  { city: 'Denver', region: 'Colorado', country: 'USA', latitude: 39.7392, longitude: -104.9903 },
  { city: 'Chicago', region: 'Illinois', country: 'USA', latitude: 41.8781, longitude: -87.6298 },
  // Europe (20%)
  { city: 'London', region: 'England', country: 'UK', latitude: 51.5074, longitude: -0.1278 },
  { city: 'Berlin', region: 'Berlin', country: 'Germany', latitude: 52.5200, longitude: 13.4050 },
  { city: 'Amsterdam', region: 'North Holland', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041 },
  { city: 'Dublin', region: 'Leinster', country: 'Ireland', latitude: 53.3498, longitude: -6.2603 },
  // Asia-Pacific (15%)
  { city: 'Singapore', region: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
  { city: 'Sydney', region: 'New South Wales', country: 'Australia', latitude: -33.8688, longitude: 151.2093 },
  { city: 'Tokyo', region: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
  { city: 'Bangalore', region: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946 }
]

// Team definitions
const sampleTeams = [
  // Engineering Teams (7)
  { name: 'Platform', description: 'Core platform and infrastructure', department_id: 1, organisation_id: 1 },
  { name: 'Frontend', description: 'Web and mobile UI development', department_id: 1, organisation_id: 1 },
  { name: 'Backend', description: 'API and server-side development', department_id: 1, organisation_id: 1 },
  { name: 'DevOps', description: 'Infrastructure and deployment', department_id: 1, organisation_id: 1 },
  { name: 'Data Engineering', description: 'Data pipelines and analytics', department_id: 1, organisation_id: 1 },
  { name: 'Security', description: 'Application security', department_id: 1, organisation_id: 1 },
  { name: 'QA', description: 'Quality assurance', department_id: 1, organisation_id: 1 },
  // Marketing Teams (3)
  { name: 'Content', description: 'Content creation', department_id: 2, organisation_id: 1 },
  { name: 'Growth', description: 'User acquisition', department_id: 2, organisation_id: 1 },
  { name: 'Brand', description: 'Brand strategy', department_id: 2, organisation_id: 1 },
  // Sales Teams (3)
  { name: 'Enterprise', description: 'Enterprise sales', department_id: 3, organisation_id: 1 },
  { name: 'SMB', description: 'SMB sales', department_id: 3, organisation_id: 1 },
  { name: 'Customer Success', description: 'Post-sale success', department_id: 3, organisation_id: 1 },
  // HR Teams (2)
  { name: 'Recruiting', description: 'Talent acquisition', department_id: 4, organisation_id: 1 },
  { name: 'People Ops', description: 'HR operations', department_id: 4, organisation_id: 1 },
  // Cross-functional (2)
  { name: 'Innovation Lab', description: 'R&D projects', department_id: null, organisation_id: 1 },
  { name: 'Accessibility', description: 'Cross-team a11y', department_id: null, organisation_id: 1 }
]

// Role definitions with salary ranges and location weights
const roleDefinitions = {
  // Engineering roles
  'Senior Engineer': { salaryMin: 130000, salaryMax: 180000, department_id: 1, teams: ['Platform', 'Backend', 'Frontend', 'Data Engineering'] },
  'Engineer': { salaryMin: 90000, salaryMax: 130000, department_id: 1, teams: ['Platform', 'Backend', 'Frontend', 'Data Engineering'] },
  'Junior Engineer': { salaryMin: 70000, salaryMax: 95000, department_id: 1, teams: ['Backend', 'Frontend'] },
  'DevOps Engineer': { salaryMin: 100000, salaryMax: 150000, department_id: 1, teams: ['DevOps', 'Platform'] },
  'QA Engineer': { salaryMin: 80000, salaryMax: 110000, department_id: 1, teams: ['QA'] },
  'Engineering Manager': { salaryMin: 160000, salaryMax: 200000, department_id: 1, teams: ['Platform', 'Backend', 'Frontend'] },
  'Security Engineer': { salaryMin: 120000, salaryMax: 160000, department_id: 1, teams: ['Security'] },
  // Marketing roles
  'Marketing Manager': { salaryMin: 110000, salaryMax: 140000, department_id: 2, teams: ['Content', 'Growth', 'Brand'] },
  'Content Specialist': { salaryMin: 65000, salaryMax: 90000, department_id: 2, teams: ['Content'] },
  'Growth Marketer': { salaryMin: 75000, salaryMax: 100000, department_id: 2, teams: ['Growth'] },
  'Brand Designer': { salaryMin: 70000, salaryMax: 95000, department_id: 2, teams: ['Brand'] },
  'Marketing Analyst': { salaryMin: 80000, salaryMax: 105000, department_id: 2, teams: ['Growth'] },
  // Sales roles
  'Sales Director': { salaryMin: 140000, salaryMax: 180000, department_id: 3, teams: ['Enterprise', 'SMB'] },
  'Enterprise AE': { salaryMin: 100000, salaryMax: 150000, department_id: 3, teams: ['Enterprise'] },
  'SMB AE': { salaryMin: 75000, salaryMax: 110000, department_id: 3, teams: ['SMB'] },
  'SDR': { salaryMin: 55000, salaryMax: 75000, department_id: 3, teams: ['Enterprise', 'SMB'] },
  'Customer Success': { salaryMin: 70000, salaryMax: 95000, department_id: 3, teams: ['Customer Success'] },
  // HR roles
  'HR Director': { salaryMin: 130000, salaryMax: 160000, department_id: 4, teams: ['People Ops'] },
  'HR Business Partner': { salaryMin: 90000, salaryMax: 120000, department_id: 4, teams: ['People Ops'] },
  'Recruiter': { salaryMin: 65000, salaryMax: 90000, department_id: 4, teams: ['Recruiting'] },
  'HR Coordinator': { salaryMin: 50000, salaryMax: 65000, department_id: 4, teams: ['People Ops'] },
  'Learning & Development': { salaryMin: 75000, salaryMax: 100000, department_id: 4, teams: ['People Ops'] }
}

// First and last name pools for generating employees
const firstNames = [
  'James', 'John', 'Michael', 'David', 'William', 'Robert', 'Joseph', 'Thomas', 'Christopher', 'Daniel',
  'Sarah', 'Emily', 'Jessica', 'Ashley', 'Amanda', 'Rachel', 'Jennifer', 'Elizabeth', 'Maria', 'Laura',
  'Wei', 'Ming', 'Li', 'Chen', 'Yuki', 'Hiro', 'Raj', 'Priya', 'Amit', 'Kavitha',
  'Lars', 'Erik', 'Anna', 'Sofia', 'Marco', 'Giulia', 'Hans', 'Ingrid', 'Pierre', 'Marie',
  'Carlos', 'Maria', 'Juan', 'Ana', 'Miguel', 'Isabella', 'Diego', 'Lucia', 'Pablo', 'Elena'
]

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Anderson', 'Taylor',
  'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez',
  'Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
  'Tanaka', 'Yamamoto', 'Suzuki', 'Patel', 'Shah', 'Gupta', 'Kumar', 'Singh', 'Sharma', 'Verma',
  'Mueller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Johansson', 'Larsson', 'Nilsson', 'Eriksson', 'Olsson'
]

// Employee distribution by role
const employeeDistribution = [
  // Engineering (50 total)
  { role: 'Senior Engineer', count: 10 },
  { role: 'Engineer', count: 20 },
  { role: 'Junior Engineer', count: 8 },
  { role: 'DevOps Engineer', count: 5 },
  { role: 'QA Engineer', count: 5 },
  { role: 'Engineering Manager', count: 2 },
  // Marketing (18 total)
  { role: 'Marketing Manager', count: 2 },
  { role: 'Content Specialist', count: 5 },
  { role: 'Growth Marketer', count: 5 },
  { role: 'Brand Designer', count: 4 },
  { role: 'Marketing Analyst', count: 2 },
  // Sales (20 total)
  { role: 'Sales Director', count: 2 },
  { role: 'Enterprise AE', count: 6 },
  { role: 'SMB AE', count: 6 },
  { role: 'SDR', count: 4 },
  { role: 'Customer Success', count: 2 },
  // HR (12 total)
  { role: 'HR Director', count: 1 },
  { role: 'HR Business Partner', count: 2 },
  { role: 'Recruiter', count: 5 },
  { role: 'HR Coordinator', count: 2 },
  { role: 'Learning & Development', count: 2 }
]

// Location weights by department
const locationWeightsByDept: Record<number, Record<string, number>> = {
  1: { // Engineering
    'San Francisco': 25, 'Seattle': 15, 'Austin': 10, 'New York': 8,
    'London': 8, 'Berlin': 6, 'Bangalore': 10, 'Singapore': 5, 'Sydney': 3, 'Tokyo': 5, 'Dublin': 5
  },
  2: { // Marketing
    'San Francisco': 30, 'New York': 30, 'London': 15, 'Sydney': 10, 'Chicago': 5, 'Los Angeles': 10
  },
  3: { // Sales
    'San Francisco': 15, 'New York': 25, 'Chicago': 15, 'London': 15,
    'Singapore': 10, 'Sydney': 10, 'Boston': 5, 'Austin': 5
  },
  4: { // HR
    'San Francisco': 40, 'New York': 30, 'London': 20, 'Dublin': 10
  }
}

// Helper to generate random salary within range
function randomSalary(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) / 1000) * 1000
}

// Helper to select weighted random location
function selectLocation(department_id: number): typeof officeLocations[0] {
  const weights = locationWeightsByDept[department_id] || locationWeightsByDept[1]
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  let random = Math.random() * totalWeight

  for (const [cityName, weight] of Object.entries(weights)) {
    random -= weight
    if (random <= 0) {
      const location = officeLocations.find(l => l.city === cityName)
      if (location) return location
    }
  }
  return officeLocations[0] // Default to San Francisco
}

// Helper to generate hire date based on seniority
function generateHireDate(role: string): Date {
  const now = new Date()
  let minMonthsAgo: number
  let maxMonthsAgo: number

  if (role.includes('Director') || role.includes('Manager') || role.includes('Senior')) {
    minMonthsAgo = 24; maxMonthsAgo = 60 // 2-5 years
  } else if (role.includes('Junior') || role.includes('SDR') || role.includes('Coordinator')) {
    minMonthsAgo = 1; maxMonthsAgo = 18 // 1-18 months
  } else {
    minMonthsAgo = 6; maxMonthsAgo = 36 // 6 months - 3 years
  }

  const monthsAgo = minMonthsAgo + Math.random() * (maxMonthsAgo - minMonthsAgo)
  const hireDate = new Date(now)
  hireDate.setMonth(hireDate.getMonth() - Math.round(monthsAgo))
  return hireDate
}

// Generate unique name
const usedNames = new Set<string>()
function generateUniqueName(): string {
  let name: string
  do {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    name = `${firstName} ${lastName}`
  } while (usedNames.has(name))
  usedNames.add(name)
  return name
}

// Generate all employees
function generateEmployees(): Array<{
  name: string
  email: string
  active: boolean
  department_id: number
  organisation_id: number
  salary: number
  city: string
  region: string
  country: string
  latitude: number
  longitude: number
  created_at: Date
  role: string
}> {
  // Clear used names for fresh generation
  usedNames.clear()

  const generatedEmployees: Array<{
    name: string
    email: string
    active: boolean
    department_id: number
    organisation_id: number
    salary: number
    city: string
    region: string
    country: string
    latitude: number
    longitude: number
    created_at: Date
    role: string
  }> = []

  for (const { role, count } of employeeDistribution) {
    const roleDef = roleDefinitions[role as keyof typeof roleDefinitions]

    for (let i = 0; i < count; i++) {
      const name = generateUniqueName()
      const location = selectLocation(roleDef.department_id)
      const salary = randomSalary(roleDef.salaryMin, roleDef.salaryMax)
      const hireDate = generateHireDate(role)
      const isActive = Math.random() > 0.05 // 95% active

      generatedEmployees.push({
        name,
        email: name.toLowerCase().replace(' ', '.') + '@company.com',
        active: isActive,
        department_id: roleDef.department_id,
        organisation_id: 1,
        salary,
        city: location.city,
        region: location.region,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        created_at: hireDate,
        role
      })
    }
  }

  return generatedEmployees
}

// Generate team assignments for employees
function generateTeamAssignments(
  insertedEmployees: Array<{ id: number; created_at: Date | null }>,
  insertedTeams: Array<{ id: number; name: string }>,
  employeeRoles: string[]
): Array<{
  employee_id: number
  team_id: number
  role: string
  joined_at: Date
  organisation_id: number
}> {
  const assignments: Array<{
    employee_id: number
    team_id: number
    role: string
    joined_at: Date
    organisation_id: number
  }> = []

  insertedEmployees.forEach((employee, index) => {
    const employeeRole = employeeRoles[index]
    const roleDef = roleDefinitions[employeeRole as keyof typeof roleDefinitions]

    if (!roleDef) return

    // Primary team assignment
    const primaryTeamName = roleDef.teams[Math.floor(Math.random() * roleDef.teams.length)]
    const primaryTeam = insertedTeams.find(t => t.name === primaryTeamName)

    if (primaryTeam) {
      const isLead = employeeRole.includes('Manager') || employeeRole.includes('Director') || employeeRole.includes('Senior')
      assignments.push({
        employee_id: employee.id,
        team_id: primaryTeam.id,
        role: isLead ? 'lead' : 'member',
        joined_at: employee.created_at || new Date(),
        organisation_id: 1
      })
    }

    // 30% chance of secondary team (within same department)
    if (Math.random() < 0.3 && roleDef.teams.length > 1) {
      const otherTeams = roleDef.teams.filter(t => t !== primaryTeamName)
      const secondaryTeamName = otherTeams[Math.floor(Math.random() * otherTeams.length)]
      const secondaryTeam = insertedTeams.find(t => t.name === secondaryTeamName)

      if (secondaryTeam) {
        const joinDate = new Date(employee.created_at || new Date())
        joinDate.setDate(joinDate.getDate() + Math.floor(Math.random() * 180) + 30) // 1-6 months after hire

        assignments.push({
          employee_id: employee.id,
          team_id: secondaryTeam.id,
          role: 'contributor',
          joined_at: joinDate,
          organisation_id: 1
        })
      }
    }

    // 10% chance of cross-functional team
    if (Math.random() < 0.1) {
      const crossFuncTeams = insertedTeams.filter(t => t.name === 'Innovation Lab' || t.name === 'Accessibility')
      const crossFuncTeam = crossFuncTeams[Math.floor(Math.random() * crossFuncTeams.length)]

      if (crossFuncTeam) {
        const joinDate = new Date(employee.created_at || new Date())
        joinDate.setDate(joinDate.getDate() + Math.floor(Math.random() * 365) + 60) // 2-12 months after hire

        assignments.push({
          employee_id: employee.id,
          team_id: crossFuncTeam.id,
          role: 'contributor',
          joined_at: joinDate,
          organisation_id: 1
        })
      }
    }
  })

  return assignments
}

// Role-based productivity profiles (used for productivity data generation)
const productivityProfiles: Record<string, { lines_of_codeBase: number; pull_requestsBase: number; deploymentsBase: number }> = {
  'Senior Engineer': { lines_of_codeBase: 300, pull_requestsBase: 8, deploymentsBase: 2 },
  'Engineer': { lines_of_codeBase: 250, pull_requestsBase: 6, deploymentsBase: 1 },
  'Junior Engineer': { lines_of_codeBase: 180, pull_requestsBase: 4, deploymentsBase: 0 },
  'DevOps Engineer': { lines_of_codeBase: 150, pull_requestsBase: 4, deploymentsBase: 5 },
  'QA Engineer': { lines_of_codeBase: 100, pull_requestsBase: 12, deploymentsBase: 0 },
  'Engineering Manager': { lines_of_codeBase: 50, pull_requestsBase: 2, deploymentsBase: 0 },
  'Security Engineer': { lines_of_codeBase: 120, pull_requestsBase: 3, deploymentsBase: 1 },
  'Marketing Manager': { lines_of_codeBase: 0, pull_requestsBase: 1, deploymentsBase: 0 },
  'Content Specialist': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'Growth Marketer': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'Brand Designer': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'Marketing Analyst': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'Sales Director': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'Enterprise AE': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'SMB AE': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'SDR': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'Customer Success': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'HR Director': { lines_of_codeBase: 0, pull_requestsBase: 1, deploymentsBase: 0 },
  'HR Business Partner': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'Recruiter': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'HR Coordinator': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 },
  'Learning & Development': { lines_of_codeBase: 0, pull_requestsBase: 0, deploymentsBase: 0 }
}

// PR Event types for funnel analysis
const PR_EVENT_TYPES = [
  'created',
  'review_requested',
  'reviewed',
  'changes_requested',
  'approved',
  'merged',
  'closed'
] as const

type PREventType = typeof PR_EVENT_TYPES[number]

// Role-based PR activity profiles (PRs per month)
const prActivityProfiles: Record<string, { prActivityBase: number; canReview: boolean }> = {
  'Senior Engineer': { prActivityBase: 12, canReview: true },
  'Engineer': { prActivityBase: 8, canReview: true },
  'Junior Engineer': { prActivityBase: 6, canReview: false },
  'DevOps Engineer': { prActivityBase: 5, canReview: true },
  'QA Engineer': { prActivityBase: 3, canReview: true },
  'Engineering Manager': { prActivityBase: 2, canReview: true },
  'Security Engineer': { prActivityBase: 4, canReview: true },
  'Marketing Manager': { prActivityBase: 0, canReview: false },
  'Content Specialist': { prActivityBase: 0, canReview: false },
  'Growth Marketer': { prActivityBase: 0, canReview: false },
  'Brand Designer': { prActivityBase: 0, canReview: false },
  'Marketing Analyst': { prActivityBase: 0, canReview: false },
  'Sales Director': { prActivityBase: 0, canReview: false },
  'Enterprise AE': { prActivityBase: 0, canReview: false },
  'SMB AE': { prActivityBase: 0, canReview: false },
  'SDR': { prActivityBase: 0, canReview: false },
  'Customer Success': { prActivityBase: 0, canReview: false },
  'HR Director': { prActivityBase: 0, canReview: false },
  'HR Business Partner': { prActivityBase: 0, canReview: false },
  'Recruiter': { prActivityBase: 0, canReview: false },
  'HR Coordinator': { prActivityBase: 0, canReview: false },
  'Learning & Development': { prActivityBase: 0, canReview: false }
}

// Generate comprehensive productivity data from 2024 to current date
function generateProductivityData(insertedEmployees: Array<{ id: number; active: boolean; department_id: number | null }>, employeeRoles: string[]): any[] {
  const productivityData: any[] = []
  const startDate = new Date('2024-01-01')
  const endDate = new Date() // Current date

  // Iterate through each day of the year
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
    const month = date.getMonth() + 1
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = isHolidayDate(date)

    // Seasonal productivity modifier (Q4 holiday slowdown, Q1 sprint)
    let seasonalModifier = 1.0
    if (month === 12) seasonalModifier = 0.7 // December slowdown
    else if (month === 1) seasonalModifier = 1.2 // January sprint
    else if (month === 7 || month === 8) seasonalModifier = 0.85 // Summer slower

    // Day of week productivity modifier
    let dayModifier = 1.0
    if (dayOfWeek === 1) dayModifier = 0.8 // Monday ramp-up
    else if (dayOfWeek === 5) dayModifier = 0.7 // Friday wind-down
    else if (dayOfWeek === 2 || dayOfWeek === 3) dayModifier = 1.1 // Tuesday/Wednesday peak

    insertedEmployees.forEach((employee, index) => {
      const role = employeeRoles[index]
      const profile = productivityProfiles[role] || productivityProfiles['Engineer']

      // Skip weekends and holidays for most employees
      const isWorkDay = !isWeekend && !isHoliday

      // Some employees might work occasionally on weekends (DevOps, Senior roles)
      const weekendWork = (role.includes('Senior') || role.includes('DevOps')) &&
                         Math.random() < 0.15 && isWeekend

      let days_off = false
      let lines_of_code = 0
      let pull_requests = 0
      let live_deployments = 0
      let happiness_index = 7 // Base happiness

      if (!employee.active) {
        // Inactive employees have no productivity
        days_off = true
        happiness_index = 5
      } else if (!isWorkDay && !weekendWork) {
        // Regular days off
        days_off = true
        happiness_index = 8 // Higher happiness on days off
      } else {
        // Working day - generate realistic productivity
        const overallModifier = seasonalModifier * dayModifier * (0.7 + Math.random() * 0.6) // Random variation

        // Vacation days (random 15-25 days per year)
        const vacationProbability = 0.04 + Math.random() * 0.03 // 4-7% chance per day
        if (Math.random() < vacationProbability / 365 * 20) { // Spread 20 vacation days
          days_off = true
          happiness_index = 9 // Very happy on vacation
        } else {
          // Regular work day
          lines_of_code = Math.max(0, Math.round(profile.lines_of_codeBase * overallModifier * (0.5 + Math.random())))
          pull_requests = Math.max(0, Math.round(profile.pull_requestsBase * overallModifier * (0.3 + Math.random() * 0.8)))
          live_deployments = Math.max(0, Math.round(profile.deploymentsBase * overallModifier * (0.2 + Math.random() * 0.9)))

          // Happiness correlates with productivity but has randomness
          const productivityScore = (lines_of_code + pull_requests * 50 + live_deployments * 100) / 400
          happiness_index = Math.max(1, Math.min(10, Math.round(6 + productivityScore * 2 + (Math.random() - 0.5) * 3)))
        }
      }

      productivityData.push({
        employee_id: employee.id,
        department_id: employee.department_id,
        date: new Date(date),
        lines_of_code,
        pull_requests,
        live_deployments,
        days_off,
        happiness_index,
        organisation_id: 1
      })
    })
  }

  return productivityData
}

// Helper function to identify holidays
function isHolidayDate(date: Date): boolean {
  const month = date.getMonth() + 1
  const day = date.getDate()

  // Major US holidays
  const holidays = [
    [1, 1],   // New Year's Day
    [7, 4],   // Independence Day
    [11, 11], // Veterans Day
    [12, 25], // Christmas
  ]

  return holidays.some(([m, d]) => month === m && day === d)
}

// Helper functions for PR event generation
function randomDateInRange(start: Date, end: Date): Date {
  const startTime = start.getTime()
  const endTime = end.getTime()
  return new Date(startTime + Math.random() * (endTime - startTime))
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

interface PREventData {
  pr_number: number
  event_type: PREventType
  employee_id: number
  organisation_id: number
  timestamp: Date
}

// Generate PR event sequence for a single PR
function generatePREventSequence(
  pr_number: number,
  authorId: number,
  reviewers: { id: number }[],
  createdDate: Date
): PREventData[] {
  const events: PREventData[] = []
  let currentTime = new Date(createdDate)

  // 1. CREATED (100% - always happens)
  events.push({
    pr_number,
    event_type: 'created',
    employee_id: authorId,
    organisation_id: 1,
    timestamp: new Date(currentTime)
  })

  // 2. REVIEW_REQUESTED (95% of PRs request review)
  if (Math.random() < 0.95 && reviewers.length > 0) {
    currentTime = addMinutes(currentTime, randomInt(5, 60))
    const reviewer = reviewers[Math.floor(Math.random() * reviewers.length)]
    events.push({
      pr_number,
      event_type: 'review_requested',
      employee_id: reviewer.id,
      organisation_id: 1,
      timestamp: new Date(currentTime)
    })

    // 3. REVIEWED / CHANGES_REQUESTED / APPROVED (85% get some review)
    if (Math.random() < 0.85) {
      currentTime = addMinutes(currentTime, randomInt(30, 480)) // 30 min to 8 hours

      // Determine review outcome
      const outcomeRoll = Math.random()
      if (outcomeRoll < 0.2) {
        // 20% - Just comments (reviewed)
        events.push({
          pr_number,
          event_type: 'reviewed',
          employee_id: reviewer.id,
          organisation_id: 1,
          timestamp: new Date(currentTime)
        })
        // May get approved later (70% chance)
        if (Math.random() < 0.7) {
          currentTime = addMinutes(currentTime, randomInt(60, 1440))
          events.push({
            pr_number,
            event_type: 'approved',
            employee_id: reviewer.id,
            organisation_id: 1,
            timestamp: new Date(currentTime)
          })
        }
      } else if (outcomeRoll < 0.4) {
        // 20% - Changes requested
        events.push({
          pr_number,
          event_type: 'changes_requested',
          employee_id: reviewer.id,
          organisation_id: 1,
          timestamp: new Date(currentTime)
        })
        // 60% eventually get approved after changes
        if (Math.random() < 0.6) {
          currentTime = addMinutes(currentTime, randomInt(120, 2880)) // 2 hours to 2 days
          events.push({
            pr_number,
            event_type: 'approved',
            employee_id: reviewer.id,
            organisation_id: 1,
            timestamp: new Date(currentTime)
          })
        }
      } else {
        // 60% - Direct approval
        events.push({
          pr_number,
          event_type: 'approved',
          employee_id: reviewer.id,
          organisation_id: 1,
          timestamp: new Date(currentTime)
        })
      }
    }
  }

  // 4. MERGED or CLOSED (final state)
  const hasApproval = events.some(e => e.event_type === 'approved')
  if (hasApproval && Math.random() < 0.9) {
    // 90% of approved PRs get merged
    currentTime = addMinutes(currentTime, randomInt(10, 120))
    events.push({
      pr_number,
      event_type: 'merged',
      employee_id: authorId,
      organisation_id: 1,
      timestamp: new Date(currentTime)
    })
  } else if (Math.random() < 0.3) {
    // 30% of unapproved PRs get closed
    currentTime = addMinutes(currentTime, randomInt(1440, 10080)) // 1-7 days
    events.push({
      pr_number,
      event_type: 'closed',
      employee_id: authorId,
      organisation_id: 1,
      timestamp: new Date(currentTime)
    })
  }
  // Else: PR remains open (realistic - some PRs go stale)

  return events
}

// Generate PR events data for all employees (role-based)
function generatePREventsData(insertedEmployees: { id: number; active: boolean }[], employeeRoles: string[]): PREventData[] {
  const allPREvents: PREventData[] = []
  const startDate = new Date('2024-01-01')
  const endDate = new Date()

  let globalPRCounter = 1

  // Get employees with PR activity based on role
  const prActiveEmployees = insertedEmployees.filter((emp, index) => {
    const role = employeeRoles[index]
    const profile = prActivityProfiles[role]
    return profile && profile.prActivityBase > 0 && emp.active
  })

  // Get reviewers (employees who can review based on role)
  const reviewerEmployees = insertedEmployees.filter((emp, index) => {
    const role = employeeRoles[index]
    const profile = prActivityProfiles[role]
    return profile && profile.canReview && emp.active
  })

  // Generate PRs month by month
  for (let date = new Date(startDate); date <= endDate; date.setMonth(date.getMonth() + 1)) {
    const monthStart = new Date(date)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    // Ensure we don't go past current date
    const effectiveMonthEnd = monthEnd > endDate ? endDate : monthEnd

    // Each active engineer creates PRs this month
    for (const employee of prActiveEmployees) {
      const employeeIndex = insertedEmployees.indexOf(employee)
      const role = employeeRoles[employeeIndex]
      const profile = prActivityProfiles[role]

      if (!profile) continue

      // Monthly variation in PR count (70% to 130% of base)
      const monthlyPRCount = Math.round(
        profile.prActivityBase * (0.7 + Math.random() * 0.6)
      )

      for (let i = 0; i < monthlyPRCount; i++) {
        const pr_number = globalPRCounter++
        const prCreatedDate = randomDateInRange(monthStart, effectiveMonthEnd)

        // Get reviewers excluding the author
        const availableReviewers = reviewerEmployees.filter(r => r.id !== employee.id)

        // Generate event sequence for this PR
        const prEventSequence = generatePREventSequence(
          pr_number,
          employee.id,
          availableReviewers,
          prCreatedDate
        )

        allPREvents.push(...prEventSequence)
      }
    }
  }

  // Sort all events by timestamp for realistic ordering
  allPREvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return allPREvents
}

// Generate comprehensive time entries data
function generateTimeEntriesData(
  insertedEmployees: any[],
  insertedDepartments: any[],
  employeeRoles: string[]
): any[] {
  const timeEntriesData: any[] = []

  // Create department map for easy lookup
  const departmentMap: Record<number, any> = {}
  insertedDepartments.forEach(dept => {
    departmentMap[dept.id] = dept
  })

  // Allocation types with realistic distributions
  const allocationTypes = [
    { type: 'development', probability: 0.4, avgHours: 6 },
    { type: 'maintenance', probability: 0.15, avgHours: 2 },
    { type: 'meetings', probability: 0.2, avgHours: 1.5 },
    { type: 'research', probability: 0.1, avgHours: 3 },
    { type: 'documentation', probability: 0.1, avgHours: 2 },
    { type: 'testing', probability: 0.05, avgHours: 4 }
  ]

  // Task descriptions for realism
  const descriptions = {
    development: [
      'Feature implementation',
      'Bug fixes',
      'Code refactoring',
      'API development',
      'Frontend components',
      'Backend services'
    ],
    maintenance: [
      'Server maintenance',
      'Database optimization',
      'Security patches',
      'Performance tuning',
      'Legacy system updates'
    ],
    meetings: [
      'Daily standup',
      'Sprint planning',
      'Code review',
      'Architecture discussion',
      'Client meeting',
      'Team retrospective'
    ],
    research: [
      'Technology evaluation',
      'Proof of concept',
      'Performance analysis',
      'Market research',
      'Competitor analysis'
    ],
    documentation: [
      'API documentation',
      'User manual updates',
      'Technical specifications',
      'Process documentation',
      'Knowledge base updates'
    ],
    testing: [
      'Unit testing',
      'Integration testing',
      'Performance testing',
      'User acceptance testing',
      'Automated test development'
    ]
  }

  // Generate time entries for 2024 to current date
  const startDate = new Date('2024-01-01')
  const endDate = new Date()

  // Process each employee
  insertedEmployees.forEach((employee, employeeIndex) => {
    // Get employee's department
    const employeeDepartment = departmentMap[employee.department_id]
    if (!employeeDepartment) return

    // Determine employee work pattern based on role
    const role = employeeRoles[employeeIndex]
    const isEngineer = role.includes('Engineer')
    const isManager = role.includes('Manager') || role.includes('Director')
    const isSales = role.includes('Sales') || role.includes('AE') || role.includes('SDR')

    // Adjust allocation probabilities based on role
    let roleAllocationTypes = [...allocationTypes]
    if (isEngineer) {
      roleAllocationTypes[0].probability = 0.6  // More development
      roleAllocationTypes[1].probability = 0.2  // More maintenance
      roleAllocationTypes[2].probability = 0.15 // Fewer meetings
    } else if (isManager) {
      roleAllocationTypes[0].probability = 0.1  // Less development
      roleAllocationTypes[2].probability = 0.5  // More meetings
      roleAllocationTypes[3].probability = 0.2  // More research
    } else if (isSales) {
      roleAllocationTypes[0].probability = 0.05 // Minimal development
      roleAllocationTypes[2].probability = 0.7  // Lots of meetings
      roleAllocationTypes[3].probability = 0.2  // Sales research
    }

    // Generate entries for each work day
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isHoliday = isHolidayDate(date)

      // Skip weekends and major holidays (most of the time)
      if (isWeekend || isHoliday) {
        // 10% chance of weekend/holiday work for engineers
        if (!isEngineer || Math.random() > 0.1) continue
      }

      // Determine how many time entries for this day (1-4 entries per day)
      const entriesPerDay = isEngineer
        ? Math.floor(Math.random() * 3) + 2 // 2-4 entries
        : Math.floor(Math.random() * 2) + 1 // 1-2 entries

      let totalDayHours = 0
      const maxDayHours = 8 + (Math.random() * 2) // 8-10 hours max per day

      for (let entryIndex = 0; entryIndex < entriesPerDay; entryIndex++) {
        if (totalDayHours >= maxDayHours) break

        // Select allocation type based on probabilities
        let selectedType = 'development'
        const rand = Math.random()
        let cumulativeProbability = 0

        for (const allocType of roleAllocationTypes) {
          cumulativeProbability += allocType.probability
          if (rand <= cumulativeProbability) {
            selectedType = allocType.type
            break
          }
        }

        const typeConfig = roleAllocationTypes.find(t => t.type === selectedType)!

        // Generate realistic hours with variation
        const baseHours = typeConfig.avgHours
        const variation = (Math.random() - 0.5) * baseHours * 0.4 // +/-20% variation
        let hours = Math.max(0.25, Math.min(baseHours + variation, maxDayHours - totalDayHours))
        hours = Math.round(hours * 4) / 4 // Round to nearest 0.25 hours

        if (hours < 0.25) continue

        // Calculate billable hours (some types are more billable than others)
        const billableRates = {
          development: 0.9,
          maintenance: 0.7,
          meetings: 0.3,
          research: 0.5,
          documentation: 0.6,
          testing: 0.8
        }

        const billableRate = billableRates[selectedType as keyof typeof billableRates] || 0.5
        const billable_hours = Math.round(hours * billableRate * 4) / 4

        // Select random description
        const typeDescriptions = descriptions[selectedType as keyof typeof descriptions] || ['General work']
        const description = typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)]

        // Some cross-department collaboration (5% chance)
        let workDepartmentId = employee.department_id
        if (Math.random() < 0.05 && selectedType === 'meetings') {
          const otherDepts = insertedDepartments.filter(d => d.id !== employee.department_id)
          if (otherDepts.length > 0) {
            workDepartmentId = otherDepts[Math.floor(Math.random() * otherDepts.length)].id
          }
        }

        timeEntriesData.push({
          employee_id: employee.id,
          department_id: workDepartmentId,
          date: new Date(date),
          allocation_type: selectedType,
          hours,
          description,
          billable_hours,
          organisation_id: 1
        })

        totalDayHours += hours
      }
    }
  })

  console.log(`Generated ${timeEntriesData.length} time entries`)
  return timeEntriesData
}

// Use shared dashboard configuration
const sampleAnalyticsPage = {
  ...productivityDashboardConfig,
  organisation_id: 1
}

export async function executeSeed(db: any) {
  console.log('🌱 Seeding database with enhanced sample data (100 employees, 16 teams)...')

  try {
    // Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...')
    await db.delete(employee_teams)
    await db.delete(teams)
    await db.delete(pr_events)
    await db.delete(time_entries)
    await db.delete(productivity)
    await db.delete(employees)
    await db.delete(departments)
    await db.delete(analytics_pages)
    await db.delete(settings)

    // Insert departments first (referenced by employees and teams)
    console.log('🏢 Inserting departments...')
    const insertedDepartments = await db.insert(departments)
      .values(sampleDepartments)
      .returning()

    console.log(`✅ Inserted ${insertedDepartments.length} departments`)

    // Generate and insert teams with correct department IDs
    console.log('👥 Inserting teams...')
    const teamData = sampleTeams.map(team => ({
      ...team,
      department_id: team.department_id ? insertedDepartments[team.department_id - 1]?.id : null
    }))
    const insertedTeams = await db.insert(teams)
      .values(teamData)
      .returning()

    console.log(`✅ Inserted ${insertedTeams.length} teams`)

    // Generate employees with locations
    console.log('👥 Generating 100 employees with global distribution...')
    const generatedEmployees = generateEmployees()
    const employeeRoles = generatedEmployees.map(emp => emp.role)

    // Update employee department IDs to match actual inserted IDs
    const updatedEmployees = generatedEmployees.map(emp => ({
      name: emp.name,
      email: emp.email,
      active: emp.active,
      department_id: insertedDepartments[emp.department_id - 1]?.id || null,
      organisation_id: emp.organisation_id,
      salary: emp.salary,
      city: emp.city,
      region: emp.region,
      country: emp.country,
      latitude: emp.latitude,
      longitude: emp.longitude,
      created_at: emp.created_at
    }))

    // Insert employees
    console.log('👥 Inserting employees...')
    const insertedEmployees = await db.insert(employees)
      .values(updatedEmployees)
      .returning()

    console.log(`✅ Inserted ${insertedEmployees.length} employees`)

    // Generate and insert team assignments
    console.log('👥 Generating team assignments...')
    const teamAssignments = generateTeamAssignments(insertedEmployees, insertedTeams, employeeRoles)

    // Insert team assignments in batches
    const teamAssignmentBatchSize = 100
    let insertedTeamAssignmentsCount = 0

    for (let i = 0; i < teamAssignments.length; i += teamAssignmentBatchSize) {
      const batch = teamAssignments.slice(i, i + teamAssignmentBatchSize)
      await db.insert(employee_teams).values(batch)
      insertedTeamAssignmentsCount += batch.length
    }

    console.log(`✅ Inserted ${insertedTeamAssignmentsCount} team assignments`)

    // Generate and insert productivity data
    console.log('📊 Generating productivity data from 2024 to current date...')
    const productivityData = generateProductivityData(insertedEmployees, employeeRoles)
    console.log(`📊 Generated ${productivityData.length} productivity records`)

    // Insert productivity data in batches to avoid memory issues
    const batchSize = 1000
    let insertedProductivityCount = 0

    for (let i = 0; i < productivityData.length; i += batchSize) {
      const batch = productivityData.slice(i, i + batchSize)
      await db.insert(productivity).values(batch)
      insertedProductivityCount += batch.length
      console.log(`📊 Inserted productivity batch: ${insertedProductivityCount}/${productivityData.length}`)
    }

    console.log(`✅ Inserted ${insertedProductivityCount} productivity records`)

    // Generate and insert time entries data
    console.log('⏰ Generating time entries data from 2024 to current date...')
    const timeEntriesData = generateTimeEntriesData(insertedEmployees, insertedDepartments, employeeRoles)
    console.log(`⏰ Generated ${timeEntriesData.length} time entry records`)

    // Insert time entries data in batches to avoid memory issues
    const timeEntriesBatchSize = 1000
    let insertedTimeEntriesCount = 0

    for (let i = 0; i < timeEntriesData.length; i += timeEntriesBatchSize) {
      const batch = timeEntriesData.slice(i, i + timeEntriesBatchSize)
      await db.insert(time_entries).values(batch)
      insertedTimeEntriesCount += batch.length
      console.log(`⏰ Inserted time entries batch: ${insertedTimeEntriesCount}/${timeEntriesData.length}`)
    }

    console.log(`✅ Inserted ${insertedTimeEntriesCount} time entry records`)

    // Generate and insert PR events data
    console.log('🔀 Generating PR events data...')
    const prEventsData = generatePREventsData(insertedEmployees, employeeRoles)
    console.log(`🔀 Generated ${prEventsData.length} PR event records`)

    // Insert PR events in batches
    const prEventsBatchSize = 1000
    let insertedPREventsCount = 0

    for (let i = 0; i < prEventsData.length; i += prEventsBatchSize) {
      const batch = prEventsData.slice(i, i + prEventsBatchSize)
      await db.insert(pr_events).values(batch)
      insertedPREventsCount += batch.length
      console.log(`🔀 Inserted PR events batch: ${insertedPREventsCount}/${prEventsData.length}`)
    }

    console.log(`✅ Inserted ${insertedPREventsCount} PR event records`)

    // Insert sample analytics page
    console.log('📊 Inserting sample analytics page...')
    const insertedPage = await db.insert(analytics_pages)
      .values(sampleAnalyticsPage)
      .returning()

    console.log(`✅ Inserted analytics page: ${insertedPage[0].name}`)

    // Clean up all notebooks except the sample (id=1), then restore it
    console.log('📓 Cleaning up user-created notebooks...')
    await db.delete(notebooks).where(ne(notebooks.id, 1))

    // Restore sample notebook (id=1) — update in-place to preserve the URL
    console.log('📓 Restoring sample notebook...')
    const updatedNotebook = await db
      .update(notebooks)
      .set({
        name: sampleNotebookData.name,
        description: sampleNotebookData.description,
        config: sampleNotebookData.config,
        is_active: true,
        updated_at: new Date()
      })
      .where(eq(notebooks.id, 1))
      .returning()

    if (updatedNotebook.length > 0) {
      console.log(`✅ Restored sample notebook: ${updatedNotebook[0].name}`)
    } else {
      console.log('⚠️ Sample notebook (id=1) not found — skipping restore')
    }

    // Insert initial settings
    console.log('⚙️ Inserting initial settings...')
    const initialSettings = [
      {
        key: 'gemini-ai-calls',
        value: '0',
        organisation_id: 1
      }
    ]

    const insertedSettings = await db.insert(settings)
      .values(initialSettings)
      .returning()

    console.log(`✅ Inserted ${insertedSettings.length} settings`)

    console.log('🎉 Database seeded successfully!')
    console.log('\n📊 Data summary:')
    console.log(`- ${insertedEmployees.length} employees across ${insertedDepartments.length} departments`)
    console.log(`- ${insertedTeams.length} teams with ${insertedTeamAssignmentsCount} team assignments`)
    console.log(`- Employees distributed across ${new Set(updatedEmployees.map(e => e.city)).size} cities worldwide`)
    console.log('\n📊 What you can do now:')
    console.log('- Visit http://localhost:3000 to see the React dashboard')
    console.log('- View the sample "Executive Dashboard" with employee analytics')
    console.log('- Create new dashboards with custom charts')
    console.log(`- Query the API at http://localhost:3459/cubejs-api/v1/meta`)
    console.log('\n🔍 Sample queries you can try:')
    console.log('- Employee count by country: measures: ["Employees.count"], dimensions: ["Employees.country"]')
    console.log('- Team size: measures: ["EmployeeTeams.uniqueEmployees"], dimensions: ["Teams.name"]')
    console.log('- Salary by location: measures: ["Employees.avgSalary"], dimensions: ["Employees.city"]')

    return { success: true, message: 'Database seeded successfully' }

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
