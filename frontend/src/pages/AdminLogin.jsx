// src/pages/AdminLogin.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

// ============ RATE LIMITER — LOGIN ============
const RATE_KEY = "pookiecat_login_attempts";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function getRateData() {
  try {
    const raw = sessionStorage.getItem(RATE_KEY);
    return raw ? JSON.parse(raw) : { attempts: 0, firstAttempt: null };
  } catch { return { attempts: 0, firstAttempt: null }; }
}

function checkRateLimit() {
  const { attempts, firstAttempt } = getRateData();
  if (!firstAttempt) return { blocked: false, remaining: MAX_ATTEMPTS };
  const elapsed = Date.now() - firstAttempt;
  if (elapsed > WINDOW_MS) {
    sessionStorage.removeItem(RATE_KEY);
    return { blocked: false, remaining: MAX_ATTEMPTS };
  }
  if (attempts >= MAX_ATTEMPTS) {
    const waitMin = Math.ceil((WINDOW_MS - elapsed) / 60000);
    return { blocked: true, remaining: 0, waitMin };
  }
  return { blocked: false, remaining: MAX_ATTEMPTS - attempts };
}

function registerAttempt() {
  const { attempts, firstAttempt } = getRateData();
  sessionStorage.setItem(RATE_KEY, JSON.stringify({
    attempts: attempts + 1,
    firstAttempt: firstAttempt || Date.now(),
  }));
}
// ================================================

const sanitizeEmail = (val) => val.replace(/[^a-zA-Z0-9@._+-]/g, "").slice(0, 100);

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateInfo, setRateInfo] = useState(() => checkRateLimit());
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const rate = checkRateLimit();
    setRateInfo(rate);
    if (rate.blocked) {
      setError(`Demasiados intentos. Espera ${rate.waitMin} minuto${rate.waitMin > 1 ? "s" : ""}.`);
      return;
    }

    setLoading(true);
    registerAttempt();

    try {
      await login(email, password);
      sessionStorage.removeItem(RATE_KEY); 
      
      // CORRECCIÓN APLICADA: Redirige al dashboard correctamente
      navigate("/admin/dashboard"); 
      
    } catch (err) {
      const updatedRate = checkRateLimit();
      setRateInfo(updatedRate);
      if (updatedRate.blocked) {
        setError(`Demasiados intentos fallidos. Espera ${updatedRate.waitMin} minuto${updatedRate.waitMin > 1 ? "s" : ""}.`);
      } else {
        setError(`Credenciales incorrectas. Intentos restantes: ${updatedRate.remaining}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fdf8fa" }}>
      <div style={{ background: "white", padding: "3rem 2.5rem", borderRadius: 24, width: "100%", maxWidth: 400, boxShadow: "0 10px 40px rgba(0,0,0,.05)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Logo size={48} />
          <h1 className="serif" style={{ fontSize: "2rem", marginTop: 16 }}>Panel Admin</h1>
          <p style={{ color: "var(--gray)", fontSize: "0.9rem", marginTop: 8 }}>PookieCat — Acceso restringido</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" required className="form-input" value={email} onChange={e => setEmail(sanitizeEmail(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input type="password" required className="form-input" value={password} onChange={e => setPassword(e.target.value.slice(0, 100))} />
          </div>

          {error && <div style={{ color: "var(--danger)", fontSize: "0.85rem", textAlign: "center" }}>⚠ {error}</div>}

          {rateInfo.blocked ? (
            <div style={{ background: "#f8d7da", color: "#842029", padding: "12px 16px", borderRadius: 10, fontSize: "0.85rem", textAlign: "center", fontWeight: 500 }}>
              🔒 Acceso bloqueado temporalmente.<br/>Espera {rateInfo.waitMin} minuto{rateInfo.waitMin > 1 ? "s" : ""} e intenta de nuevo.
            </div>
          ) : (
            <button type="submit" disabled={loading} className="btn btn-dark btn-full" style={{ marginTop: "0.5rem" }}>
              {loading ? "Verificando..." : "Ingresar →"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}