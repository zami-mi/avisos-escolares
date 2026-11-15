import { useState, useEffect } from "react";
import { ROLES, CATEGORIAS_AVISOS, isAutoridad } from "../../data/mockData";
import { courseService } from "../../services";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPenToSquare,
  faCircleExclamation,
  faCircleCheck,
  faFloppyDisk,
  faSpinner,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

export default function EditNoticeModal({
  isOpen,
  notice,
  onClose,
  onSave,
  currentUser,
}) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_AVISOS[0]);
  const [destinatario, setDestinatario] = useState("");
  const [prioridad, setPrioridad] = useState("baja");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [cursosDb, setCursosDb] = useState([]);

  // Cargar cursos disponibles al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    courseService
      .getAll()
      .then((data) => {
        if (Array.isArray(data)) setCursosDb(data);
      })
      .catch((err) => console.error("Error al cargar cursos:", err));
  }, [isOpen]);

  // Sincronizar datos del aviso al abrir o cambiar de aviso
  useEffect(() => {
    if (notice) {
      setTitulo(notice.titulo || "");
      setContenido(notice.contenido || "");
      setCategoria(notice.categoria || CATEGORIAS_AVISOS[0]);
      setDestinatario(notice.destinatario || "");
      const rawP = (notice.prioridad || "baja").toLowerCase();
      const initialPriority = rawP === "alta" || rawP === "urgente" ? "alta" : (rawP === "media" || rawP === "normal" ? "media" : "baja");
      setPrioridad(initialPriority);
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [notice, isOpen]);

  if (!isOpen || !notice) return null;

  const getDestinatariosOptions = () => {
    const todosOption = { label: "Toda la escuela", value: "Todos" };
    const allCursosOptions = cursosDb.map((c) => ({
      label: `Curso ${c.anio}° ${c.division}`,
      value: `${c.anio}° ${c.division}`,
    }));

    switch (currentUser?.rol) {
      case ROLES.PRECEPTOR: {
        const myDivs = currentUser?.divisiones || [];
        return myDivs.map((div) => ({
          label: `Curso ${div}`,
          value: div,
        }));
      }
      default:
        // Autoridades (regente, jefe de taller, directivo, etc.)
        if (isAutoridad(currentUser?.rol)) {
          return [
            { label: "Toda la escuela", value: "Todos" },
            { label: "Turno mañana", value: "Turno Mañana" },
            { label: "Turno tarde", value: "Turno Tarde" },
            { label: "Turno noche", value: "Turno Noche" },
          ];
        }
        return [todosOption, ...allCursosOptions];
    }
  };

  const options = getDestinatariosOptions();
  const defaultTarget = destinatario || options[0]?.value || "Todos";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!titulo.trim() || !contenido.trim()) {
      setErrorMessage("Por favor completá el título y el contenido del aviso.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const updatedData = {
      id: notice.id,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      categoria,
      destinatario: defaultTarget,
      prioridad,
    };

    try {
      if (onSave) {
        await onSave(updatedData);
      }
      setSuccessMessage("Aviso modificado exitosamente.");
      setTimeout(() => {
        setSuccessMessage("");
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Error al actualizar aviso:", err);
      setErrorMessage(err.message || "No se pudo actualizar el aviso.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={isSubmitting ? null : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <FontAwesomeIcon
              icon={faPenToSquare}
              style={{ marginRight: "8px", color: "var(--primary, #b81b14)" }}
            />
            Editar aviso
          </h3>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            disabled={isSubmitting}
          >
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
            <FontAwesomeIcon icon={faCircleExclamation} />
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
            <FontAwesomeIcon icon={faCircleCheck} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="edit-notice-title">Título del Aviso</label>
            <input
              id="edit-notice-title"
              type="text"
              placeholder="Ej: Modificación de fecha de examen"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="edit-notice-category">Categoría</label>
              <select
                id="edit-notice-category"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                disabled={isSubmitting}
              >
                {CATEGORIAS_AVISOS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-notice-priority">Prioridad</label>
              <select
                id="edit-notice-priority"
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                {isAutoridad(currentUser?.rol) && (
                  <option value="alta">Alta / Urgente</option>
                )}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-notice-destinatario">Destinatario</label>
            <select
              id="edit-notice-destinatario"
              value={defaultTarget}
              onChange={(e) => setDestinatario(e.target.value)}
              disabled={isSubmitting}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="edit-notice-content">Contenido</label>
            <textarea
              id="edit-notice-content"
              rows={5}
              placeholder="Escribí el contenido completo del aviso..."
              value={contenido}
              onChange={(e) => {
                setContenido(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <span>Cancelar</span>
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
