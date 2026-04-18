// src/components/CartSidebar.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "../context/CartContext";

// ============ RATE LIMITER Y SANITIZACIÓN ============
const RATE_KEY_ORDER = "pookiecat_order_attempts";
const MAX_ORDERS = 3;
const WINDOW_MS_ORDER = 10 * 60 * 1000; // 10 minutos

function checkOrderRate() {
  try {
    const raw = sessionStorage.getItem(RATE_KEY_ORDER);
    const data = raw ? JSON.parse(raw) : { attempts: 0, firstAttempt: null };
    if (!data.firstAttempt) return { blocked: false };
    const elapsed = Date.now() - data.firstAttempt;
    if (elapsed > WINDOW_MS_ORDER) {
      sessionStorage.removeItem(RATE_KEY_ORDER);
      return { blocked: false };
    }
    if (data.attempts >= MAX_ORDERS) {
      return { blocked: true, waitMin: Math.ceil((WINDOW_MS_ORDER - elapsed) / 60000) };
    }
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

const sanitizeName = (val) => val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").slice(0, 80);
const sanitizeDni = (val) => val.replace(/[^\d]/g, "").slice(0, 8);
const sanitizePhone = (val) => val.replace(/[^\d]/g, "").slice(0, 9);
const sanitizeAddress = (val) => String(val).replace(/[<>'"`]/g, "").slice(0, 150);
const sanitizeText = (val) => String(val).replace(/[<>'"`]/g, "").slice(0, 200);
// =======================================================

export default function CartSidebar() {
  const { cart, updateQuantity, removeFromCart, total, count, isOpen, setIsOpen, saveOrder, sendToWhatsApp, clearCart } = useCart();
  const [step, setStep] = useState("cart");
  const [form, setForm] = useState({ name: "", dni: "", phone: "", address: "", reference: "", payment: "Yape / Plin", shipping: "Agencia Shalom" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Requerido";
    else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(form.name.trim())) e.name = "Solo letras";
    if (!form.dni.trim()) e.dni = "Requerido";
    else if (!/^\d{8}$/.test(form.dni.trim())) e.dni = "8 números";
    if (!form.phone.trim()) e.phone = "Requerido";
    else if (!/^\d{9}$/.test(form.phone.trim())) e.phone = "9 números";
    if (!form.address.trim()) e.address = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleOrder = async () => {
    if (!validate()) return;
    const rate = checkOrderRate();
    if (rate.blocked) {
      alert(`Demasiados pedidos en poco tiempo. Espera ${rate.waitMin} minuto${rate.waitMin > 1 ? "s" : ""} e intenta de nuevo.`);
      return;
    }
    registerOrder();
    setLoading(true);
    await saveOrder(form);
    sendToWhatsApp(form);
    clearCart();
    setIsOpen(false);
    setStep("cart");
    setForm({ name: "", dni: "", phone: "", address: "", reference: "", payment: "Yape / Plin", shipping: "Agencia Shalom" });
    setLoading(false);
  };

  const closeSidebar = () => { setIsOpen(false); setStep("cart"); };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div onClick={closeSidebar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.3)", zIndex: 9998 }} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 380, maxWidth: "100vw", background: "white", zIndex: 9999, display: "flex", flexDirection: "column", boxShadow: "-2px 0 20px rgba(0,0,0,.1)" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 600, fontSize: "0.9rem" }}>
          <span>MI CARRITO ({count})</span>
          <button onClick={closeSidebar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "#999" }}>✕</button>
        </div>

        {step === "cart" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 1.5rem" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#999" }}>Tu bolsa está vacía</div>
              ) : cart.map(item => (
                <div key={item.key} style={{ display: "flex", gap: 15, padding: "1rem 0", borderBottom: "1px solid #f5f5f5", alignItems: "center" }}>
                  <div style={{ width: 70, height: 85, background: "#f9f9f9", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }}>
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#777" }}>{[item.size, item.color].filter(Boolean).join(" | ")}</div>
                    {item.isBackorder && <div style={{ fontSize: "0.72rem", color: "#c77800", fontWeight: 600, marginTop: 2 }}>⚠️ A pedido</div>}
                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: 4, width: "fit-content", marginTop: 8 }}>
                      <button onClick={() => updateQuantity(item.key, item.qty - 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 10px" }}>-</button>
                      <span style={{ padding: "0 8px", fontSize: "0.9rem" }}>{item.qty}</span>
                      <button onClick={() => updateQuantity(item.key, item.qty + 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 10px" }}>+</button>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                     <button onClick={() => removeFromCart(item.key)} style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: "1.1rem" }}>✕</button>
                     <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: 15 }}>S/ {(item.price * item.qty).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: "1.5rem", borderTop: "1px solid #eee" }}>
                {cart.some(i => i.isBackorder) && (
                  <div style={{ background: "#fff8e6", border: "1px solid #ffd06a", borderRadius: 8, padding: "10px 12px", fontSize: "0.8rem", color: "#7a5500", marginBottom: "1rem", lineHeight: 1.5 }}>
                    ⚠️ Tienes productos <strong>a pedido</strong>. Los haremos especialmente para ti, por lo que el tiempo de entrega puede ser un poco mayor al habitual.
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: "1.25rem" }}>
                  <span>Total</span><span>S/ {total.toFixed(2)}</span>
                </div>
                <button className="btn btn-dark btn-full" onClick={() => setStep("form")}>PAGAR →</button>
              </div>
            )}
          </>
        )}

        {step === "form" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Nombre completo *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: sanitizeName(e.target.value) }))} />
                {errors.name && <span style={{color: "var(--danger)", fontSize: "0.8rem"}}>⚠ {errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">DNI / CE *</label>
                <input className="form-input" value={form.dni} onChange={e => setForm(p => ({ ...p, dni: sanitizeDni(e.target.value) }))} />
                {errors.dni && <span style={{color: "var(--danger)", fontSize: "0.8rem"}}>⚠ {errors.dni}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono *</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: sanitizePhone(e.target.value) }))} />
                {errors.phone && <span style={{color: "var(--danger)", fontSize: "0.8rem"}}>⚠ {errors.phone}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Método de envío</label>
                <select className="form-input" value={form.shipping} onChange={e => setForm(p => ({ ...p, shipping: e.target.value }))}>
                  <option>Agencia Shalom</option>
                  <option>Agencia Olva Courier</option>
                  <option>Olva Courier A Domicilio</option>
                  <option>Motorizado Express</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Dirección o Agencia de destino *</label>
                <input className="form-input" value={form.address} onChange={e => setForm(p => ({ ...p, address: sanitizeAddress(e.target.value) }))} />
                {errors.address && <span style={{color: "var(--danger)", fontSize: "0.8rem"}}>⚠ {errors.address}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Referencia (Opcional)</label>
                <input className="form-input" value={form.reference} onChange={e => setForm(p => ({ ...p, reference: sanitizeText(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Pago</label>
                <select className="form-input" value={form.payment} onChange={e => setForm(p => ({ ...p, payment: e.target.value }))}>
                  <option>Yape / Plin</option><option>Transferencia</option>
                </select>
              </div>
            </div>
            <div style={{ padding: "1.5rem", borderTop: "1px solid #eee" }}>
              <button onClick={handleOrder} disabled={loading} style={{ background: "#25D366", color: "white", border: "none", borderRadius: 8, padding: 14, fontWeight: 600, width: "100%" }}>
                {loading ? "Procesando..." : "📲 CONFIRMAR POR WHATSAPP"}
              </button>
              <button onClick={() => setStep("cart")} style={{ width: "100%", padding: 10, background: "none", border: "none", color: "#777", marginTop: 5 }}>← Volver</button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}