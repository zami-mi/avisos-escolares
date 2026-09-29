import React, { useState, useEffect } from "react";
import { ROLES, CATEGORIAS_AVISOS } from "../../data/mockData";

export default function CreateNoticeModal({ isOpen, onClose, onSave, currentUser }) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS_AVISOS[0]);
  const [destinatario, setDestinatario] = useState("");
  const [prioridad, setPrioridad] = useState("normal");
  const [notificarFamilias, setNotificarFamilias] = useState(false);

  const [cursosDb, setCursosDb] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("http://localhost:3002/api/cursos")
      .then((res) => res.json())
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
        const myDivs = currentUser?.divisiones && currentUser.divisiones.length > 0
          ? currentUser.divisiones
          : ["2° 2", "6° 1"];
        const divOptions = myDivs.map((div) => ({
          label: `Curso ${div}`,
          value: div,
        }));
        return [...divOptions, todosOption];
      }
      case ROLES.REGENTE:
        return [todosOption, ...allCursosOptions];
      case ROLES.PROFESOR: {
        const profCursos = currentUser?.cursosAsignados && currentUser.cursosAsignados.length > 0
          ? currentUser.cursosAsignados
          : ["6° 1", "2° 2"];
        return profCursos.map((c) => ({
          label: `Alumnos de ${c}`,
          value: c,
        }));
      }
      default:
        return [todosOption, ...allCursosOptions];
    }
  };

  const options = getDestinatariosOptions();
  const defaultTarget = destinatario || options[0]?.value || "Todos";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) {
      alert("Por favor completá el título y el contenido del aviso.");
      return;
    }

    const newNotice = {
      id: Date.now(),
      titulo,
      contenido,
      categoria,
      destinatario: defaultTarget,
      prioridad,
      autor: currentUser?.nombre || "Autor",
      rolAutor: currentUser?.rol,
      fecha: new Date().toISOString().split("T")[0],
      notificar_familias: notificarFamilias,
    };

    onSave(newNotice);
    setTitulo("");
    setContenido("");
    setNotificarFamilias(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-bullhorn" style={{ marginRight: "8px", color: "var(--primary-school)" }}></i>
            Nuevo aviso
          </h3>
          <button className="btn-close-modal" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="notice-title">Título del Aviso</label>
            <input
              id="notice-title"
              type="text"
              placeholder="Ej: Material de estudio para la próxima clase"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
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
              onChange={(e) => setContenido(e.target.value)}
              required
            ></textarea>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "14px 0" }}>
            <input
              id="notice-notificar-familias"
              type="checkbox"
              checked={notificarFamilias}
              onChange={(e) => setNotificarFamilias(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label
              htmlFor="notice-notificar-familias"
              style={{ margin: 0, cursor: "pointer", fontSize: "0.88rem", fontWeight: "600", color: "#4a5568" }}
            >
              Notificar a las familias
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary-action">
              Publicar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
