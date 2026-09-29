import React from "react";
import { getCategoryBadgeClass } from "../../data/mockData";

export default function NoticeCard({
  notice,
  onSelect,
  onDelete,
  canDelete = false,
  isRead = null,
  onToggleRead = null,
}) {
  const prioridadClass = notice.prioridad ? `prioridad-${notice.prioridad}` : "prioridad-normal";

  const isUrgent =
    notice.prioridad?.toLowerCase() === "alta" ||
    notice.categoria?.toLowerCase() === "urgente";

  return (
    <div
      className={`notice-card ${prioridadClass}`}
      style={{
        opacity: isRead === true ? 0.85 : 1,
        boxShadow: isRead === false ? "0 4px 14px rgba(184, 27, 20, 0.12)" : undefined,
      }}
    >
      <div>
        <div className="card-top">
          {isUrgent ? (
            <span className="notice-urgent-badge">URGENTE</span>
          ) : (
            <span className={`notice-category-badge ${getCategoryBadgeClass(notice.categoria)}`}>
              {notice.categoria}
            </span>
          )}
          <span className="notice-date">{notice.fecha}</span>
        </div>

        <h4 className="notice-title">{notice.titulo}</h4>
        <p className="notice-preview">{notice.contenido}</p>
      </div>

      <div className="card-footer">
        <div className="author-info">
          <span className="author-name">{notice.autor}</span>
          <span className="author-target">
            Para: <strong>{notice.destinatario}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          {onToggleRead && (
            <button
              className={`btn-toggle-read ${isRead ? "read" : "unread"}`}
              onClick={() => onToggleRead(notice.id)}
              title={isRead ? "Marcar como no leída" : "Marcar como leída"}
            >
              {isRead ? "Marcar no leída" : "Marcar leída"}
            </button>
          )}

          <button className="btn-read-more" onClick={() => onSelect(notice)}>
            Leer Aviso
          </button>

          {canDelete && onDelete && (
            <button
              className="btn-delete-notice"
              onClick={() => onDelete(notice.id)}
              title="Eliminar aviso"
            >
              <i className="fa-regular fa-trash-can"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
