// ============================================================
// Rutas de pagos — solo enrutamiento, sin lógica.
// POST /api/payments → crea preferencia MercadoPago, devuelve URL
// ============================================================
const express                = require("express");
const { createPreference }   = require("../controllers/paymentController");

const router = express.Router();

router.post("/", createPreference);

module.exports = router;
