// Conexión a PostgreSQL usando variables de entorno
const { Pool } = require("pg");

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || "pokiecat",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Error conectando a PostgreSQL:", err.message);
  } else {
    console.log("✅ Conectado a PostgreSQL");
    release();
  }
});

module.exports = pool;
