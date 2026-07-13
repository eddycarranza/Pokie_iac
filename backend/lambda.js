// ============================================================
// POKIE CAT — Entry point para AWS Lambda
// ============================================================
"use strict";

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const serverless = require("serverless-http");

let cachedHandler = null;

async function getSecret(arn) {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "us-east-1" });
  const cmd = new GetSecretValueCommand({ SecretId: arn });
  const res = await client.send(cmd);
  return JSON.parse(res.SecretString);
}

async function bootstrap() {
  if (process.env.DB_SECRET_ARN) {
    try {
      const db = await getSecret(process.env.DB_SECRET_ARN);
      process.env.DB_HOST     = db.host;
      process.env.DB_PORT     = String(db.port || 5432);
      process.env.DB_NAME     = db.dbname || "pokiecat";
      process.env.DB_USER     = db.username;
      process.env.DB_PASSWORD = db.password;
    } catch (e) { console.error("Error leyendo DB secret:", e.message); }
  }
  if (process.env.MP_SECRET_ARN) {
    try {
      const mp = await getSecret(process.env.MP_SECRET_ARN);
      process.env.MP_ACCESS_TOKEN = mp.access_token || mp.token || String(mp);
    } catch (e) { console.error("Error leyendo MP secret:", e.message); }
  }
  const app = require("./src/app");
  return serverless(app);
}

exports.handler = async (event, context) => {
  if (!cachedHandler) { cachedHandler = await bootstrap(); }

  // Query especial: invocar con { "query": "SELECT ..." }
  if (event.query) {
    const { Pool } = require("pg");
    const pool = new Pool({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME, user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, ssl: { rejectUnauthorized: false },
    });
    try {
      const result = await pool.query(event.query);
      await pool.end();
      return { statusCode: 200, body: JSON.stringify({ rows: result.rows, rowCount: result.rowCount }) };
    } catch (err) {
      await pool.end();
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // Seed especial: invocar con { "seed": true }
  if (event.seed) {
    const { Pool } = require("pg");
    const pool = new Pool({
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:      { rejectUnauthorized: false },
    });
    try {
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        CREATE TABLE IF NOT EXISTS admin_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC(10,2) NOT NULL,
          stock INTEGER DEFAULT 0,
          image_url TEXT,
          category VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(100),
          total NUMERIC(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pendiente',
          items JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS expenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          description VARCHAR(255) NOT NULL,
          amount NUMERIC(10,2) NOT NULL,
          category VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        INSERT INTO admin_users (email, password) VALUES (
          'admin@pookiecat.pe',
          '$2b$10$zGwVJWO.jsAs63SI/S7BmOwOWoiSSzqFo0uGxgdFQU5Grs49yjS8O'
        ) ON CONFLICT (email) DO NOTHING;

        INSERT INTO products (name, description, price, stock, category) VALUES
          ('Polo Gatuno',      'Polo oversize con estampado de gato kawaii', 45.00, 20, 'Tops'),
          ('Top Pokie',        'Top cropped con bordado de Pokie Cat',        39.00, 15, 'Tops'),
          ('Jean Kawaii',      'Jean con parche bordado de gatito',           65.00, 10, 'Partes de abajo'),
          ('Falda Pokie',      'Falda plisada con estampado kawaii',          55.00, 12, 'Partes de abajo'),
          ('Bolso Gatuno',     'Bolso mini con forma de gato',                35.00, 25, 'Accesorios'),
          ('Gorra Pokie',      'Gorra bordada con logo de Pookiecat',         28.00, 30, 'Accesorios'),
          ('Zapatilla Kawaii', 'Zapatillas con diseño exclusivo de gatitos',  89.00,  8, 'Zapatos'),
          ('Sandalia Pokie',   'Sandalia con hebilla en forma de gato',       75.00, 10, 'Zapatos')
        ON CONFLICT DO NOTHING;
      `);
      await pool.end();
      return { statusCode: 200, body: JSON.stringify({ message: "Seed completado!" }) };
    } catch (err) {
      await pool.end();
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  return cachedHandler(event, context);
};
