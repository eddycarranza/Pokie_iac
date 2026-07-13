// src/pages/AdminDashboard.jsx
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useProducts, useOrders, useExpenses } from "../hooks/useApi";

import Logo from "../components/Logo";

// ============ SANITIZACIÓN ============
const sanitize = (val) => String(val).replace(/[<>'"`;]/g, "").replace(/javascript:/gi, "").trimStart();
const sanitizeText = (val) => sanitize(val).slice(0, 2000);
const sanitizeShort = (val) => sanitize(val).slice(0, 100);
const sanitizeNum = (val) => val.replace(/[^0-9.]/g, "").slice(0, 12);

// ============ CONFIGURACIÓN ============
const BUCKET = "products";
const CATS = ["Tops", "Pantalones", "Vestidos", "Accesorios", "Zapatos"];
const STATUSES = ["pendiente", "enviado", "entregado", "cancelado"];

// COLORES ORIGINALES
const COLOR_OPTIONS = [
  { name: "Pale Pink", hex: "hsl(337, 27%, 83%)" },
  { name: "White", hex: "#f0f0f0" },
  { name: "Black", hex: "rgb(34, 34, 34)" },
  { name: "Azul denim", hex: "#7eb0d4" },
  { name: "Light Brown", hex: "rgba(65, 47, 37, 0.86)" },
];

// Subida de imágenes: se usa URL directa (ej: S3 en producción).
// La función de upload a Supabase fue eliminada al migrar al backend propio.

function TagInput({ tags, onChange, placeholder }) {
  const [val, setVal] = useState("");
  const handleAdd = (e) => {
    if (e) e.preventDefault();
    const newTag = val.trim().replace(/,$/, ''); 
    if (newTag && !tags.includes(newTag)) { onChange([...tags, newTag]); }
    setVal(""); 
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAdd(); }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 8, border: "1.5px solid var(--border)", borderRadius: 10, minHeight: 44, background: "white", alignItems: "center" }}>
      {tags.map((t, i) => (
        <span key={i} style={{ background: "var(--dark)", color: "white", padding: "3px 10px", borderRadius: 999, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}>
          {t}
          <button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}>x</button>
        </span>
      ))}
      <input 
        value={val} onChange={e => setVal(e.target.value)} onKeyDown={handleKeyDown} placeholder={tags.length ? "" : placeholder}
        style={{ border: "none", outline: "none", fontSize: "0.85rem", flex: 1, minWidth: 80, fontFamily: "var(--font)", background: "transparent" }} 
      />
      {val.trim() && (
        <button type="button" onClick={handleAdd} style={{ background: "var(--pink-dark)", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, fontSize: "1.2rem", lineHeight: 1 }}>+</button>
      )}
    </div>
  );
}

function ImageUploader({ onUploaded }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmed = url.trim();
    if (!trimmed) { setError("Ingresa una URL válida"); return; }
    if (!trimmed.startsWith("http")) { setError("La URL debe comenzar con http:// o https://"); return; }
    onUploaded(trimmed);
    setUrl("");
    setError("");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="form-input"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://ejemplo.com/imagen.jpg"
          onKeyDown={e => e.key === "Enter" && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          style={{ background: "var(--dark)", color: "white", border: "none", padding: "0 16px", borderRadius: 8, cursor: "pointer", flexShrink: 0, fontFamily: "var(--font)", fontSize: "0.85rem" }}
        >Agregar</button>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginTop: 6 }}>{error}</p>}
      <p style={{ color: "var(--gray)", fontSize: "0.75rem", marginTop: 6 }}>
        Pega la URL pública de la imagen (AWS S3, Cloudinary, etc.)
      </p>
    </div>
  );
}

