// src/pages/Home.jsx
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import CartSidebar from "../components/CartSidebar";
import { useProducts } from "../hooks/useApi";
import { yapeLogo, plinLogo, olvaLogo, shalomLogo } from "../lib/logos";

const CATALOG_CATS = ["Tops", "Partes de abajo", "Accesorios", "Zapatos"];

// ============ HERO BANNER ============

// ============ HERO BANNER ============
function HeroBanner({ onShop }) {
  const [imgs, setImgs] = useState([]);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Usar fetch directo igual que el resto del proyecto
    const url = `${process.env.REACT_APP_SUPABASE_URL}/rest/v1/settings?key=eq.banner_images&select=value&limit=1`;
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
    fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data[0]?.value) {
          try { setImgs(JSON.parse(data[0].value)); } catch (e) {}
        }
      })
      .catch(() => {}); // Si la tabla no existe, muestra fondo rosa
  }, []);

  useEffect(() => {
    if (imgs.length <= 1) return;
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => { setCurrent(p => (p + 1) % imgs.length); setAnimating(false); }, 400);
    }, 4500);
    return () => clearInterval(timer);
  }, [imgs]);

  const goTo = (i) => {
    if (i === current) return;
    setAnimating(true);
    setTimeout(() => { setCurrent(i); setAnimating(false); }, 400);
  };

  // Sin imágenes: bloque rosa simple
  if (imgs.length === 0) {
    return (
      <div
        onClick={onShop}
        style={{ width: "100%", height: "94vh", minHeight: 400, background: "#f5e6ea", cursor: "pointer" }}
      />
    );
  }

  return (
    <div
      style={{
        position: "relative", width: "100%",
        overflow: "hidden", background: "#f5e6ea", cursor: "pointer",
      }}
      onClick={onShop}
    >
      {/* Imagen activa — se adapta al tamaño natural de la foto */}
      <img
        src={imgs[current]}
        alt="Banner"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          opacity: animating ? 0 : 1,
          transition: "opacity .5s ease",
        }}
      />

      {/* Dots de navegación */}
      {imgs.length > 1 && (
        <div style={{
          position: "absolute", bottom: "1.2rem", left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 8, zIndex: 3,
        }}
          onClick={e => e.stopPropagation()}
        >
          {imgs.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{
              width: i === current ? 28 : 8, height: 8, borderRadius: 999, border: "none",
              cursor: "pointer", padding: 0,
              background: i === current ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.25)",
              transition: "all .35s ease",
            }} />
          ))}
        </div>
      )}

      {/* Flechas */}
      {imgs.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); goTo((current - 1 + imgs.length) % imgs.length); }}
            style={{
              position: "absolute", left: "1.2rem", top: "50%", transform: "translateY(-50%)",
              width: 40, height: 40, borderRadius: "50%", border: "none", zIndex: 3,
              background: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: "1.4rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >‹</button>
          <button
            onClick={e => { e.stopPropagation(); goTo((current + 1) % imgs.length); }}
            style={{
              position: "absolute", right: "1.2rem", top: "50%", transform: "translateY(-50%)",
              width: 40, height: 40, borderRadius: "50%", border: "none", zIndex: 3,
              background: "rgba(255,255,255,0.8)", cursor: "pointer", fontSize: "1.4rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >›</button>
        </>
      )}
    </div>
  );
}

