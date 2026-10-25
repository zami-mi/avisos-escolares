import { useState, useEffect } from "react";
import { ROLES, CATEGORIAS_AVISOS } from "../../data/mockData";
import { courseService } from "../../services";

export default function CreateNoticeModal({ isOpen, onClose, onSave, currentUser }) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_AVISOS[0]);
  const [destinatario, setDestinatario] = useState("");
  const [prioridad, setPrioridad] = useState("normal");
  const [notificarFamilias, setNotificarFamilias] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [cursosDb, setCursosDb] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    courseService.getAll()
      .then((data) => {
        if (Array.isArray(data)) setCursosDb(data);
      })
      .catch((err) => console.error("Error al cargar cursos:", err));
  }, [isOpen]);

  if (!isOpen) return null;

  const getDestinatariosOptions = () => {
    const todosOption = { label: "Toda la escuela", value: "Todos" };
    const allCursosOptions = cursosDb.map((c) => ({
      label: `Curso ${c.año}° ${c.division}`,
      value: `${c.año}° ${c.division}`,
    }));

    switch (currentUser?.rol) {
      case ROLES.PRECEPTOR: {
        const myDivs = currentUser?.divisiones || [];
        const divOptions = myDivs.map((div) => ({
          label: `Curso ${div}`,
          value: div,
        }));
        return [...divOptions, todosOption];
      }
      case ROLES.REGENTE:
        return [todosOption, ...allCursosOptions];
      case ROLES.PROFESOR: {
        const profCursos = currentUser?.cursosAsignados || [];
        const profOptions = profCursos.map((c) => ({
          label: `Alumnos de ${c}`,
          value: c,
        }));
        return profOptions.length > 0 ? profOptions : [todosOption];
      }
      default:
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

    const newNotice = {
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      categoria,
      destinatario: defaultTarget,
      prioridad,
      autor: currentUser?.nombre ? `${currentUser.nombre} ${currentUser.apellido || ""}`.trim() : "Autor institucional",
      rolAutor: currentUser?.rol,
      fecha: new Date().toISOString().split("T")[0],
      notificar_familias: notificarFamilias,
    };

    try {
      if (onSave) {
        await onSave(newNotice);
      }
      setSuccessMessage(
        notificarFamilias
          ? "Aviso publicado exitosamente y enviado por correo electrónico a las familias."
          : "Aviso escolar publicado exitosamente."
      );
      setTimeout(() => {
        setTitulo("");
        setContenido("");
        setNotificarFamilias(false);
        setSuccessMessage("");
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Error al publicar aviso:", err);
      setErrorMessage(err.message || "No se pudo publicar el aviso en el servidor.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={isSubmitting ? null : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-bullhorn" style={{ marginRight: "8px", color: "var(--primary-school)" }}></i>
            Nuevo aviso
          </h3>
          <button className="btn-close-modal" onClick={onClose} disabled={isSubmitting}>
            &times;
          </button>
        </div>

        {errorMessage && (
          <div style={{
            backgroundColor: "#fff5f5",
            border: "1px solid #feb2b2",
            color: "#c53030",
            padding: "10px 14px",
            borderRadius: "6px",
            marginBottom: "14px",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            backgroundColor: "#f0fff4",
            border: "1px solid #9ae6b4",
            color: "#22543d",
            padding: "10px 14px",
            borderRadius: "6px",
            marginBottom: "14px",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <i className="fa-solid fa-circle-check"></i>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="notice-title">Título del Aviso</label>
            <input
              id="notice-title"
              type="text"
              placeholder="Ej: Material de estudio para la próxima clase"
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
              <label htmlFor="notice-category">Categoría</label>
              <select
                id="notice-category"
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
              <label htmlFor="notice-priority">Prioridad</label>
              <select
                id="notice-priority"
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="normal">Normal</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notice-target">Dirigido a</label>
            <select
              id="notice-target"
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
            <label htmlFor="notice-content">Detalle del Aviso</label>
            <textarea
              id="notice-content"
              rows={5}
              value={contenido}
              onChange={(e) => {
                setContenido(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              disabled={isSubmitting}
              required
            ></textarea>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "14px 0" }}>
            <input
              id="notice-notificar-familias"
              type="checkbox"
              checked={notificarFamilias}
              onChange={(e) => setNotificarFamilias(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: "16px", height: "16px", cursor: isSubmitting ? "not-allowed" : "pointer" }}
            />
            <label
              htmlFor="notice-notificar-familias"
              style={{ margin: 0, cursor: isSubmitting ? "not-allowed" : "pointer", fontSize: "0.88rem", fontWeight: "600", color: "#4a5568" }}
            >
              <i className="fa-regular fa-envelope" style={{ marginRight: "6px" }}></i>
              Notificar a las familias por correo electrónico
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary-action" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Publicando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i> Publicar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
