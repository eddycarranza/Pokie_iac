// src/components/CartSidebar.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "../context/CartContext";
import { createCharge } from "../lib/api";

// ============ RATE LIMITER Y SANITIZACION ============
const RATE_KEY_ORDER = "pookiecat_order_attempts";
const MAX_ORDERS = 3;
const WINDOW_MS_ORDER = 10 * 60 * 1000;

function checkOrderRate() {
  try {
    const raw = sessionStorage.getItem(RATE_KEY_ORDER);
    const data = raw ? JSON.parse(raw) : { attempts: 0, firstAttempt: null };
    if (!data.firstAttempt) return { blocked: false };
    const elapsed = Date.now() - data.firstAttempt;
    if (elapsed > WINDOW_MS_ORDER) { sessionStorage.removeItem(RATE_KEY_ORDER); return { blocked: false }; }
    if (data.attempts >= MAX_ORDERS) return { blocked: true, waitMin: Math.ceil((WINDOW_MS_ORDER - elapsed) / 60000) };
    return { blocked: false };
  } catch { return { blocked: false }; }
}

function registerOrder() {
  const raw = sessionStorage.getItem(RATE_KEY_ORDER);
  const data = raw ? JSON.parse(raw) : { attempts: 0, firstAttempt: null };
  sessionStorage.setItem(RATE_KEY_ORDER, JSON.stringify({
    attempts: data.attempts + 1,
    firstAttempt: data.firstAttempt || Date.now(),
  }));
}

