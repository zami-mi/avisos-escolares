import React from "react";

export default function AbsenceTable({
  absences,
  onConfirmAbsence,
  canConfirm = false,
  emptyMessage = "No hay registros de ausencias para mostrar.",
}) {
  if (!absences || absences.length === 0) {
    return (
      <div className="empty-state">
        <h3>
          <i className="fa-solid fa-clipboard-list" style={{ marginRight: "8px" }}></i>
          Sin ausencias registradas
        </h3>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="absence-table-wrapper" style={{ overflowX: "auto" }}>
      <table className="school-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
        <thead>
          <tr style={{ backgroundColor: "#f7fafc", borderBottom: "2px solid #e2e8f0" }}>
            <th style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#4a5568", textTransform: "uppercase" }}>
              Docente
            </th>
            <th style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#4a5568", textTransform: "uppercase" }}>
              Materia & Curso
            </th>
            <th style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#4a5568", textTransform: "uppercase" }}>
              Fecha y Horario
            </th>
            <th style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#4a5568", textTransform: "uppercase" }}>
              Motivo
            </th>
            <th style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#4a5568", textTransform: "uppercase" }}>
              Estado
            </th>
            {canConfirm && (
              <th style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#4a5568", textTransform: "uppercase" }}>
                Acción
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {absences.map((item) => {
            const isPending = item.estado === "pendiente";

            return (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid #edf2f7",
                  backgroundColor: isPending ? "#fffaf0" : "white",
                  transition: "background-color 0.2s",
                }}
              >
                <td style={{ padding: "14px", fontWeight: "600", color: "#2d3748" }}>
                  {item.profesorNombre}
                </td>
                <td style={{ padding: "14px" }}>
                  <div style={{ fontWeight: "600", color: "#2b6cb0" }}>{item.materia}</div>
                  <span style={{ fontSize: "0.82rem", color: "#718096" }}>
                    Curso: <strong>{item.curso}</strong>
                  </span>
                </td>
                <td style={{ padding: "14px" }}>
                  <div style={{ fontWeight: "600", color: "#2d3748" }}>
                    <i className="fa-regular fa-calendar" style={{ marginRight: "6px", color: "#4a5568" }}></i>
                    {item.fecha}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#718096" }}>
                    <i className="fa-regular fa-clock" style={{ marginRight: "6px", color: "#718096" }}></i>
                    {item.horario}
                  </div>
                </td>
                <td style={{ padding: "14px", fontSize: "0.88rem", color: "#4a5568", maxWidth: "240px" }}>
                  {item.motivo}
                </td>
                <td style={{ padding: "14px" }}>
                  {isPending ? (
                    <span
                      style={{
                        backgroundColor: "#feebc8",
                        color: "#c05621",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        display: "inline-block",
                      }}
                    >
                      <i className="fa-solid fa-hourglass-half" style={{ marginRight: "5px" }}></i>
                      Pendiente
                    </span>
                  ) : (
                    <div>
                      <span
                        style={{
                          backgroundColor: "#c6f6d5",
                          color: "#22543d",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          display: "inline-block",
                        }}
                      >
                        <i className="fa-solid fa-check" style={{ marginRight: "5px" }}></i>
                        Confirmada
                      </span>
                      {item.confirmadoPor && (
                        <div style={{ fontSize: "0.72rem", color: "#718096", marginTop: "4px" }}>
                          Por: {item.confirmadoPor}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                {canConfirm && (
                  <td style={{ padding: "14px" }}>
                    {isPending ? (
                      <button
                        className="btn-confirm-absence"
                        onClick={() => onConfirmAbsence(item.id)}
                        title="Confirmar ausencia y notificar inmediatamente a los alumnos"
                      >
                        <i className="fa-solid fa-check"></i> Confirmar Ausencia
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#718096" }}>
                        Notificación enviada
                      </span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
