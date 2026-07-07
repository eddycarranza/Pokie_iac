// ============================================================
// Tests de ProductService — casos borde y validaciones extra
// Patrón AAA (Arrange - Act - Assert) en cada test.
// Librería: Jest.  BD: mock del pool inyectado (DI).
// ============================================================

const ProductService = require("../src/services/productService");

describe("ProductService · validaciones y casos borde", () => {
  let service;
  let mockPool;

  beforeEach(() => {
    // Arrange global: pool falso inyectado en el servicio
    mockPool = { query: jest.fn() };
    service  = new ProductService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Test 1: categoría obligatoria en create() ──────────────
  test("create() lanza error si la categoría está vacía", async () => {
    // Arrange
    const data = { name: "Gato Espacial", category: "", price: 50 };

    // Act
    const act = () => service.create(data);

    // Assert
    await expect(act()).rejects.toThrow("La categoría es obligatoria");
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  // ── Test 2: precio 0 no es válido ─────────────────────────
  test("create() lanza error si el precio es exactamente 0", async () => {
    // Arrange
    const data = { name: "Gato Espacial", category: "Tops", price: 0 };

    // Act
    const act = () => service.create(data);

    // Assert
    await expect(act()).rejects.toThrow("El precio debe ser mayor a 0");
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  // ── Test 3: precio undefined no es válido ─────────────────
  test("create() lanza error si el precio no se envía", async () => {
    // Arrange — price ausente en el objeto
    const data = { name: "Gato Espacial", category: "Tops" };

    // Act
    const act = () => service.create(data);

    // Assert
    await expect(act()).rejects.toThrow("El precio es obligatorio");
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  // ── Test 4: create() recorta espacios del nombre ──────────
  test("create() recorta los espacios del nombre antes de guardar en la BD", async () => {
    // Arrange
    const fila = {
      id: 1, name: "Gato Espacial", category: "Tops",
      price: "50.00", sale_price: null, stock: "5", created_at: new Date(),
    };
    mockPool.query.mockResolvedValue({ rows: [fila] });

    // Act
    await service.create({ name: "  Gato Espacial  ", category: "Tops", price: 50 });

    // Assert — el primer parámetro enviado a la BD no debe tener espacios
    const params = mockPool.query.mock.calls[0][1];
    expect(params[0]).toBe("Gato Espacial");
  });

  // ── Test 5: stock undefined se convierte en 0 ─────────────
  test("create() convierte stock undefined en 0 automáticamente", async () => {
    // Arrange
    const fila = {
      id: 2, name: "Polo Gatuno", category: "Polos",
      price: "30.00", sale_price: null, stock: "0", created_at: new Date(),
    };
    mockPool.query.mockResolvedValue({ rows: [fila] });

    // Act — no se envía stock
    const result = await service.create({ name: "Polo Gatuno", category: "Polos", price: 30 });

    // Assert — el resultado normalizado tiene stock como número 0
    expect(result.stock).toBe(0);
    expect(typeof result.stock).toBe("number");
  });

  // ── Test 6: sale_price string se normaliza como float ─────
  test("create() normaliza sale_price de string a número cuando la BD lo devuelve", async () => {
    // Arrange — la BD devuelve sale_price como string (comportamiento real de pg)
    const fila = {
      id: 3, name: "Polo Gatuno", category: "Polos",
      price: "30.00", sale_price: "24.50", stock: "5", created_at: new Date(),
    };
    mockPool.query.mockResolvedValue({ rows: [fila] });

    // Act
    const result = await service.create({ name: "Polo Gatuno", category: "Polos", price: 30 });

    // Assert
    expect(typeof result.sale_price).toBe("number");
    expect(result.sale_price).toBe(24.5);
  });

  // ── Test 7: getAll() devuelve array vacío si no hay productos
  test("getAll() devuelve array vacío si la BD no tiene filas", async () => {
    // Arrange
    mockPool.query.mockResolvedValue({ rows: [] });

    // Act
    const result = await service.getAll();

    // Assert
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  // ── Test 8: sale_price null se mantiene null (no NaN) ─────
  test("getAll() mantiene sale_price como null cuando la BD devuelve null", async () => {
    // Arrange
    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 4, name: "Vestido Rosa", category: "Vestidos",
          price: "89.90", sale_price: null, stock: "3", created_at: new Date(),
        },
      ],
    });

    // Act
    const result = await service.getAll();

    // Assert — null no debe convertirse en NaN ni en 0
    expect(result[0].sale_price).toBeNull();
  });

  // ── Test 9: update() sin id lanza error ───────────────────
  test("update() lanza error si no se envía el id", async () => {
    // Arrange
    const idVacio = undefined;

    // Act
    const act = () => service.update(idVacio, { price: 50 });

    // Assert
    await expect(act()).rejects.toThrow("El ID es obligatorio");
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  // ── Test 10: update() sin campos lanza error ──────────────
  test("update() lanza error si el objeto de datos está vacío", async () => {
    // Arrange — se envía un objeto vacío, sin campos para actualizar
    const dataVacia = {};

    // Act
    const act = () => service.update(5, dataVacia);

    // Assert
    await expect(act()).rejects.toThrow("No hay campos para actualizar");
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});
