// PaymentService -- integracion con MercadoPago
// Recibe el accessToken por inyeccion de dependencias.
// Usa Checkout Pro: el backend crea una preferencia y devuelve
// la URL de pago. El usuario paga en la pagina de MercadoPago
// y vuelve al sitio en success/failure.
const { MercadoPagoConfig, Preference } = require("mercadopago");

class PaymentService {
  constructor(accessToken) {
    this.client = new MercadoPagoConfig({ accessToken: accessToken });
  }

  _validate(items, email) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Los items del pedido son obligatorios");
    }
    if (!email || !String(email).includes("@")) {
      throw new Error("El email es obligatorio");
    }
    for (var i = 0; i < items.length; i++) {
      if (!items[i].title) throw new Error("Cada item debe tener un titulo");
      if (!items[i].unit_price || Number(items[i].unit_price) <= 0) {
        throw new Error("El precio de cada item debe ser mayor a 0");
      }
      if (!items[i].quantity || Number(items[i].quantity) <= 0) {
        throw new Error("La cantidad de cada item debe ser mayor a 0");
      }
    }
  }

  // Crea una preferencia de pago en MercadoPago.
  // Devuelve { init_point, sandbox_init_point } con la URL de pago.
  // items: [{ title, unit_price (en soles), quantity }]
  async createPreference(data) {
    var items       = data.items;
    var email       = data.email;
    var frontendUrl = data.frontendUrl || "http://localhost:3000";

    try {
      this._validate(items, email);
    } catch (err) {
      return Promise.reject(err);
    }

    var preference = new Preference(this.client);
    var response = await preference.create({
      body: {
        items: items.map(function(item) {
          return {
            title:      String(item.title),
            quantity:   Number(item.quantity),
            unit_price: Number(item.unit_price),
            currency_id: "PEN",
          };
        }),
        payer: { email: email },
        // back_urls solo se activan en produccion con URLs publicas (HTTPS).
        // En desarrollo local se omite auto_return para evitar el error
        // "auto_return invalid. back_url.success must be defined".
        back_urls: {
          success: frontendUrl + "/pago-exitoso",
          failure: frontendUrl + "/pago-fallido",
          pending: frontendUrl + "/pago-pendiente",
        },
      },
    });

    return {
      init_point:         response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      preference_id:      response.id,
    };
  }
}

module.exports = PaymentService;
