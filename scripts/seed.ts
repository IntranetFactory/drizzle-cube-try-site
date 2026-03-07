/**
 * Database seeding script with sample data
 */

import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import postgres from 'postgres'
import { neon } from '@neondatabase/serverless'
import { schema } from '../drizzle_schema'
import { executeSeed } from '../src/seed-utils'

// Default connection string for CLI usage
const defaultConnectionString = process.env.DATABASE_URL || 'postgresql://drizzle_user:drizzle_pass123@localhost:54921/drizzle_cube_db'

// Auto-detect Neon vs local PostgreSQL based on connection string
function isNeonUrl(url: string): boolean {
  return url.includes('.neon.tech') || url.includes('neon.database')
}

// Create database connection factory
function createDatabase(databaseUrl: string) {
  if (isNeonUrl(databaseUrl)) {
    console.log('🚀 Connecting to Neon serverless database')
    const sql = neon(databaseUrl)
    return drizzleNeon(sql, { schema })
  } else {
    console.log('🐘 Connecting to local PostgreSQL database')
    const client = postgres(databaseUrl)
    return drizzle(client, { schema })
  }
}

async function seedDatabase() {
  // Create database connection
  const database = createDatabase(defaultConnectionString)
  
  // Use the shared seed function that includes time entries
  const result = await executeSeed(database)
  
  if (result.success) {
    console.log('\n🎉 Seeding completed successfully!')
    console.log('\n📊 What was seeded:')
    console.log('- 4 departments (Engineering, Marketing, Sales, HR)')
    console.log('- 12 employees with realistic profiles')
    console.log('- Daily productivity data for 2024')
    console.log('- Time entries data with allocation types')
    console.log('- Sample analytics dashboard')
    console.log('\n🚀 Ready to explore:')
    console.log('- TimeEntries cube with allocation analysis')
    console.log('- Cross-cube analytics (Employees + TimeEntries + Productivity)')
    console.log('- Billable vs non-billable hours tracking')
    process.exit(0)
  } else {
    console.error('❌ Seeding failed:', result.error)
    process.exit(1)
  }
}

seedDatabase()