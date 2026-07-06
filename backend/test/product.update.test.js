// ============================================================
// Tests de ProductService — update() y remove()
// Patrón AAA (Arrange - Act - Assert) en cada test.
// Librería: Jest.  BD: mock del pool inyectado (DI).
// No elimina ni depende de product.service.test.js.
// ============================================================

const ProductService = require("../src/services/productService");

describe("ProductService · update() y remove() (AAA)", () => {
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

  // ── Test 1: PATCH parcial NO sobrescribe campos ausentes ───
  test("update() con solo el precio actualiza únicamente ese campo", async () => {
    // Arrange
    const fila = {
      id: 7, name: "Gato Espacial", category: "Tops",
      price: "99.90", sale_price: null, stock: "20", created_at: new Date(),
    };
    mockPool.query.mockResolvedValue({ rows: [fila] });

    // Act
    const result = await service.update(7, { price: 99.9 });

    // Assert
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toContain("price=$1");     // solo el precio en el SET
    expect(sql).not.toContain("name=");    // no toca el nombre
    expect(sql).not.toContain("category="); // no toca la categoría
    expect(params).toEqual([99.9, 7]);     // valor + id, nada más
    expect(result.price).toBe(99.9);
  });

  // ── Test 2: validación de precio inválido en update ────────
  test("update() lanza error si el precio es menor o igual a 0", async () => {
    // Arrange
    const data = { price: -10 };

    // Act
    const act = () => service.update(7, data);

    // Assert
    await expect(act()).rejects.toThrow("El precio debe ser mayor a 0");
    expect(mockPool.query).not.toHaveBeenCalled(); // no llega a la BD
  });

  // ── Test 3: id inexistente devuelve "Producto no encontrado" ─
  test("update() lanza 'Producto no encontrado' si la BD no devuelve filas", async () => {
    // Arrange
    mockPool.query.mockResolvedValue({ rows: [] });

    // Act
    const act = () => service.update(999, { name: "Inexistente" });

    // Assert
    await expect(act()).rejects.toThrow("Producto no encontrado");
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  // ── Test 4: remove() ejecuta el DELETE con el id correcto ──
  test("remove() elimina el producto usando el id recibido", async () => {
    // Arrange
    mockPool.query.mockResolvedValue({ rows: [] });

    // Act
    await service.remove(4);

    // Assert
    expect(mockPool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).toContain("DELETE FROM products");
    expect(params).toEqual([4]);
  });

  // ── Test 5: remove() sin id no toca la BD y lanza error ────
  test("remove() lanza error si no se envía el id", async () => {
    // Arrange
    const idVacio = undefined;

    // Act
    const act = () => service.remove(idVacio);

    // Assert
    await expect(act()).rejects.toThrow("El ID es obligatorio");
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});
