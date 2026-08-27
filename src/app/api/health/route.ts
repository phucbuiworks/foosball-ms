import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // Perform a query to verify database connectivity
    await sql`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Health check database connection failed:', err);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'error',
        error: err.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
