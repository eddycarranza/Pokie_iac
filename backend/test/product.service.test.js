// ============================================================
// Tests de ProductService — TDD con Jest
// Se inyecta un mock del pool en lugar de la BD real,
// por lo que los tests corren sin Docker ni PostgreSQL.
// ============================================================

const ProductService = require("../src/services/productService");

describe("ProductService", () => {
  let service;
  let mockPool;

  // Antes de cada test: crear un pool falso y un servicio nuevo
  beforeEach(() => {
    mockPool = { query: jest.fn() };
    service  = new ProductService(mockPool);
  });

  // Limpiar mocks entre tests para no contaminar resultados
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Test 1: getAll devuelve productos con tipos numéricos ──
  test("getAll() devuelve productos con price y stock como números", async () => {
    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 1, name: "Gato Espacial", category: "Tops",
          price: "45.00", sale_price: null, stock: "20",
          created_at: new Date(),
        },
      ],
    });

    const result = await service.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].cat).toBe("Tops");
    expect(typeof result[0].price).toBe("number");
    expect(result[0].price).toBe(45);
    expect(typeof result[0].stock).toBe("number");
    expect(result[0].stock).toBe(20);
  });

  // ── Test 2: create con datos válidos llama a la BD ─────────
  test("create() inserta el producto y lo devuelve normalizado", async () => {
    const fila = {
      id: 5, name: "Vestido Rosa", category: "Tops",
      price: "59.90", sale_price: null, stock: "10",
      description: "", image_url: null, created_at: new Date(),
    };
    mockPool.query.mockResolvedValue({ rows: [fila] });

    const result = await service.create({
      name: "Vestido Rosa", category: "Tops", price: 59.9, stock: 10,
    });

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    expect(result.name).toBe("Vestido Rosa");
    expect(result.price).toBe(59.9);
    expect(result.cat).toBe("Tops");
  });

  // ── Test 3: create sin nombre lanza error de validación ────
  test("create() lanza error si el nombre está vacío", async () => {
    await expect(
      service.create({ name: "", category: "Tops", price: 50 })
    ).rejects.toThrow("El nombre es obligatorio");

    // No debe llamar a la BD si la validación falla
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  // ── Test 4: create con precio inválido lanza error ─────────
  test("create() lanza error si el precio es menor o igual a 0", async () => {
    await expect(
      service.create({ name: "Producto", category: "Tops", price: -5 })
    ).rejects.toThrow("El precio debe ser mayor a 0");

    expect(mockPool.query).not.toHaveBeenCalled();
  });

  // ── Test 5: getAll propaga error cuando la BD falla ────────
  test("getAll() propaga el error si la base de datos falla", async () => {
    mockPool.query.mockRejectedValue(new Error("connection refused"));

    await expect(service.getAll()).rejects.toThrow("connection refused");
  });
});
