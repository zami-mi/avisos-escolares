import { useState } from "react";
import { authService } from "../services";

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(event) {
    event.preventDefault();
    setMensaje("");
    setCargando(true);

    try {
      const datos = await authService.login(email, contrasena);

      setMensaje("¡Bienvenido!");
      setTimeout(() => {
        onLoginSuccess(datos.usuario);
      }, 300);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      if (error.isConnectionError) {
        setMensaje("No se pudo conectar con el servidor. Verificá que el backend esté ejecutándose.");
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

        <form onSubmit={iniciarSesion}>
          <label htmlFor="email">Email</label>

          <input
            type="email"
            id="email"
            placeholder="Ingresá tu email institucional"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={cargando}
            required
          />

          <label htmlFor="contrasena">Contraseña</label>

          <input
            type="password"
            id="contrasena"
            placeholder="Ingresá tu contraseña"
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
            disabled={cargando}
            required
          />

          <button type="submit" disabled={cargando}>
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
