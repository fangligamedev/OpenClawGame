import { Pool, PoolClient, QueryResult } from 'pg';
export declare function getPool(): Pool;
export declare function testConnection(): Promise<boolean>;
export declare function query<T extends {
    [key: string]: any;
} = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
export declare function getClient(): Promise<PoolClient>;
export declare function closePool(): Promise<void>;
export declare function initializeTables(): Promise<boolean>;
//# sourceMappingURL=database.d.ts.map