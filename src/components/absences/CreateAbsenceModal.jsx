import React, { useState, useEffect } from "react";

export default function CreateAbsenceModal({ isOpen, onClose, onSave, currentUser }) {
  const [horarios, setHorarios] = useState([]);
  const [selectedHorarioId, setSelectedHorarioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("Licencia médica con certificado");
  const [motivoDetalle, setMotivoDetalle] = useState("");
  const [notificarFamilias, setNotificarFamilias] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUser?.id_usuario) return;

    async function cargarHorarios() {
      try {
        const resp = await fetch(`http://localhost:3002/api/profesor/${currentUser.id_usuario}/horarios`);
        if (resp.ok) {
          const data = await resp.json();
          setHorarios(data);
          if (data.length > 0) {
            setSelectedHorarioId(data[0].id_horario);
          }
        }
      } catch (error) {
        console.error("Error al cargar horarios:", error);
      }
    }

    cargarHorarios();
  }, [isOpen, currentUser?.id_usuario]);

  if (!isOpen) return null;

  const selectedHorario = horarios.find(h => h.id_horario === Number(selectedHorarioId));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fecha) {
      alert("Por favor seleccioná la fecha de ausencia.");
      return;
    }
    if (!selectedHorarioId) {
      alert("Por favor seleccioná un horario.");
      return;
    }

    const motivoFinal = motivoDetalle.trim()
      ? `${motivo} - ${motivoDetalle.trim()}`
      : motivo;

    const newAbsence = {
      id_horario: Number(selectedHorarioId),
      fecha,
      motivo: motivoFinal,
      notificar_familias: notificarFamilias,
    };

    onSave(newAbsence);
    setNotificarFamilias(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3><i className="fa-regular fa-file-lines"></i> Informar Ausencia Docente</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row-2col">
            <div className="form-group">
              <label htmlFor="absence-fecha">Fecha de Ausencia *</label>
              <input
                id="absence-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="absence-horario">Horario / Materia / Curso *</label>
              <select
                id="absence-horario"
                value={selectedHorarioId}
                onChange={(e) => setSelectedHorarioId(e.target.value)}
                required
              >
                {horarios.length === 0 && (
                  <option value="">Cargando horarios...</option>
                )}
                {horarios.map((h) => (
                  <option key={h.id_horario} value={h.id_horario}>
                    {h.dia_semana} — {h.materia} — {h.curso} ({h.hora_inicio} a {h.hora_fin})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedHorario && (
            <div className="selected-info-box">
              <strong>Materia:</strong> {selectedHorario.materia} &bull;{" "}
              <strong>Curso:</strong> {selectedHorario.curso} &bull;{" "}
              <strong>Día:</strong> {selectedHorario.dia_semana} &bull;{" "}
              <strong>Horario:</strong> {selectedHorario.hora_inicio} a {selectedHorario.hora_fin}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="absence-motivo">Motivo de Ausencia *</label>
            <select
              id="absence-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            >
              <option value="Licencia médica con certificado">Licencia médica con certificado</option>
              <option value="Razones particulares / fuerza mayor">Razones particulares / fuerza mayor</option>
              <option value="Capacitación / Perfeccionamiento docente">Capacitación / Perfeccionamiento docente</option>
              <option value="Mesa examinadora">Mesa examinadora</option>
              <option value="Cuidado de familiar enfermo">Cuidado de familiar enfermo</option>
              <option value="Otro motivo justificado">Otro motivo justificado</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="absence-detalle">Aclaraciones adicionales (opcional)</label>
            <textarea
              id="absence-detalle"
              rows={2}
              placeholder="Indicaciones para el preceptor o detalle del motivo..."
              value={motivoDetalle}
              onChange={(e) => setMotivoDetalle(e.target.value)}
            ></textarea>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "14px 0" }}>
            <input
              id="absence-notificar-familias"
              type="checkbox"
              checked={notificarFamilias}
              onChange={(e) => setNotificarFamilias(e.target.checked)}
              style={{ width: "16px", height: "16px", cursor: "pointer" }}
            />
            <label
              htmlFor="absence-notificar-familias"
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
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