const sanitizeName    = (v) => v.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").slice(0, 80);
const sanitizeDni     = (v) => v.replace(/[^\d]/g, "").slice(0, 8);
const sanitizePhone   = (v) => v.replace(/[^\d]/g, "").slice(0, 9);
const sanitizeAddress = (v) => String(v).replace(/[<>'"` + "`" + r`]/g, "").slice(0, 150);
const sanitizeText    = (v) => String(v).replace(/[<>'"` + "`" + r`]/g, "").slice(0, 200);
const sanitizeEmail   = (v) => String(v).replace(/[^a-zA-Z0-9@._+-]/g, "").slice(0, 100);
// =====================================================

export default function CartSidebar() {
  const { cart, updateQuantity, removeFromCart, total, count, isOpen, setIsOpen, saveOrder, sendToWhatsApp, clearCart } = useCart();
  const [step, setStep]       = useState("cart");
  const [form, setForm]       = useState({ name: "", dni: "", phone: "", email: "", address: "", reference: "", payment: "Yape / Plin", shipping: "Agencia Shalom" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [mpError, setMpError] = useState("");

  const isMP = form.payment === "MercadoPago";

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Requerido";
    else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.name.trim())) e.name = "Solo letras";
    if (!form.dni.trim()) e.dni = "Requerido";
    else if (!/^\d{8}$/.test(form.dni.trim())) e.dni = "8 numeros";
    if (!form.phone.trim()) e.phone = "Requerido";
    else if (!/^\d{9}$/.test(form.phone.trim())) e.phone = "9 numeros";
    if (!form.address.trim()) e.address = "Requerido";
    if (isMP) {
      if (!form.email.trim()) e.email = "Requerido para pago con MercadoPago";
      else if (!form.email.includes("@")) e.email = "Email invalido";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleOrder = async () => {
    if (!validate()) return;
    const rate = checkOrderRate();
    if (rate.blocked) { alert(`Demasiados pedidos. Espera ${rate.waitMin} minuto(s).`); return; }

    if (isMP) {
      await handleMercadoPago();
      return;
    }

    registerOrder();
    setLoading(true);
    await saveOrder(form);
    sendToWhatsApp(form);
    clearCart();
    setIsOpen(false);
    setStep("cart");
    setForm({ name: "", dni: "", phone: "", email: "", address: "", reference: "", payment: "Yape / Plin", shipping: "Agencia Shalom" });
    setLoading(false);
  };

  const handleMercadoPago = async () => {
    setMpError("");
    setLoading(true);
    try {
      const items = cart.map(item => ({
        title:      item.name,
        unit_price: Number(item.price),
        quantity:   Number(item.qty),
      }));

      const result = await createCharge({ items, email: form.email });

      // Guardar pedido en BD antes de redirigir
      registerOrder();
      await saveOrder(form);
      clearCart();

      // Redirigir al checkout de MercadoPago (sandbox en desarrollo)
      const url = result.sandbox_init_point || result.init_point;
      window.open(url, "_blank");
      setStep("success");
    } catch (err) {
      setMpError(err.message || "Error al conectar con MercadoPago.");
    } finally {
      setLoading(false);
    }
  };

  const closeSidebar = () => { setIsOpen(false); setStep("cart"); };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div onClick={closeSidebar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 9998 }} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 380, maxWidth: "100vw", background: "white", zIndex: 9999, display: "flex", flexDirection: "column", boxShadow: "-2px 0 20px rgba(0,0,0,.1)" }}>

        {/* Header */}
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600, fontSize: "0.9rem" }}>
          <span>MI CARRITO ({count})</span>
          <button onClick={closeSidebar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "#999" }}>x</button>
        </div>

        {/* PASO 1: Carrito */}
        {step === "cart" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 1.5rem" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#999" }}>Tu bolsa esta vacia</div>
              ) : cart.map(item => (
                <div key={item.key} style={{ display: "flex", gap: 15, padding: "1rem 0", borderBottom: "1px solid #f5f5f5", alignItems: "center" }}>
                  <div style={{ width: 70, height: 85, background: "#f9f9f9", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }}>
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#777" }}>{[item.size, item.color].filter(Boolean).join(" | ")}</div>
                    {item.isBackorder && <div style={{ fontSize: "0.72rem", color: "#c77800", fontWeight: 600, marginTop: 2 }}>A pedido</div>}
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, width: "fit-content", marginTop: 8 }}>
                      <button onClick={() => updateQuantity(item.key, item.qty - 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 10px" }}>-</button>
                      <span style={{ padding: "0 8px", fontSize: "0.9rem" }}>{item.qty}</span>
                      <button onClick={() => updateQuantity(item.key, item.qty + 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 10px" }}>+</button>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button onClick={() => removeFromCart(item.key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: "1.1rem" }}>x</button>
                    <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: 15 }}>S/ {(item.price * item.qty).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: "1.5rem", borderTop: "1px solid #eee" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: "1.25rem" }}>
                  <span>Total</span><span>S/ {total.toFixed(2)}</span>
                </div>
                <button className="btn btn-dark btn-full" onClick={() => setStep("form")}>CONTINUAR</button>
              </div>
            )}
          </>
        )}

        {/* PASO 2: Formulario */}
        {step === "form" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Nombre completo *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: sanitizeName(e.target.value) }))} />
                {errors.name && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">DNI / CE *</label>
                <input className="form-input" value={form.dni} onChange={e => setForm(p => ({ ...p, dni: sanitizeDni(e.target.value) }))} />
                {errors.dni && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{errors.dni}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Telefono *</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: sanitizePhone(e.target.value) }))} />
                {errors.phone && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Metodo de envio</label>
                <select className="form-input" value={form.shipping} onChange={e => setForm(p => ({ ...p, shipping: e.target.value }))}>
                  <option>Agencia Shalom</option>
                  <option>Agencia Olva Courier</option>
                  <option>Olva Courier A Domicilio</option>
                  <option>Motorizado Express</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Direccion o Agencia de destino *</label>
                <input className="form-input" value={form.address} onChange={e => setForm(p => ({ ...p, address: sanitizeAddress(e.target.value) }))} />
                {errors.address && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{errors.address}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Referencia (Opcional)</label>
                <input className="form-input" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: sanitizeText(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Metodo de pago</label>
                <select className="form-input" value={form.payment} onChange={e => setForm(p => ({ ...p, payment: e.target.value }))}>
                  <option>Yape / Plin</option>
                  <option>Transferencia</option>
                  <option>MercadoPago</option>
                </select>
              </div>
              {isMP && (
                <div className="form-group">
                  <label className="form-label">Email (para comprobante) *</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: sanitizeEmail(e.target.value) }))} placeholder="tu@email.com" />
                  {errors.email && <span style={{ color: "var(--danger)", fontSize: "0.8rem" }}>{errors.email}</span>}
                  <span style={{ fontSize: "0.75rem", color: "#888" }}>Te redirigiremos a MercadoPago para completar el pago.</span>
                </div>
              )}
              {mpError && (
                <div style={{ background: "#fff0f0", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 12px", fontSize: "0.82rem", color: "#c0392b" }}>
                  {mpError}
                </div>
              )}
            </div>
            <div style={{ padding: "1.5rem", borderTop: "1px solid #eee" }}>
              {isMP ? (
                <button onClick={handleOrder} disabled={loading} style={{ background: "#009EE3", color: "white", border: "none", borderRadius: 8, padding: 14, fontWeight: 600, width: "100%", fontSize: "0.95rem" }}>
                  {loading ? "Procesando..." : `PAGAR S/ ${total.toFixed(2)} CON MERCADOPAGO`}
                </button>
              ) : (
                <button onClick={handleOrder} disabled={loading} style={{ background: "#25D366", color: "white", border: "none", borderRadius: 8, padding: 14, fontWeight: 600, width: "100%" }}>
                  {loading ? "Procesando..." : "CONFIRMAR POR WHATSAPP"}
                </button>
              )}
              <button onClick={() => setStep("cart")} style={{ width: "100%", padding: 10, background: "none", border: "none", color: "#777", marginTop: 5 }}>Volver</button>
            </div>
          </>
        )}

        {/* PASO 3: Exito MercadoPago */}
        {step === "success" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎉</div>
            <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Pedido registrado</h3>
            <p style={{ color: "#555", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Se abrio MercadoPago en una nueva pestana. Completa el pago ahi. Tu pedido ya fue guardado.
            </p>
            <button onClick={closeSidebar} style={{ background: "#111", color: "white", border: "none", borderRadius: 8, padding: "12px 28px", fontWeight: 600 }}>
              LISTO
            </button>
          </div>
        )}

      </div>
    </>,
    document.body
  );
}
