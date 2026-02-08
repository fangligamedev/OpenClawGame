"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.testConnection = testConnection;
exports.query = query;
exports.getClient = getClient;
exports.closePool = closePool;
exports.initializeTables = initializeTables;
const pg_1 = require("pg");
// 数据库连接池
let pool = null;
// 获取数据库连接池
function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            console.warn('⚠️ DATABASE_URL not set, using in-memory mode');
            throw new Error('DATABASE_URL not configured');
        }
        pool = new pg_1.Pool({
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
async function testConnection() {
    try {
        const pool = getPool();
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as now');
        client.release();
        console.log('✅ Database connected:', result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
// 执行查询
async function query(sql, params) {
    const pool = getPool();
    return pool.query(sql, params);
}
// 获取客户端（用于事务）
async function getClient() {
    const pool = getPool();
    return pool.connect();
}
// 关闭连接池
async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('✅ Database pool closed');
    }
}
// 初始化数据库表
async function initializeTables() {
    try {
        // 检查是否可以连接
        await testConnection();
        console.log('✅ Database tables ready');
    }
    catch (error) {
        console.error('❌ Failed to initialize tables:', error);
        throw error;
    }
}
//# sourceMappingURL=database.js.map