// ============ NEW IN — grid 3 columnas estilo imagen 3 ============
function NewInCarousel({ items, onSelect }) {
  // Mostrar solo los primeros 3
  const display = items.slice(0, 3);

  return (
    <div style={{ background: "white", padding: "4rem 2rem 3rem" }} className="new-in-section">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 className="serif" style={{ fontSize: "2rem", textAlign: "center", marginBottom: "2.5rem", fontWeight: 400, letterSpacing: ".04em" }}>
          Destacados
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}>
          {display.map((p, idx) => {
            // Card central levemente más grande (como imagen 3)
            const isCenter = idx === 1;
            let image = "";
            if (Array.isArray(p.image_urls) && p.image_urls.length > 0) image = p.image_urls[0];
            else if (p.image_url) image = p.image_url;
            else if (p.imageUrl) image = p.imageUrl;

            const salePrice = p.salePrice || p.sale_price;
            const price = salePrice || p.price || 0;

            return (
              <div
                key={p.id}
                onClick={() => onSelect(p)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transform: isCenter ? "scale(1.04)" : "scale(1)",
                  transition: "transform .25s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = isCenter ? "scale(1.07)" : "scale(1.03)"}
                onMouseLeave={e => e.currentTarget.style.transform = isCenter ? "scale(1.04)" : "scale(1)"}
              >
                {/* Imagen sin bordes, sin card */}
                <div style={{
                  width: "100%",
                  aspectRatio: "2/3",
                  overflow: "hidden",
                  borderRadius: "4px",
                  background: "#f5f5f5",
                }}>
                  {image ? (
                    <img src={image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>
                      {p.emoji || "👗"}
                    </div>
                  )}
                </div>
                {/* Info debajo */}
                <div style={{ textAlign: "center", marginTop: "0.75rem", width: "100%" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 500, fontFamily: "var(--font)", marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: "0.88rem", color: "#555", fontFamily: "var(--font)" }}>
                    {salePrice ? (
                      <>
                        <span style={{ textDecoration: "line-through", color: "#aaa", marginRight: 6 }}>S/ {Number(p.price).toFixed(2)}</span>
                        <span style={{ color: "#e00" }}>S/ {Number(salePrice).toFixed(2)}</span>
                      </>
                    ) : `S/ ${Number(price).toFixed(2)}`}
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

// ============ CATALOG — estilo imagen 2: sidebar izq + grid derecho ============
function CatalogSection({ products, loading, onSelect, externalCat, onExternalCatConsumed }) {
  const [activeCat, setActiveCat] = useState("Todos");

  // Cuando llega una categoría desde el navbar, aplicarla
  useEffect(() => {
    if (externalCat) {
      setActiveCat(externalCat);
      onExternalCatConsumed?.();
    }
  }, [externalCat]);

  const allCats = ["Todos", ...CATALOG_CATS];
  const filtered = activeCat === "Todos" ? products : products.filter(p => p.cat === activeCat);

  // Agrupar por categoría en orden cuando es "Todos"
  const grouped = CATALOG_CATS.map(c => ({
    cat: c, items: products.filter(p => p.cat === c),
  })).filter(g => g.items.length > 0);

  return (
    <div id="catalog" style={{ background: "white" }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.2rem 2rem 0" }}>
        <div style={{ fontSize: "0.82rem", color: "var(--gray)", fontFamily: "var(--font)" }}>
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Inicio</span>
          {" / "}
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => { setActiveCat("Todos"); }}>Catálogo</span>
          {activeCat !== "Todos" && <span style={{ color: "var(--dark)", fontWeight: 600 }}> / {activeCat}</span>}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 2rem 4rem", display: "flex", gap: "2.5rem", alignItems: "flex-start" }} className="catalog-main-wrapper">

        {/* Sidebar izquierdo — igual que imagen 2 */}
        <div style={{ width: 160, flexShrink: 0, paddingTop: "0.5rem" }} className="catalog-sidebar">
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--gray)", marginBottom: "1rem", fontFamily: "var(--font)" }}>
            Categorias
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {allCats.map(c => (
              <button key={c} onClick={() => setActiveCat(c)} style={{
                display: "block", textAlign: "left", padding: "7px 0",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "var(--font)",
                fontSize: "0.88rem",
                color: c === activeCat ? "var(--dark)" : "var(--gray)",
                fontWeight: c === activeCat ? 700 : 400,
                borderLeft: c === activeCat ? "2px solid var(--dark)" : "2px solid transparent",
                paddingLeft: "10px",
                transition: "all .15s",
              }}
                onMouseEnter={e => { if (c !== activeCat) e.currentTarget.style.color = "var(--dark)"; }}
                onMouseLeave={e => { if (c !== activeCat) e.currentTarget.style.color = "var(--gray)"; }}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Grid principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🐱</div>
              Cargando catálogo...
            </div>
          ) : activeCat !== "Todos" ? (
            filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray)" }}>
                No hay productos en esta categoría aún.
              </div>
            ) : (
              <div className="catalog-grid">
                {filtered.map(p => <ProductCard key={p.id} product={p} onClick={onSelect} variant="grid" />)}
              </div>
            )
          ) : (
            grouped.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem", color: "var(--gray)" }}>No hay artículos en el catálogo aún.</div>
            ) : (
              grouped.map(({ cat: catName, items }) => (
                <div key={catName} style={{ marginBottom: "3rem" }}>
                  <h3 style={{
                    fontSize: "1rem", fontWeight: 700, marginBottom: "1rem",
                    paddingBottom: "0.5rem",
                    fontFamily: "var(--font)", textTransform: "uppercase",
                    letterSpacing: ".08em", color: "var(--dark)",
                  }}>{catName}</h3>
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
  const logoImg = { objectFit: "contain", cursor: "pointer", transition: "opacity 0.2s" };
  const sectionTitle = {
    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase", color: "#888",
    fontFamily: "var(--font)",
    marginBottom: "0.75rem",
  };
  return (
    <div style={{ background: "white", padding: "2rem 2.5rem" }} className="trust-banner">
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "3rem", alignItems: "flex-start" }}>

        {/* MÉTODOS DE PAGO */}
        <div>
          <div style={sectionTitle}>Medios de Pago</div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <img src={yapeLogo} alt="Yape" style={{ ...logoImg, height: 40, borderRadius: 10 }} onMouseEnter={e => e.currentTarget.style.opacity="0.75"} onMouseLeave={e => e.currentTarget.style.opacity="1"} />
            <img src={plinLogo} alt="Plin" style={{ ...logoImg, height: 40, borderRadius: 10 }} onMouseEnter={e => e.currentTarget.style.opacity="0.75"} onMouseLeave={e => e.currentTarget.style.opacity="1"} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", transition: "opacity 0.2s", color: "#555" }} onMouseEnter={e => e.currentTarget.style.opacity="0.7"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>
              <div style={{ width: 40, height: 40, background: "#f5f5f5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
              </div>
              <span style={{ fontSize: "0.6rem", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#888" }}>Transf.</span>
            </div>
          </div>
        </div>

        {/* MÉTODOS DE ENVÍO */}
        <div>
          <div style={sectionTitle}>Medios de Envío</div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <img src={olvaLogo} alt="Olva Courier" style={{ ...logoImg, height: 36, borderRadius: 6 }} onMouseEnter={e => e.currentTarget.style.opacity="0.75"} onMouseLeave={e => e.currentTarget.style.opacity="1"} />
            <img src={shalomLogo} alt="Shalom" style={{ ...logoImg, height: 36 }} onMouseEnter={e => e.currentTarget.style.opacity="0.75"} onMouseLeave={e => e.currentTarget.style.opacity="1"} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", transition: "opacity 0.2s", color: "#555" }} onMouseEnter={e => e.currentTarget.style.opacity="0.7"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>
              <div style={{ width: 40, height: 36, background: "#f5f5f5", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#555"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5l1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>
              </div>
              <span style={{ fontSize: "0.6rem", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#888" }}>Express</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ============ MAIN ============
export default function Home() {
  const { products, loading } = useProducts();
  const [selected, setSelected] = useState(null);
  const [showWsp, setShowWsp] = useState(false);
  const [navCat, setNavCat] = useState(null); // categoría que viene desde el navbar

  useEffect(() => {
    const handleScroll = () => setShowWsp(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const safeProducts = Array.isArray(products) ? products.filter(p => p.badge !== "descontinuado") : [];

  const newInItems = safeProducts.length > 0
    ? safeProducts.filter(p => p.featured)
    : [];

  return (
    <>
      <Navbar onCatChange={(cat) => {
        setNavCat(cat);
        setTimeout(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }), 80);
      }} />
      <CartSidebar />

      <HeroBanner onShop={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })} />

      {!loading && newInItems.length > 0 && (
        <NewInCarousel items={newInItems} onSelect={setSelected} />
      )}

      <CatalogSection
        products={safeProducts}
        loading={loading}
        onSelect={setSelected}
        externalCat={navCat}
        onExternalCatConsumed={() => setNavCat(null)}
      />

      <TrustBanner />

      <footer style={{ background: "var(--dark)", color: "white", textAlign: "center", padding: "2rem 1rem" }}>
        <p style={{ fontSize: "0.85rem", opacity: 0.8, fontFamily: "var(--font)" }}>
          Envíos a todo el Perú · WhatsApp: 927 112 114 · pookiecat.pe
        </p>
      </footer>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}

      <a href="https://wa.me/51927112114?text=Hola!%20Quisiera%20consultar%20sobre%20un%20producto%20"
        target="_blank" rel="noopener noreferrer"
        style={{
          position: "fixed", bottom: "2rem", right: "2rem", zIndex: 9000,
          width: 58, height: 58, borderRadius: "50%",
          background: "#25D366", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          textDecoration: "none",
          opacity: showWsp ? 1 : 0, visibility: showWsp ? "visible" : "hidden",
          transform: showWsp ? "translateY(0) scale(1)" : "translateY(20px) scale(0.8)",
          boxShadow: showWsp ? "0 4px 20px rgba(37,211,102,.45)" : "none",
          transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
        title="Consultas por WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </>
  );
}