// ==========================================
// FORMULARIO CON GENERADOR ÚNICO Y BLINDADO
// ==========================================
function ProductForm({ initial, onSave, onCancel, isMobile }) {
  const [form, setForm] = useState(() => {
    if (!initial) {
      return { name: "", cat: "", price: "", salePrice: "", stock: 0, description: "", badge: "", featured: false, imageUrls: [], sizes: [], colors: [], variants: [], shipping_message: "" };
    }
    let urls = [];
    if (initial.image_urls && initial.image_urls.length > 0) urls = initial.image_urls;
    else if (initial.image_url || initial.imageUrl) urls = [initial.image_url || initial.imageUrl];

    const initialStock = parseInt(initial.stock, 10);
    return { 
      ...initial, 
      imageUrls: urls, 
      stock: isNaN(initialStock) ? 0 : initialStock,
      featured: initial.featured || false,
      sizes: initial.sizes || [],
      colors: initial.colors || [],
      variants: Array.isArray(initial.variants) ? initial.variants : [],
      shipping_message: initial.shipping_message || ""
    };
  });

  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleColor = (colorName) => {
    set("colors", form.colors.includes(colorName) ? form.colors.filter(c => c !== colorName) : [...form.colors, colorName]);
  };

  const handleGenerateVariants = () => {
    if (form.sizes.length === 0 && form.colors.length === 0) {
      return alert("Primero debes seleccionar al menos una Talla o un Color arriba para generar combinaciones.");
    }

    const sizesToUse = form.sizes.length > 0 ? form.sizes : ["Única"];
    const colorsToUse = form.colors.length > 0 ? form.colors : ["Único"];
    
    const currentVariants = [...(form.variants || [])];
    let itemsAdded = 0;

    sizesToUse.forEach(s => {
      colorsToUse.forEach(c => {
        const exists = currentVariants.some(v => v.size === s && v.color === c);
        
        if (!exists) {
          currentVariants.push({ size: s, color: c, stock: 0 });
          itemsAdded++;
        }
      });
    });

    set("variants", currentVariants);
    
    if (itemsAdded === 0) {
      alert("Las combinaciones seleccionadas ya están generadas en la tabla.");
    }
  };

  const handleVariantChange = (index, field, value) => {
    const newVariants = [...form.variants];
    newVariants[index][field] = field === "stock" ? Number(value) : value;
    set("variants", newVariants);
  };

  const handleRemoveVariant = (index) => {
    set("variants", form.variants.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.name || !form.cat || !form.price) return alert("Nombre, categoría y precio son obligatorios");
    setSaving(true);
    
    const totalStock = form.variants?.length > 0 
      ? form.variants.reduce((acc, curr) => acc + (curr.stock || 0), 0)
      : parseInt(form.stock, 10) || 0;
    
    await onSave({ 
      ...form, 
      price: parseFloat(form.price), 
      salePrice: form.salePrice ? parseFloat(form.salePrice) : null,
      stock: totalStock,
      variants: form.variants,
      featured: form.featured || false,
      shipping_message: form.shipping_message
    });
    setSaving(false);
  };

  return (
    <div className="card">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem" }}>
        
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Imágenes del producto (Puedes subir varias)</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {(form.imageUrls || []).map((img, i) => (
              <div key={i} style={{ position: 'relative', width: 100, height: 120 }}>
                <img src={img} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                <button type="button" onClick={() => setForm(p => ({...p, imageUrls: p.imageUrls.filter((_, index) => index !== i)}))} 
                  style={{ position: 'absolute', top: -8, right: -8, background: 'var(--danger)', color: 'white', borderRadius: '50%', width: 24, height: 24, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✕</button>
              </div>
            ))}
          </div>
          <ImageUploader onUploaded={url => set("imageUrls", [...(form.imageUrls || []), url])} />
        </div>

        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Nombre del producto *</label>
          <input className="form-input" value={form.name} onChange={e => set("name", sanitizeShort(e.target.value))} placeholder="Ej: Vestido Floral Rosa" />
        </div>
        
        <div className="form-group">
          <label className="form-label">Categoría *</label>
          <select className="form-input" value={form.cat} onChange={e => set("cat", e.target.value)}>
            <option value="">Seleccionar...</option>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Etiqueta (Badge)</label>
          <select className="form-input" value={form.badge || ""} onChange={e => set("badge", e.target.value)}>
            <option value="">Sin etiqueta</option><option value="new">Nuevo</option><option value="sale">Oferta</option><option value="preventa">Preventa</option><option value="descontinuado">Descontinuado</option>
          </select>
        </div>

        <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label className="form-label" style={{ margin: 0 }}>⭐ Destacado</label>
          <div
            onClick={() => set("featured", !form.featured)}
            style={{
              width: 44, height: 24, borderRadius: 999, cursor: "pointer", transition: "background .2s",
              background: form.featured ? "#1a1a1a" : "#d5d5d5",
              position: "relative", flexShrink: 0,
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: form.featured ? 23 : 3,
              width: 18, height: 18, borderRadius: "50%", background: "white",
              transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)",
            }} />
          </div>
          <span style={{ fontSize: "0.8rem", color: "#888" }}>
            {form.featured ? "Aparece en sección Destacados" : "No aparece en Destacados"}
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Precio (S/) *</label>
          <input className="form-input" type="number" step="0.01" value={form.price} onChange={e => set("price", sanitizeNum(e.target.value))} placeholder="89.90" />
        </div>
        
        <div className="form-group">
          <label className="form-label">Precio con oferta (S/)</label>
          <input className="form-input" type="number" step="0.01" value={form.salePrice || ""} onChange={e => set("salePrice", sanitizeNum(e.target.value))} placeholder="Dejar vacío si no hay" />
        </div>
        
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Descripción</label>
          <textarea 
            className="form-input" 
            value={form.description || ""} 
            onChange={e => set("description", sanitizeText(e.target.value))} 
            rows={7} 
            placeholder="Material, cuidados, detalles..." 
            style={{ resize: "vertical", minHeight: "150px" }} 
          />
        </div>

        {/* CAMPO NUEVO PARA EL MENSAJE PERSONALIZADO */}
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Mensaje personalizado en Vista de Producto (Opcional)</label>
          <textarea 
            className="form-input" 
            value={form.shipping_message || ""} 
            onChange={e => set("shipping_message", sanitizeText(e.target.value))} 
            rows={4} 
            placeholder="Ej: todos los productos tienen de 7 a 21 días (aprox) de demora a partir de la compra..." 
            style={{ resize: "vertical" }} 
          />
          <span style={{fontSize: "0.75rem", color: "var(--gray)"}}>Si lo dejas vacío, se mostrará el mensaje por defecto.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Tallas (Enter para agregar)</label>
          <TagInput tags={form.sizes || []} onChange={v => set("sizes", v)} placeholder="XS, S, M, 38, 39..." />
        </div>

        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Colores disponibles - clic para seleccionar</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "14px", background: "var(--gray-light)", borderRadius: 10 }}>
            {COLOR_OPTIONS.map(c => (
              <div key={c.name} onClick={() => toggleColor(c.name)} title={c.name} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer",
                opacity: form.colors.includes(c.name) ? 1 : 0.38,
                transform: form.colors.includes(c.name) ? "scale(1.12)" : "scale(1)", transition: "all .15s"
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", background: c.hex,
                  border: form.colors.includes(c.name) ? "3px solid var(--dark)" : "2px solid rgba(0,0,0,.12)",
                  boxShadow: form.colors.includes(c.name) ? "0 0 0 2px white, 0 0 0 4px var(--dark)" : "none", transition: "all .15s"
                }} />
                <span style={{ fontSize: "0.66rem", color: "var(--gray)", whiteSpace: "nowrap" }}>{c.name}</span>
              </div>
            ))}
          </div>
          {form.colors.length > 0 && (
            <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--gray)" }}>
              Seleccionados: <strong>{form.colors.join(", ")}</strong>
            </div>
          )}
        </div>

        <div style={{ gridColumn: "1/-1", background: "var(--gray-light)", border: "1px solid var(--border)", borderRadius: 12, padding: "1.5rem", marginTop: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Inventario Exacto</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--gray)", margin: "4px 0 0 0" }}>Selecciona tallas/colores arriba y dale click a generar.</p>
            </div>
            <button type="button" onClick={handleGenerateVariants} style={{ background: "var(--dark)", color: "white", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
              ⚡ Generar Combinaciones
            </button>
          </div>

          {(!form.variants || form.variants.length === 0) ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Stock General (Solo si no usas combinaciones)</label>
              <input type="number" className="form-input" style={{ maxWidth: 200 }} value={form.stock} onChange={e => set("stock", e.target.value)} placeholder="0" />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 40px", gap: "10px", fontSize: "0.8rem", fontWeight: 600, color: "var(--gray)", paddingBottom: "5px", borderBottom: "1px solid var(--border)" }}>
                <span>Talla</span>
                <span>Color</span>
                <span>Stock Disp.</span>
                <span></span>
              </div>
              {form.variants.map((v, index) => (
                <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px 40px", gap: "10px", alignItems: "center", padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
                  
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--dark)" }}>{v.size}</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--dark)" }}>{v.color}</span>
                  
                  <input className="form-input" type="number" placeholder="0" value={v.stock} onChange={e => handleVariantChange(index, "stock", e.target.value)} required min="0" style={{ padding: "6px" }} />
                  
                  <button type="button" onClick={() => handleRemoveVariant(index)} style={{ background: "var(--danger)", color: "white", border: "none", borderRadius: 8, height: "32px", cursor: "pointer", fontWeight: "bold" }} title="Eliminar esta variante">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button className="btn btn-dark" onClick={handleSave} disabled={saving} style={{ width: isMobile ? "100%" : "auto" }}>{saving ? "Guardando..." : "Guardar producto"}</button>
        <button className="btn btn-outline" onClick={onCancel} style={{ width: isMobile ? "100%" : "auto" }}>Cancelar</button>
      </div>
    </div>
  );
}

function OrderForm({ products, onSave, onCancel, isMobile }) {
  const [form, setForm] = useState({ client: "", phone: "", address: "", payment: "Yape / Plin", items: [], total: 0 });
  const addItem = (prod) => {
    const newItem = { id: prod.id, name: prod.name, price: prod.price, qty: 1 };
    setForm(p => ({ ...p, items: [...p.items, newItem], total: p.total + prod.price }));
  };
  const handleSave = () => {
    if (!form.client || !form.phone || form.items.length === 0) return alert("Completa cliente, teléfono e incluye productos");
    onSave(form);
  };
  return (
    <div className="card" style={{ border: "2px solid var(--pink-dark)", marginBottom: "1.5rem" }}>
      <h3 className="serif">Registrar Pedido Manual</h3>
      <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
        <input className="form-input" placeholder="Nombre del Cliente" value={form.client} onChange={e => setForm({...form, client: e.target.value})} />
        <input className="form-input" placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        <input className="form-input" placeholder="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
        <label className="form-label">Seleccionar Productos:</label>
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 10 }}>
          {products.map(p => <button key={p.id} onClick={() => addItem(p)} className="btn btn-outline btn-sm" style={{ whiteSpace: "nowrap" }}>+ {p.name}</button>)}
        </div>
        <div style={{ background: "var(--pink-light)", padding: 10, borderRadius: 8 }}>
          {form.items.map((it, i) => <div key={i} style={{ fontSize: "0.8rem" }}>{it.name} x{it.qty} - S/ {it.price.toFixed(2)}</div>)}
          <div style={{ fontWeight: "bold", marginTop: 5 }}>Total: S/ {form.total.toFixed(2)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10 }}>
          <button className="btn btn-dark" onClick={handleSave}>Guardar Pedido</button>
          <button className="btn btn-outline" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ============ BANNER PANEL ============
function BannerPanel({ showToast }) {
  const [bannerImgs, setBannerImgs] = useState([]);
  const [newUrl, setNewUrl] = useState("");

  const handleAdd = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    if (bannerImgs.length >= 3) { showToast("Máximo 3 imágenes en el banner"); return; }
    if (!trimmed.startsWith("http")) { showToast("La URL debe comenzar con http:// o https://"); return; }
    setBannerImgs(p => [...p, trimmed]);
    setNewUrl("");
    showToast("Imagen añadida al banner");
  };

  const handleRemove = (idx) => {
    setBannerImgs(p => p.filter((_, i) => i !== idx));
    showToast("Imagen eliminada del banner");
  };

  const handleMove = (idx, dir) => {
    const newImgs = [...bannerImgs];
    const target = idx + dir;
    if (target < 0 || target >= newImgs.length) return;
    [newImgs[idx], newImgs[target]] = [newImgs[target], newImgs[idx]];
    setBannerImgs(newImgs);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 className="serif" style={{ fontSize: "1.7rem", margin: 0 }}>Banner principal</h2>
          <p style={{ color: "var(--gray)", fontSize: "0.85rem", marginTop: 4 }}>Máximo 3 imágenes. Rotan automáticamente en la tienda.</p>
        </div>
      </div>

      {bannerImgs.length < 3 && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <label className="form-label">Agregar imagen por URL ({bannerImgs.length}/3)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="form-input"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="https://ejemplo.com/banner.jpg"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            <button
              onClick={handleAdd}
              style={{ background: "var(--dark)", color: "white", border: "none", padding: "0 16px", borderRadius: 8, cursor: "pointer", flexShrink: 0, fontFamily: "var(--font)", fontSize: "0.85rem" }}
            >+ Agregar</button>
          </div>
          <p style={{ color: "var(--gray)", fontSize: "0.75rem", marginTop: 6 }}>
            Pega la URL pública de la imagen (AWS S3, Cloudinary, etc.)
          </p>
        </div>
      )}

      {bannerImgs.length === 0 ? (
        <div style={{ border: "2px dashed var(--border)", borderRadius: 16, padding: "4rem", textAlign: "center", background: "white" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🖼️</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No hay imágenes en el banner</div>
          <div style={{ color: "var(--gray)", fontSize: "0.85rem" }}>Agrega URLs de imágenes usando el campo de arriba</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {bannerImgs.map((url, idx) => (
            <div key={idx} style={{ background: "white", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", position: "relative", background: "#f5f5f5" }}>
                <img src={url} alt={`Banner ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", color: "white", borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                  {idx + 1} / {bannerImgs.length}
                </div>
              </div>
              <div style={{ padding: "0.75rem 1rem", display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => handleMove(idx, -1)} disabled={idx === 0}
                  style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "none", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1, fontSize: "0.82rem" }}>← Anterior</button>
                <button onClick={() => handleMove(idx, 1)} disabled={idx === bannerImgs.length - 1}
                  style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "none", cursor: idx === bannerImgs.length - 1 ? "not-allowed" : "pointer", opacity: idx === bannerImgs.length - 1 ? 0.3 : 1, fontSize: "0.82rem" }}>Siguiente →</button>
                <button onClick={() => { if (window.confirm("¿Eliminar esta imagen del banner?")) handleRemove(idx); }}
                  style={{ padding: "7px 12px", border: "1px solid var(--danger)", borderRadius: 8, background: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {bannerImgs.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--gray)", marginBottom: "1rem" }}>Vista previa</div>
          <div style={{ width: "100%", aspectRatio: "21/9", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
            <img src={bannerImgs[0]} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray)", marginTop: 6 }}>* Vista previa de la primera imagen. En la tienda rotarán automáticamente.</div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const { products, loading: loadingProducts, addProduct, editProduct, removeProduct } = useProducts();
  const { orders, loading: loadingOrders, addOrder, editOrder, removeOrder } = useOrders();
  const { expenses, addExpense, removeExpense } = useExpenses();
  const [panel, setPanel] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState("");
  const [chartPeriod, setChartPeriod] = useState("semana"); 
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expForm, setExpForm] = useState({ description: "", amount: "", category: "Operativo" });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const handleLogout = async () => { await logout(); nav("/admin"); };

  const realRevenue = orders.filter(o => o.status === "entregado").reduce((s, o) => s + (o.total || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = realRevenue - totalExpenses;
  const pending = orders.filter(o => o.status === "pendiente").length;

  const getChartData = () => {
    const now = new Date();
    const delivered = orders.filter(o => o.status === "entregado" && o.created_at);
    if (chartPeriod === "dia") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString("es-PE", { weekday: "short" });
        const total = delivered.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).reduce((s, o) => s + (o.total || 0), 0);
        return { label, total };
      });
    } else if (chartPeriod === "semana") {
      return Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - (3 - i) * 7 - weekStart.getDay());
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
        const label = `Sem ${i + 1}`;
        const total = delivered.filter(o => { const od = new Date(o.created_at); return od >= weekStart && od <= weekEnd; }).reduce((s, o) => s + (o.total || 0), 0);
        return { label, total };
      });
    } else {
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now); d.setMonth(d.getMonth() - (5 - i));
        const label = d.toLocaleDateString("es-PE", { month: "short" });
        const total = delivered.filter(o => { const od = new Date(o.created_at); return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear(); }).reduce((s, o) => s + (o.total || 0), 0);
        return { label, total };
      });
    }
  };

  const topProducts = () => {
    const counts = {};
    orders.filter(o => o.status !== "cancelado").forEach(o => {
      (o.items || []).forEach(item => { counts[item.name] = (counts[item.name] || 0) + (item.qty || 1); });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const handleAddExpense = async () => {
    if (!expForm.description || !expForm.amount) return showToast("Completa descripción y monto");
    await addExpense({ description: expForm.description, amount: parseFloat(expForm.amount), category: expForm.category });
    setExpForm({ description: "", amount: "", category: "Operativo" });
    setShowExpenseForm(false);
    showToast("Egreso registrado ✓");
  };

  const handleSaveProduct = async (data) => {
    const productData = {
      name: data.name, category: data.cat, price: data.price, sale_price: data.salePrice || null,
      description: data.description || "", badge: data.badge || null,
      sizes: data.sizes || [], colors: data.colors || [],
      image_urls: data.imageUrls || [],
      image_url: (data.imageUrls && data.imageUrls.length > 0) ? data.imageUrls[0] : null,
      stock: data.stock || 0,
      variants: data.variants || [],
      shipping_message: data.shipping_message || null,
      featured: data.featured || false,
    };
    if (editing && editing !== "new") { await editProduct(editing.id, productData); showToast("Producto actualizado ✓"); }
    else { await addProduct(productData); showToast("Producto agregado ✓"); }
    setEditing(null); setPanel("productos");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Eliminar este producto?")) return;
    await removeProduct(id); showToast("Producto eliminado");
  };

  const handleStatusChange = async (order, newStatus) => {
    await editOrder(order.id, { status: newStatus });
    // Si el pedido se marca como entregado, descontamos stock via API
    if (newStatus === "entregado" && order.status !== "entregado") {
      for (const item of order.items || []) {
        const found = products.find(p => p.id === item.id);
        if (found) {
          await editProduct(item.id, {
            stock: Math.max((found.stock || 0) - (item.qty || 1), 0)
          });
        }
      }
      showToast(`Pedido entregado. Inventario actualizado ✓`);
    } else {
      showToast(`Pedido actualizado a ${newStatus}`);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm("¿Eliminar este pedido permanentemente?")) return;
    await removeOrder(id); showToast("Pedido eliminado ✓");
  };

  return (
    <div style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : "row", gridTemplateColumns: isMobile ? "none" : "220px 1fr", minHeight: "100vh" }}>
      
      {isMobile && (
        <div style={{ background: "var(--dark)", color: "white", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1000 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={24} />
            <span className="serif" style={{ fontSize: "1.1rem" }}>Pookiecat Admin</span>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer", lineHeight: 1 }}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      )}

      <aside style={{ 
        background: "var(--dark)", color: "white", padding: "1.5rem", 
        display: isMobile ? (menuOpen ? "flex" : "none") : "flex", 
        flexDirection: "column", gap: "0.4rem",
        position: isMobile ? "fixed" : "sticky", top: isMobile ? 64 : 0, left: 0, bottom: 0, 
        width: isMobile ? "250px" : "auto", height: isMobile ? "calc(100vh - 64px)" : "100vh", 
        zIndex: 999, boxShadow: isMobile && menuOpen ? "4px 0 20px rgba(0,0,0,0.5)" : "none"
      }}>
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "2rem" }}>
            <Logo size={30} />
            <span className="serif" style={{ fontSize: "1.1rem" }}>Pookiecat</span>
          </div>
        )}
        {[{ key: "dashboard", icon: "📊", label: "Dashboard" }, { key: "productos", icon: "👗", label: "Productos" }, { key: "pedidos", icon: "📦", label: "Pedidos" }, { key: "egresos", icon: "💸", label: "Egresos" }, { key: "banner", icon: "🖼️", label: "Banner" }].map(item => (
          <button key={item.key} onClick={() => { setPanel(item.key); setEditing(null); if(isMobile) setMenuOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: 10, background: panel === item.key ? "rgba(255,255,255,.12)" : "none",
            border: "none", color: panel === item.key ? "white" : "rgba(255,255,255,.55)",
            padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: "0.88rem", width: "100%", textAlign: "left"
          }}>{item.icon} {item.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => nav("/")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", color: "rgba(255,255,255,.55)", padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: "0.88rem", width: "100%", textAlign: "left" }}>
          🏠 Ver tienda
        </button>
        <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", color: "rgba(255,255,255,.4)", padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: "0.85rem", width: "100%", textAlign: "left" }}>
          Cerrar sesión
        </button>
      </aside>

      {isMobile && menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, top: 64, background: "rgba(0,0,0,0.5)", zIndex: 998 }} />}

      <main style={{ padding: isMobile ? "1rem" : "2rem", background: "#f8f6f3", flex: 1, overflowY: "auto", minWidth: 0 }}>
        {panel === "dashboard" && (() => {
          const chartData = getChartData();
          const maxVal = Math.max(...chartData.map(d => d.total), 1);
          const top = topProducts();
          return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
              <h2 className="serif" style={{ fontSize: "1.7rem", margin: 0 }}>Dashboard</h2>
              <span style={{ fontSize: "0.82rem", color: "var(--gray)" }}>{new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Productos", value: products.length, sub: "en catálogo", color: "var(--dark)" },
                { label: "Pedidos totales", value: orders.length, sub: "registrados", color: "var(--dark)" },
                { label: "Pendientes", value: pending, sub: "por atender", color: pending > 0 ? "var(--warning)" : "var(--dark)" },
                { label: "Ingresos reales", value: `S/ ${realRevenue.toFixed(2)}`, sub: "solo entregados", color: "var(--success)" },
                { label: "Egresos", value: `S/ ${totalExpenses.toFixed(2)}`, sub: "gastos", color: "var(--danger)" },
                { label: "Ganancia neta", value: `S/ ${netProfit.toFixed(2)}`, sub: "ingresos - egresos", color: netProfit >= 0 ? "var(--success)" : "var(--danger)" },
              ].map(s => (
                <div key={s.label} style={{ background: "white", borderRadius: 12, padding: "1.1rem", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--gray)", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--gray)", marginTop: 2 }}>↑ {s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Ventas (entregados)</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["dia", "semana", "mes"].map(p => (
                      <button key={p} onClick={() => setChartPeriod(p)} style={{
                        padding: "4px 10px", borderRadius: 999, border: "1px solid var(--border)",
                        background: chartPeriod === p ? "var(--dark)" : "white", color: chartPeriod === p ? "white" : "var(--gray)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "var(--font)",
                      }}>{p}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                  {chartData.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                        <div style={{ width: "100%", height: `${maxVal > 0 ? (d.total / maxVal) * 100 : 0}%`, minHeight: d.total > 0 ? 4 : 0, background: d.total > 0 ? "var(--pink-dark)" : "var(--border)", borderRadius: "4px 4px 0 0", transition: "height .3s ease", position: "relative" }}>
                          {d.total > 0 && ( <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: "0.62rem", color: "var(--gray)", whiteSpace: "nowrap" }}>S/{d.total.toFixed(0)}</div> )}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.68rem", color: "var(--gray)" }}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "1rem" }}>Ingresos vs Egresos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[{ label: "Ingresos reales", value: realRevenue, color: "var(--success)" }, { label: "Egresos", value: totalExpenses, color: "var(--danger)" }, { label: "Ganancia neta", value: netProfit, color: netProfit >= 0 ? "var(--success)" : "var(--danger)" }].map(item => (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--gray)" }}>{item.label}</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: item.color }}>S/ {item.value.toFixed(2)}</span>
                      </div>
                      <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 999, background: item.color, width: `${realRevenue > 0 ? Math.min(Math.abs(item.value) / Math.max(realRevenue, totalExpenses) * 100, 100) : 0}%`, transition: "width .5s ease" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "1.25rem", padding: "0.75rem", background: netProfit >= 0 ? "#d1e7dd" : "#f8d7da", borderRadius: 8 }}>
                  <div style={{ fontSize: "0.75rem", color: netProfit >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>
                    {netProfit >= 0 ? "✓ En positivo" : "⚠ En negativo"} — Margen: {realRevenue > 0 ? ((netProfit / realRevenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1.5rem" }}>
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "1rem" }}>Productos más vendidos</div>
                {top.length === 0 ? (<p style={{ color: "var(--gray)", fontSize: "0.85rem" }}>Sin datos aún</p>) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {top.map(([name, qty], i) => (
                      <div key={name}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: i === 0 ? 600 : 400 }}>{i === 0 ? "🏆 " : `${i + 1}. `}{name}</span>
                          <span style={{ fontSize: "0.78rem", color: "var(--gray)" }}>{qty} uds</span>
                        </div>
                        <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 999, background: i === 0 ? "var(--pink-dark)" : "var(--border)", width: `${(qty / top[0][1]) * 100}%`, transition: "width .4s ease", backgroundImage: i === 0 ? "none" : "linear-gradient(90deg, var(--pink-dark) 0%, var(--pink) 100%)", backgroundColor: i === 0 ? "var(--pink-dark)" : "var(--pink-light)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "0.9rem" }}>Últimos pedidos</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "400px" }}>
                    <thead><tr>{["Pedido", "Cliente", "Total", "Estado"].map(h => (<th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "0.7rem", textTransform: "uppercase", color: "var(--gray)", background: "#f8f6f3", borderBottom: "1px solid var(--border)" }}>{h}</th>))}</tr></thead>
                    <tbody>
                      {orders.slice(0, 5).map(o => (
                        <tr key={o.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "9px 12px", fontSize: "0.82rem", fontWeight: 500 }}>#{o.id?.slice(-6)}</td>
                          <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>{o.client}</td>
                          <td style={{ padding: "9px 12px", fontSize: "0.82rem" }}>S/ {o.total?.toFixed(2)}</td>
                          <td style={{ padding: "9px 12px" }}><span className={`badge-status badge-${o.status}`}>{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
          );
        })()}

        {panel === "productos" && !editing && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
              <h2 className="serif" style={{ fontSize: "1.7rem", margin: 0 }}>Productos</h2>
              <button className="btn btn-dark btn-sm" onClick={() => setEditing("new")}>+ Nuevo producto</button>
            </div>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "750px" }}>
                <thead><tr>{["Producto", "Categoría", "Stock", "Precio", "Variantes", "Acciones"].map(h => (<th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--gray)", background: "#f8f6f3", borderBottom: "1px solid var(--border)" }}>{h}</th>))}</tr></thead>
                <tbody>
                  {products.map(p => {
                    const firstImage = p.image_urls?.[0] || p.image_url || p.imageUrl;
                    const rawStock = parseInt(p.stock, 10);
                    const safeStock = isNaN(rawStock) ? 0 : rawStock;
                    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;

                    return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 42, height: 48, background: "var(--pink-light)", borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                            {firstImage ? <img src={firstImage} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : p.emoji || "👗"}
                          </div>
                          <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: "0.88rem" }}>{p.cat}</td>
                      <td style={{ padding: "11px 14px", fontSize: "0.88rem", color: safeStock <= 0 ? "var(--danger)" : "var(--dark)", fontWeight: safeStock <= 0 ? "bold" : "normal" }}>
                        {safeStock}
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: "0.88rem" }}>S/ {p.price?.toFixed(2)}{p.sale_price && <div style={{ color: "var(--danger)", fontSize: "0.78rem" }}>→ S/ {p.sale_price.toFixed(2)}</div>}</td>
                      <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "var(--gray)" }}>
                        {hasVariants ? <span style={{ background: "#e6f7ff", color: "#0050b3", padding: "4px 8px", borderRadius: 4, fontWeight: "bold" }}>{p.variants.length} comb.</span> : "-"}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditing(p)}>Editar</button>
                          <button className="btn btn-sm" style={{ border: "1px solid var(--danger)", color: "var(--danger)", background: "none", borderRadius: 999, padding: "5px 12px", fontSize: "0.82rem", cursor: "pointer" }} onClick={() => handleDelete(p.id)}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
              {products.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "var(--gray)" }}>No hay productos aún.</div>}
            </div>
          </>
        )}

        {panel === "productos" && editing && editing !== "new_order" && (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 className="serif" style={{ fontSize: "1.7rem", margin: 0 }}>{editing === "new" ? "Nuevo Producto" : "Editar Producto"}</h2>
            </div>
            <ProductForm initial={editing !== "new" ? editing : undefined} onSave={handleSaveProduct} onCancel={() => setEditing(null)} isMobile={isMobile} />
          </>
        )}

        {panel === "pedidos" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 className="serif" style={{ fontSize: "1.7rem", margin: 0 }}>Pedidos</h2>
              <button className="btn btn-dark btn-sm" onClick={() => setEditing(editing === "new_order" ? null : "new_order")}>
                {editing === "new_order" ? "✕ Cancelar" : "+ Crear Pedido Manual"}
              </button>
            </div>

            {editing === "new_order" ? (
              <OrderForm 
                products={products} 
                onCancel={() => setEditing(null)} 
                onSave={async (data) => {
                  await addOrder({ ...data, status: "pendiente", created_at: new Date().toISOString() });
                  setEditing(null); showToast("Pedido registrado ✓");
                }} 
                isMobile={isMobile}
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {orders.length === 0 && <div style={{ textAlign: "center", padding: "3rem", color: "var(--gray)", background: "white", borderRadius: 12, border: "1px solid var(--border)" }}>No hay pedidos aún.</div>}
                {orders.map(o => (
                  <div key={o.id} style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: "0.95rem" }}>#{o.id?.slice(-6)} - {o.client}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--gray)", marginTop: 2 }}>Tel: {o.phone} | Dir: {o.address}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--gray)" }}>Pago: {o.payment}</div>
                      </div>
                      <div style={{ textAlign: isMobile ? "left" : "right" }}>
                        <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>S/ {o.total?.toFixed(2)}</div>
                        <span className={`badge-status badge-${o.status}`} style={{ marginTop: 4, display: "inline-block" }}>{o.status}</span>
                        <div style={{ marginTop: 8 }}>
                          <button onClick={() => handleDeleteOrder(o.id)} style={{ background: "none", border: "1px solid var(--danger)", color: "var(--danger)", padding: "2px 8px", borderRadius: 5, fontSize: "0.7rem", cursor: "pointer" }}>Eliminar</button>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ fontSize: "0.82rem", color: "var(--gray)" }}>
                        {o.items?.map((i, idx) => (<span key={idx}>{i.name}{i.size ? ` (${i.size})` : ""} x{i.qty}{idx < o.items.length - 1 ? " · " : ""}</span>))}
                      </div>
                      <select className="form-input" style={{ width: isMobile ? "100%" : "auto", padding: "6px 12px", fontSize: "0.82rem" }} value={o.status} onChange={e => handleStatusChange(o, e.target.value)}>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {panel === "egresos" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 10 }}>
              <h2 className="serif" style={{ fontSize: "1.7rem", margin: 0 }}>Egresos</h2>
              <button className="btn btn-dark btn-sm" onClick={() => setShowExpenseForm(p => !p)}>
                {showExpenseForm ? "✕ Cancelar" : "+ Registrar egreso"}
              </button>
            </div>

            {showExpenseForm && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", padding: "1.25rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                  <div className="form-group">
                    <label className="form-label">Descripción *</label>
                    <input className="form-input" placeholder="Ej: Compra de telas" value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: sanitizeShort(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto (S/) *</label>
                    <input className="form-input" type="number" step="0.01" placeholder="0.00" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: sanitizeNum(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select className="form-input" value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))}>
                      <option>Operativo</option><option>Insumos</option><option>Transporte</option><option>Marketing</option><option>Servicios</option><option>Otro</option>
                    </select>
                  </div>
                  <button className="btn btn-dark" onClick={handleAddExpense} style={{ height: 42, width: isMobile ? "100%" : "auto" }}>Guardar</button>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "white", borderRadius: 12, padding: "1.1rem", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--gray)", marginBottom: 4 }}>Total egresos</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--danger)" }}>S/ {expenses.reduce((s, e) => s + (e.amount || 0), 0).toFixed(2)}</div>
              </div>
              <div style={{ background: "white", borderRadius: 12, padding: "1.1rem", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--gray)", marginBottom: 4 }}>Ingresos reales</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success)" }}>S/ {realRevenue.toFixed(2)}</div>
              </div>
              <div style={{ background: "white", borderRadius: 12, padding: "1.1rem", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--gray)", marginBottom: 4 }}>Ganancia neta</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>S/ {netProfit.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: 12, border: "1px solid var(--border)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                <thead><tr>{["Descripción", "Categoría", "Monto", "Fecha", ""].map(h => (<th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase", color: "var(--gray)", background: "#f8f6f3", borderBottom: "1px solid var(--border)" }}>{h}</th>))}</tr></thead>
                <tbody>
                  {expenses.length === 0 && (<tr><td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "var(--gray)" }}>No hay egresos registrados aún.</td></tr>)}
                  {expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "11px 14px", fontSize: "0.88rem", fontWeight: 500 }}>{e.description}</td>
                      <td style={{ padding: "11px 14px" }}><span style={{ background: "var(--gray-light)", padding: "3px 10px", borderRadius: 999, fontSize: "0.75rem" }}>{e.category}</span></td>
                      <td style={{ padding: "11px 14px", fontSize: "0.88rem", color: "var(--danger)", fontWeight: 600 }}>S/ {e.amount?.toFixed(2)}</td>
                      <td style={{ padding: "11px 14px", fontSize: "0.82rem", color: "var(--gray)" }}>{e.created_at ? new Date(e.created_at).toLocaleDateString("es-PE") : "—"}</td>
                      <td style={{ padding: "11px 14px" }}><button onClick={() => { if(window.confirm("¿Eliminar este egreso?")) { removeExpense(e.id); showToast("Egreso eliminado"); } }} style={{ background: "none", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: "0.75rem" }}>Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {panel === "banner" && <BannerPanel showToast={showToast} />}
      </main>

      {toast && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: "var(--dark)", color: "white", padding: "12px 20px", borderRadius: 12, zIndex: 9999, fontSize: "0.88rem" }}>
          {toast}
        </div>
      )}
    </div>
  );
}