import { Pool } from 'pg';

export const pgPool = new Pool({
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    port: Number(process.env.PG_PORT || 5432),
    max: 10
});
