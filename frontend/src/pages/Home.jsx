// src/pages/Home.jsx
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import CartSidebar from "../components/CartSidebar";
import { useProducts } from "../hooks/useApi";
import { yapeLogo, plinLogo, olvaLogo, shalomLogo } from "../lib/logos";

const CATALOG_CATS = ["Tops", "Partes de abajo", "Accesorios", "Zapatos"];

// ============ ANNOUNCEMENT BAR ============
const ANNOUNCEMENTS = [
  "🚚 Envíos a todo el Perú — Olva & Shalom",
  "✨ Nueva colección disponible",
  "💝 Moda kawaii hecha con amor para ti",
  "🐱 Síguenos en Instagram: @pookiecat.pe",
];

function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % ANNOUNCEMENTS.length);
      setKey(k => k + 1);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="announcement-bar">
      <span key={key} className="announcement-msg">{ANNOUNCEMENTS[idx]}</span>
    </div>
  );
}

// ============ HERO BANNER ============
function HeroBanner({ onShop }) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "92vh",
        background: "linear-gradient(150deg, #fce8f1 0%, #f9e0ea 45%, #f5dce6 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "4rem 2rem 5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div style={{
        position: "absolute", width: 700, height: 700,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(242,167,195,0.18) 0%, transparent 70%)",
        top: -250, right: -200, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 500, height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,96,127,0.1) 0%, transparent 70%)",
        bottom: -200, left: -150, pointerEvents: "none",
      }} />

      {/* Tag */}
      <p style={{
        animation: "heroFadeIn 0.7s ease forwards",
        opacity: 0,
        animationDelay: "0.05s",
        fontSize: "clamp(0.65rem, 1.5vw, 0.78rem)",
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: "var(--pink-dark)",
        marginBottom: "1.25rem",
        fontWeight: 600,
      }}>
        ✦ Nueva colección ✦
      </p>

      {/* Brand name */}
      <h1 style={{
        animation: "heroFadeIn 0.75s ease forwards",
        opacity: 0,
        animationDelay: "0.15s",
        fontSize: "clamp(4rem, 13vw, 10rem)",
        fontWeight: 700,
        color: "var(--dark)",
        lineHeight: 0.88,
        marginBottom: "1.5rem",
        letterSpacing: "-0.03em",
      }}>
        Pookiecat
      </h1>

      {/* Subtitle */}
      <p style={{
        animation: "heroFadeIn 0.75s ease forwards",
        opacity: 0,
        animationDelay: "0.28s",
        fontSize: "clamp(0.88rem, 2vw, 1.05rem)",
        color: "var(--gray)",
        marginBottom: "2.75rem",
        maxWidth: 360,
        lineHeight: 1.75,
      }}>
        Ropa kawaii confeccionada con amor para ti
      </p>

      {/* CTAs */}
      <div style={{
        animation: "heroFadeIn 0.75s ease forwards",
        opacity: 0,
        animationDelay: "0.42s",
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        <button
          onClick={onShop}
          style={{
            background: "var(--dark)", color: "white",
            border: "none", padding: "14px 34px",
            borderRadius: 999, fontFamily: "var(--font)",
            fontSize: "0.8rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--pink-dark)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--dark)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          Ver catálogo →
        </button>
        <a
          href="https://wa.me/51927112114?text=Hola!%20Quisiera%20consultar%20sobre%20un%20producto"
          target="_blank" rel="noopener noreferrer"
          style={{
            background: "transparent", color: "var(--dark)",
            border: "1.5px solid var(--dark)",
            padding: "14px 28px", borderRadius: 999,
            fontFamily: "var(--font)", fontSize: "0.8rem",
            fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", cursor: "pointer",
            transition: "all 0.2s", display: "inline-block",
            textDecoration: "none",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--dark)"; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--dark)"; }}
        >
          Consultar
        </a>
      </div>

      {/* Scroll cue */}
      <div
        onClick={onShop}
        style={{
          position: "absolute", bottom: "2rem",
          color: "var(--gray)", fontSize: "1.15rem",
          cursor: "pointer", animation: "bounceDown 2s infinite",
          userSelect: "none",
        }}
        title="Ver catálogo"
      >
        ↓
      </div>
    </div>
  );
}

// ============ NEW IN — Editorial grid ============
function NewInSection({ items, onSelect }) {
  if (items.length === 0) return null;
  const display = items.slice(0, 3);

  function getImg(p) {
    if (Array.isArray(p.image_urls) && p.image_urls.length > 0) return p.image_urls[0];
    if (p.image_url) return p.image_url;
    if (p.imageUrl) return p.imageUrl;
    return "";
  }

  return (
    <div style={{ background: "white", padding: "4.5rem 2rem 3.5rem" }} className="new-in-section">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--pink-dark)", marginBottom: 6 }}>Lo más nuevo</p>
            <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--dark)" }}>
              Destacados
            </h2>
          </div>
          <button
            onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              background: "none", border: "1.5px solid var(--border)", borderRadius: 999,
              padding: "9px 22px", fontFamily: "var(--font)", fontSize: "0.78rem",
              fontWeight: 600, color: "var(--dark)", cursor: "pointer",
              letterSpacing: "0.06em", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--dark)"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "var(--dark)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--dark)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            Ver todo →
          </button>
        </div>

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.25rem",
          alignItems: "start",
        }} className="new-in-grid">
          {display.map((p, idx) => {
            const img = getImg(p);
            const salePrice = p.salePrice || p.sale_price;
            const price = salePrice || p.price || 0;
            const isCenter = idx === 1;

            return (
              <div
                key={p.id}
                onClick={() => onSelect(p)}
                className="product-card-wrap"
                style={{
                  border: "none",
                  transform: isCenter ? "translateY(-10px)" : "none",
                }}
              >
                <div
                  className="product-img-wrap"
                  style={{ width: "100%", aspectRatio: "2/3", background: "var(--pink-light)" }}
                >
                  {img ? (
                    <img src={img} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                  ) : (
                    <div className="img-placeholder" style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>
                      {p.emoji || "👗"}
                    </div>
                  )}

                  {/* Badges */}
                  {p.badge === "preventa" && (
                    <span className="badge-status badge-preventa" style={{ position: "absolute", top: 10, left: 10, fontSize: "0.68rem" }}>PREVENTA</span>
                  )}
                  {salePrice && p.badge !== "preventa" && (
                    <span className="badge-status badge-sale" style={{ position: "absolute", top: 10, right: 10, fontSize: "0.68rem" }}>OFERTA</span>
                  )}
                  <div className="product-card-overlay">Ver producto</div>
                </div>

                <div style={{ padding: "0.85rem 0.75rem 1rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--gray)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.cat}</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 5, color: "var(--dark)" }}>{p.name}</div>
                  <div style={{ fontSize: "0.88rem" }}>
                    {salePrice ? (
                      <>
                        <span style={{ textDecoration: "line-through", color: "#aaa", marginRight: 6 }}>S/ {Number(p.price).toFixed(2)}</span>
                        <span style={{ color: "var(--danger)", fontWeight: 700 }}>S/ {Number(salePrice).toFixed(2)}</span>
                      </>
                    ) : (
                      <span style={{ fontWeight: 700 }}>S/ {Number(price).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ CATALOG — sidebar + pills mobile ============
function CatalogSection({ products, loading, onSelect, externalCat, onExternalCatConsumed }) {
  const [activeCat, setActiveCat] = useState("Todos");

  useEffect(() => {
    if (externalCat) {
      setActiveCat(externalCat);
      onExternalCatConsumed?.();
    }
  }, [externalCat]);

  const allCats = ["Todos", ...CATALOG_CATS];
  const filtered = activeCat === "Todos" ? products : products.filter(p => p.cat === activeCat);
  const grouped = CATALOG_CATS.map(c => ({
    cat: c, items: products.filter(p => p.cat === c),
  })).filter(g => g.items.length > 0);

  return (
    <div id="catalog" style={{ background: "white" }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.25rem 2rem 0" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--gray)", fontFamily: "var(--font)" }}>
          <span style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Inicio</span>
          {" / "}
          <span>Productos</span>
          {activeCat !== "Todos" && <span style={{ color: "var(--dark)", fontWeight: 600 }}> / {activeCat}</span>}
        </div>
      </div>

      {/* Mobile category pills */}
      <div className="cat-pills-mobile">
        {allCats.map(c => (
          <button
            key={c}
            className={`cat-pill${activeCat === c ? " active" : ""}`}
            onClick={() => setActiveCat(c)}
          >{c}</button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 2rem 4rem", display: "flex", gap: "2.5rem", alignItems: "flex-start" }} className="catalog-main-wrapper">

        {/* Desktop sidebar */}
        <div style={{ width: 155, flexShrink: 0, paddingTop: "0.5rem", position: "sticky", top: "90px" }} className="catalog-sidebar">
          <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--gray)", marginBottom: "1rem" }}>
            Categorías
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {allCats.map(c => (
              <button key={c} onClick={() => setActiveCat(c)} style={{
                display: "block", textAlign: "left",
                padding: "8px 0 8px 12px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font)",
                fontSize: "0.88rem",
                color: c === activeCat ? "var(--dark)" : "var(--gray)",
                fontWeight: c === activeCat ? 700 : 400,
                borderLeft: c === activeCat ? "2px solid var(--dark)" : "2px solid transparent",
                transition: "all .15s",
              }}
                onMouseEnter={e => { if (c !== activeCat) { e.currentTarget.style.color = "var(--dark)"; e.currentTarget.style.borderLeftColor = "var(--border)"; } }}
                onMouseLeave={e => { if (c !== activeCat) { e.currentTarget.style.color = "var(--gray)"; e.currentTarget.style.borderLeftColor = "transparent"; } }}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.2rem 0.8rem" }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ width: "100%", aspectRatio: "2/3", marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 14, marginBottom: 6, width: "75%" }} />
                  <div className="skeleton" style={{ height: 14, width: "45%" }} />
                </div>
              ))}
            </div>
          ) : activeCat !== "Todos" ? (
            filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🐱</div>
                No hay productos en esta categoría aún.
              </div>
            ) : (
              <div className="catalog-grid">
                {filtered.map(p => <ProductCard key={p.id} product={p} onClick={onSelect} variant="grid" />)}
              </div>
            )
          ) : (
            grouped.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray)" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🐱</div>
                No hay productos aún.
              </div>
            ) : (
              grouped.map(({ cat: catName, items }) => (
                <div key={catName} style={{ marginBottom: "3rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                    <h3 style={{
                      fontSize: "0.78rem", fontWeight: 700, fontFamily: "var(--font)",
                      textTransform: "uppercase", letterSpacing: ".1em", color: "var(--dark)",
                    }}>{catName}</h3>
                    <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                    <span style={{ fontSize: "0.75rem", color: "var(--gray)" }}>{items.length} producto{items.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="catalog-grid">
                    {items.map(p => <ProductCard key={p.id} product={p} onClick={onSelect} variant="grid" />)}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ============ TRUST BANNER ============
function TrustBanner() {
  const items = [
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="1" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      title: "Envíos a todo el Perú",
      desc: "Olva Courier · Shalom · Express",
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
      title: "Múltiples medios de pago",
      desc: "Yape · Plin · Transferencia bancaria",
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      title: "Atención personalizada",
      desc: "Respuesta rápida por WhatsApp",
    },
    {
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      title: "Hecho con amor",
      desc: "Prendas seleccionadas con cuidado",
    },
  ];

  return (
    <div style={{ background: "#fafafa", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "2.75rem 2rem" }} className="trust-banner">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Icon grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1.5rem",
          marginBottom: "2.5rem",
        }} className="trust-grid">
          {items.map((item, i) => (
            <div key={i} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "white", border: "1.5px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--pink-dark)",
              }}>
                {item.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--dark)" }}>{item.title}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--gray)", lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Payment / Shipping logos strip */}
        <div style={{
          borderTop: "1px solid var(--border)",
          paddingTop: "2rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "2.5rem",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gray)", marginRight: 6 }}>Pago</span>
            <img src={yapeLogo} alt="Yape" style={{ height: 36, borderRadius: 8, objectFit: "contain" }} />
            <img src={plinLogo} alt="Plin" style={{ height: 36, borderRadius: 8, objectFit: "contain" }} />
          </div>
          <div style={{ width: 1, height: 32, background: "var(--border)" }} className="hide-mobile" />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gray)", marginRight: 6 }}>Envío</span>
            <img src={olvaLogo} alt="Olva Courier" style={{ height: 30, borderRadius: 6, objectFit: "contain" }} />
            <img src={shalomLogo} alt="Shalom" style={{ height: 30, objectFit: "contain" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ FOOTER ============
function Footer() {
  const IconInstagram = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
  );
  const IconTiktok = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/></svg>
  );
  const IconWA = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  );

  const linkStyle = {
    fontSize: "0.85rem", opacity: 0.58, color: "white",
    textDecoration: "none", transition: "opacity 0.2s", cursor: "pointer",
    fontFamily: "var(--font)", lineHeight: 2,
  };

  return (
    <footer style={{ background: "var(--dark)", color: "white", padding: "3.5rem 2rem 2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr",
          gap: "3rem",
          marginBottom: "3rem",
        }} className="footer-grid">

          {/* Brand col */}
          <div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.85rem", letterSpacing: "-0.02em" }}>Pookiecat</h3>
            <p style={{ fontSize: "0.85rem", opacity: 0.55, lineHeight: 1.8, marginBottom: "1.25rem", maxWidth: 240 }}>
              Moda kawaii hecha con amor. Ropa confeccionada para chicas que aman el estilo japonés.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {[
                { href: "https://www.instagram.com/pookiecat.pe/", icon: <IconInstagram />, label: "Instagram" },
                { href: "https://www.tiktok.com/@pookiecat.pe", icon: <IconTiktok />, label: "TikTok" },
                { href: "https://wa.me/51927112114", icon: <IconWA />, label: "WhatsApp" },
              ].map(({ href, icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  title={label}
                  style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: "rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--pink-dark)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Categories col */}
          <div>
            <h5 style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "1rem", opacity: 0.45 }}>
              Categorías
            </h5>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {["Tops", "Partes de abajo", "Accesorios", "Zapatos"].map(cat => (
                <span key={cat} style={linkStyle}
                  onClick={() => {
                    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "0.58"}
                >{cat}</span>
              ))}
            </div>
          </div>

          {/* Contact col */}
          <div>
            <h5 style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "1rem", opacity: 0.45 }}>
              Contacto
            </h5>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <a href="https://wa.me/51927112114" target="_blank" rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.style.opacity = "0.58"}
              >WhatsApp: 927 112 114</a>
              <a href="https://www.instagram.com/pookiecat.pe/" target="_blank" rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.style.opacity = "0.58"}
              >Instagram: @pookiecat.pe</a>
              <a href="https://www.tiktok.com/@pookiecat.pe" target="_blank" rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                onMouseLeave={e => e.currentTarget.style.opacity = "0.58"}
              >TikTok: @pookiecat.pe</a>
              <span style={{ ...linkStyle, cursor: "default" }}>Lima, Perú</span>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.76rem", opacity: 0.38 }}>
            © 2025 Pookiecat · Todos los derechos reservados
          </p>
          <p style={{ fontSize: "0.76rem", opacity: 0.38 }}>
            Hecho con amor 🐱
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============ MAIN ============
export default function Home() {
  const { products, loading } = useProducts();
  const [selected, setSelected] = useState(null);
  const [showWsp, setShowWsp] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [navCat, setNavCat] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowWsp(window.scrollY > 400);
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const safeProducts = Array.isArray(products) ? products.filter(p => p.badge !== "descontinuado") : [];
  const newInItems = safeProducts.filter(p => p.featured);

  const scrollToCatalog = () => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      <AnnouncementBar />
      <Navbar onCatChange={(cat) => {
        setNavCat(cat);
        setTimeout(scrollToCatalog, 80);
      }} />
      <CartSidebar />

      <HeroBanner onShop={scrollToCatalog} />

      {!loading && newInItems.length > 0 && (
        <NewInSection items={newInItems} onSelect={setSelected} />
      )}

      <CatalogSection
        products={safeProducts}
        loading={loading}
        onSelect={setSelected}
        externalCat={navCat}
        onExternalCatConsumed={() => setNavCat(null)}
      />

      <TrustBanner />
      <Footer />

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}

      {/* WhatsApp FAB */}
      <a
        href="https://wa.me/51927112114?text=Hola!%20Quisiera%20consultar%20sobre%20un%20producto%20"
        target="_blank" rel="noopener noreferrer"
        style={{
          position: "fixed", bottom: "2rem", right: "2rem", zIndex: 9000,
          width: 58, height: 58, borderRadius: "50%",
          background: "#25D366", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          textDecoration: "none",
          opacity: showWsp ? 1 : 0,
          visibility: showWsp ? "visible" : "hidden",
          transform: showWsp ? "translateY(0) scale(1)" : "translateY(20px) scale(0.8)",
          boxShadow: "0 4px 20px rgba(37,211,102,.45)",
          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          animation: showWsp ? "waPulse 2.5s infinite" : "none",
        }}
        title="Consultas por WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

      {/* Scroll to top */}
      <button
        className="scroll-top-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        style={{
          opacity: showScrollTop ? 1 : 0,
          visibility: showScrollTop ? "visible" : "hidden",
          transform: showScrollTop ? "scale(1)" : "scale(0.8)",
        }}
        title="Volver arriba"
      >
        ↑
      </button>
    </>
  );
}
