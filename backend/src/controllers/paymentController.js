// PaymentController -- MercadoPago Checkout Pro
// POST /api/payments -> crea preferencia -> devuelve URL de pago
const PaymentService = require("../services/paymentService");

const accessToken = process.env.MP_ACCESS_TOKEN || "";
const service     = new PaymentService(accessToken);

const createPreference = async (req, res) => {
  try {
    var items       = req.body.items;
    var email       = req.body.email;
    var frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    var result = await service.createPreference({ items, email, frontendUrl });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = { createPreference };
