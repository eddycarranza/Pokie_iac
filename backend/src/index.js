// ============================================================
// POKIE CAT — Backend API
// Express + PostgreSQL
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes     = require("./routes/auth");
const productRoutes  = require("./routes/products");
const orderRoutes    = require("./routes/orders");
const expenseRoutes  = require("./routes/expenses");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middlewares ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// ── Rutas ────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders",   orderRoutes);
app.use("/api/expenses", expenseRoutes);

// ── Health check (útil para Docker y CI/CD) ──────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Arranque ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});
