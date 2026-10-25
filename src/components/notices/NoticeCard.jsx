import { getCategoryBadgeClass } from "../../data/mockData";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';

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
    <div className={`notice-card ${prioridadClass}${isRead === true ? " is-read" : ""}`}>
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

        <div className="card-actions">
          {onToggleRead && (
            <button
              className={`btn-toggle-read ${isRead ? "read" : "unread"}`}
              onClick={() => onToggleRead(notice.id)}
              title={isRead ? "Marcar como no leída" : "Marcar como leída"}
            >
              {isRead ? "No leída" : "Leída"}
            </button>
          )}

          <button className="btn-read-more" onClick={() => onSelect(notice)}>
            Ver aviso
          </button>

          {canDelete && onDelete && (
            <button
              className="btn-delete-notice"
              onClick={() => {
                if (window.confirm(`¿Eliminár el aviso "${notice.titulo}"? Esta acción no se puede deshacer.`)) {
                  onDelete(notice.id);
                }
              }}
              title="Eliminar aviso"
              aria-label="Eliminar aviso"
            >
                <FontAwesomeIcon icon={faTrashCan} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
