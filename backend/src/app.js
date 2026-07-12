// ============================================================
// POKIE CAT — App Express (reutilizable en servidor y en Lambda)
// index.js la levanta con listen(); lambda.js la envuelve con serverless-http.
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes    = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes   = require("./routes/orders");
const expenseRoutes = require("./routes/expenses");
const paymentRoutes = require("./routes/payments");

const app = express();

// Oculta el header "X-Powered-By: Express" para no revelar información
// del framework/version del servidor a quien inspeccione las respuestas.
app.disable("x-powered-by");

// ── Middlewares ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────
// Cada router se monta en DOS prefijos:
//   /api/<x>  → como lo llama el frontend en docker-compose (Nginx local)
//   /<x>      → como llega desde API Gateway (recurso /<x>/{proxy+} → Lambda)
app.use(["/api/auth", "/auth"],           authRoutes);
app.use(["/api/products", "/products"],   productRoutes);
app.use(["/api/orders", "/orders"],       orderRoutes);
app.use(["/api/expenses", "/expenses"],   expenseRoutes);
app.use(["/api/payments", "/payments"],   paymentRoutes);

// ── Health check ─────────────────────────────────────────────
app.get(["/health", "/api/health"], (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = app;
