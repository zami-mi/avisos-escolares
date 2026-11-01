import { useState } from "react";
import { authService } from "../../services";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");

  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setContrasenaActual("");
    setNuevaContrasena("");
    setConfirmarContrasena("");
    setShowActual(false);
    setShowNueva(false);
    setShowConfirmar(false);
    setErrorMessage("");
    setSuccessMessage("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage("");
    setSuccessMessage("");

    // Validaciones en cliente
    if (!contrasenaActual.trim()) {
      setErrorMessage("Por favor ingresá tu contraseña actual.");
      return;
    }
    if (!nuevaContrasena.trim()) {
      setErrorMessage("Por favor ingresá la nueva contraseña.");
      return;
    }
    if (nuevaContrasena.trim().length < 4) {
      setErrorMessage("La nueva contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (nuevaContrasena === contrasenaActual) {
      setErrorMessage("La nueva contraseña no puede ser idéntica a la actual.");
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setErrorMessage("Las nuevas contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const resp = await authService.changePassword(
        contrasenaActual,
        nuevaContrasena,
        confirmarContrasena
      );

      setSuccessMessage(resp.mensaje || "¡Contraseña actualizada con éxito!");
      setTimeout(() => {
        setIsSubmitting(false);
        handleClose();
      }, 1300);
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      setErrorMessage(err.message || "Error al actualizar la contraseña.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-key" style={{ marginRight: "10px", color: "var(--primary-school, #8a151b)" }}></i>
            Cambiar contraseña
          </h3>
          <button className="btn-close-modal" onClick={handleClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              backgroundColor: "#fff5f5",
              border: "1px solid #feb2b2",
              color: "#c53030",
              padding: "10px 14px",
              borderRadius: "6px",
              marginBottom: "14px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              backgroundColor: "#f0fff4",
              border: "1px solid #9ae6b4",
              color: "#22543d",
              padding: "10px 14px",
              borderRadius: "6px",
              marginBottom: "14px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <i className="fa-solid fa-circle-check"></i>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Contraseña actual */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label htmlFor="pass-actual" style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: "600", color: "#4a5568" }}>
              Contraseña actual *
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="pass-actual"
                type={showActual ? "text" : "password"}
                value={contrasenaActual}
                onChange={(e) => setContrasenaActual(e.target.value)}
                placeholder="Ingresá tu contraseña actual"
                style={{ width: "100%", paddingRight: "40px", boxSizing: "border-box" }}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowActual(!showActual)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#718096",
                  padding: "4px",
                }}
                title={showActual ? "Ocultar caracteres" : "Mostrar caracteres"}
              >
                <i className={`fa-solid ${showActual ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label htmlFor="pass-nueva" style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: "600", color: "#4a5568" }}>
              Nueva contraseña *
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="pass-nueva"
                type={showNueva ? "text" : "password"}
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                style={{ width: "100%", paddingRight: "40px", boxSizing: "border-box" }}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowNueva(!showNueva)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#718096",
                  padding: "4px",
                }}
                title={showNueva ? "Ocultar caracteres" : "Mostrar caracteres"}
              >
                <i className={`fa-solid ${showNueva ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label htmlFor="pass-confirmar" style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: "600", color: "#4a5568" }}>
              Confirmar nueva contraseña *
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="pass-confirmar"
                type={showConfirmar ? "text" : "password"}
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                placeholder="Repetí la nueva contraseña"
                style={{ width: "100%", paddingRight: "40px", boxSizing: "border-box" }}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmar(!showConfirmar)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#718096",
                  padding: "4px",
                }}
                title={showConfirmar ? "Ocultar caracteres" : "Mostrar caracteres"}
              >
                <i className={`fa-solid ${showConfirmar ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
          </div>

          <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary-action"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "6px" }}></i>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" style={{ marginRight: "6px" }}></i>
                  Guardar cambio
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

