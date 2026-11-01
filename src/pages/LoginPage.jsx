import { useState, useEffect, useRef } from "react";
import { authService } from "../services";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3002/api";

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  // Estado de disponibilidad del backend
  const [backendListo, setBackendListo] = useState(false);
  const [verificandoConexion, setVerificandoConexion] = useState(true);
  const retryTimerRef = useRef(null);

  // Verifica si el backend responde al endpoint /health
  async function checkBackend() {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setBackendListo(true);
        setVerificandoConexion(false);
        return true;
      }
    } catch {
      // Backend aún no disponible — se reintentará
    }
    return false;
  }

  // Al montar: verificar backend y reintentar cada 2s hasta que responda
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      const ok = await checkBackend();
      if (!ok && !cancelled) {
        retryTimerRef.current = setTimeout(poll, 2000);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(retryTimerRef.current);
    };
  }, []);

  async function iniciarSesion(event) {
    event.preventDefault();
    setMensaje("");
    setCargando(true);

    try {
      const datos = await authService.login(email, contrasena);

      if (datos.token) {
        localStorage.setItem("avisos_auth_token", datos.token);
      }

      setMensaje("¡Bienvenido!");
      setTimeout(() => {
        onLoginSuccess(datos.usuario, datos.token);
      }, 300);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      if (error.isConnectionError) {
        setBackendListo(false);
        setVerificandoConexion(true);
        // Reiniciar polling si el backend se cayó
        checkBackend().then((ok) => {
          if (!ok) {
            retryTimerRef.current = setTimeout(() => {
              const poll = async () => {
                const res = await checkBackend();
                if (!res) retryTimerRef.current = setTimeout(poll, 2000);
              };
              poll();
            }, 2000);
          }
        });
        setMensaje("No se pudo conectar con el servidor. Reintentando...");
      } else {
        setMensaje(error.message || "Email o contraseña incorrectos");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>RED35</h1>

        <p className="subtitulo">
          Avisos escolares
        </p>

        {/* Banner de estado de conexión con el backend */}
        {verificandoConexion && !backendListo && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#fffbeb",
              border: "1px solid #f6e05e",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "16px",
              fontSize: "0.84rem",
              color: "#744210",
            }}
          >
            <i
              className="fa-solid fa-circle-notch fa-spin"
              style={{ color: "#d69e2e" }}
            />
            Conectando con el servidor…
          </div>
        )}

        <form onSubmit={iniciarSesion}>
          <label htmlFor="email">Email</label>

          <input
            type="email"
            id="email"
            placeholder="Ingresá tu email institucional"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={cargando || !backendListo}
            required
          />

          <label htmlFor="contrasena">Contraseña</label>

          <input
            type="password"
            id="contrasena"
            placeholder="Ingresá tu contraseña"
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
            disabled={cargando || !backendListo}
            required
          />

          <button type="submit" disabled={cargando || !backendListo}>
            {cargando ? "Iniciando sesión..." : "Ingresar"}
          </button>
        </form>

        {mensaje && (
          <p
            className="mensaje"
            style={{
              color: mensaje.includes("Bienvenido")
                ? "#276749"
                : "#e53e3e",
              fontWeight: "600",
            }}
          >
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
}
