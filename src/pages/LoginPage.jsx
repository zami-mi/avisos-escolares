import React, { useState } from "react";

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function iniciarSesion(event) {
    event.preventDefault();

    setMensaje("");

    try {
      const respuesta = await fetch("http://localhost:3002/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          contrasena: contrasena,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setMensaje(datos.error || "Datos incorrectos");
        return;
      }

      setMensaje("Bienvenido!");

      setTimeout(() => {
        onLoginSuccess(datos.usuario);
      }, 300);

    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setMensaje("No se pudo conectar con el servidor");
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Avisos Escolares</h1>

        <p className="subtitulo">
          Iniciá sesión para continuar
        </p>

        <form onSubmit={iniciarSesion}>
          <label htmlFor="email">Email</label>

          <input
            type="email"
            id="email"
            placeholder="Ingresá tu email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="contrasena">Contraseña</label>

          <input
            type="password"
            id="contrasena"
            placeholder="Ingresá tu contraseña"
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
            required
          />

          <button type="submit">
            Ingresar
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


