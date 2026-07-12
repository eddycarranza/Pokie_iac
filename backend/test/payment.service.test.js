// ============================================================
// Tests de PaymentService -- MercadoPago Checkout Pro
// Se mockea el SDK de MercadoPago para no hacer llamadas reales.
// Patron AAA en cada test.
// ============================================================
const PaymentService = require("../src/services/paymentService");

// Mock del modulo mercadopago completo
jest.mock("mercadopago", function() {
  return {
    MercadoPagoConfig: jest.fn().mockImplementation(function() {}),
    Preference: jest.fn().mockImplementation(function() {
      return {
        create: jest.fn(),
      };
    }),
  };
});

var mercadopago = require("mercadopago");

describe("PaymentService - MercadoPago", function() {
  var service;
  var mockPreferenceCreate;

  beforeEach(function() {
    mockPreferenceCreate = jest.fn();
    mercadopago.Preference.mockImplementation(function() {
      return { create: mockPreferenceCreate };
    });
    service = new PaymentService("TEST-token-falso");
  });

  afterEach(function() {
    jest.clearAllMocks();
  });

  // Test 1: createPreference exitoso devuelve init_point
  test("createPreference() devuelve init_point y sandbox_init_point", async function() {
    // Arrange
    mockPreferenceCreate.mockResolvedValue({
      id:                 "pref_123",
      init_point:         "https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=pref_123",
      sandbox_init_point: "https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=pref_123",
    });

    // Act
    var result = await service.createPreference({
      items: [{ title: "Polo Gatuno", unit_price: 45.0, quantity: 1 }],
      email: "cliente@test.com",
    });

    // Assert
    expect(result.init_point).toContain("mercadopago");
    expect(result.sandbox_init_point).toContain("sandbox");
    expect(result.preference_id).toBe("pref_123");
    expect(mockPreferenceCreate).toHaveBeenCalledTimes(1);
  });

  // Test 2: items vacio lanza error sin llamar a MP
  test("createPreference() lanza error si items esta vacio", async function() {
    // Arrange / Act
    var act = function() {
      return service.createPreference({ items: [], email: "cliente@test.com" });
    };

    // Assert
    await expect(act()).rejects.toThrow("Los items del pedido son obligatorios");
    expect(mockPreferenceCreate).not.toHaveBeenCalled();
  });

  // Test 3: email invalido lanza error sin llamar a MP
  test("createPreference() lanza error si el email no tiene @", async function() {
    // Arrange / Act
    var act = function() {
      return service.createPreference({
        items: [{ title: "Polo", unit_price: 45, quantity: 1 }],
        email: "correo-sin-arroba",
      });
    };

    // Assert
    await expect(act()).rejects.toThrow("El email es obligatorio");
    expect(mockPreferenceCreate).not.toHaveBeenCalled();
  });

  // Test 4: item con precio 0 lanza error
  test("createPreference() lanza error si un item tiene precio 0", async function() {
    // Arrange / Act
    var act = function() {
      return service.createPreference({
        items: [{ title: "Polo", unit_price: 0, quantity: 1 }],
        email: "cliente@test.com",
      });
    };

    // Assert
    await expect(act()).rejects.toThrow("El precio de cada item debe ser mayor a 0");
    expect(mockPreferenceCreate).not.toHaveBeenCalled();
  });

  // Test 5: error de MercadoPago se propaga correctamente
  test("createPreference() propaga el error si MercadoPago falla", async function() {
    // Arrange
    mockPreferenceCreate.mockRejectedValue(new Error("Credenciales invalidas"));

    // Act
    var act = function() {
      return service.createPreference({
        items: [{ title: "Polo", unit_price: 45, quantity: 2 }],
        email: "cliente@test.com",
      });
    };

    // Assert
    await expect(act()).rejects.toThrow("Credenciales invalidas");
  });
});
