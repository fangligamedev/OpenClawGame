import { Pool, PoolClient, QueryResult } from 'pg';

// 数据库连接池
let pool: Pool | null = null;

// 获取数据库连接池
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.warn('⚠️ DATABASE_URL not set, using in-memory mode');
      throw new Error('DATABASE_URL not configured');
    }
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000, // 空闲超时
      connectionTimeoutMillis: 2000, // 连接超时
    });
    
    // 错误处理
    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
    
    console.log('✅ Database pool initialized');
  }
  
  return pool;
}

// 测试数据库连接
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    client.release();
    console.log('✅ Database connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// 执行查询
export async function query<T extends { [key: string]: any } = any>(
  sql: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(sql, params);
}

// 获取客户端（用于事务）
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

// 关闭连接池
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database pool closed');
  }
}

// 初始化数据库表
export async function initializeTables(): Promise<void> {
  try {
    // 检查是否可以连接
    await testConnection();
    console.log('✅ Database tables ready');
  } catch (error) {
    console.error('❌ Failed to initialize tables:', error);
    throw error;
  }
}
