import { getCategoryBadgeClass } from "../../data/mockData";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faClock, faPenToSquare } from '@fortawesome/free-solid-svg-icons';

function isNoticeToday(fechaStr) {
  if (!fechaStr) return false;
  const match = String(fechaStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const now = new Date();
  if (match) {
    const [, y, m, d] = match.map(Number);
    return (
      now.getFullYear() === y &&
      now.getMonth() + 1 === m &&
      now.getDate() === d
    );
  }
  const parsed = new Date(fechaStr);
  if (!isNaN(parsed.getTime())) {
    return (
      now.getFullYear() === parsed.getFullYear() &&
      now.getMonth() === parsed.getMonth() &&
      now.getDate() === parsed.getDate()
    );
  }
  return false;
}

export default function NoticeCard({
  notice,
  onSelect,
  onDelete,
  onEdit,
  canDelete = false,
  canEdit = false,
  isRead = null,
  onToggleRead = null,
}) {
  const rawPriority = (notice.prioridad || "baja").toLowerCase();
  const normalizedPriority = rawPriority === "normal" ? "media" : rawPriority;
  const prioridadClass = `prioridad-${normalizedPriority}`;

  const isUrgent =
    notice.prioridad?.toLowerCase() === "alta" ||
    notice.categoria?.toLowerCase() === "urgente";

  const isToday = isNoticeToday(notice.fecha);

  return (
    <div className={`notice-card ${prioridadClass}${isToday ? " is-today" : ""}${isRead === true ? " is-read" : ""}`}>
      <div>
        <div className="card-top">
          <div className="card-badges">
            {isToday && (
              <span className="notice-today-badge" title="Publicado durante el día de hoy">
                Publicado hoy
              </span>
            )}
            {isUrgent ? (
              <span className="notice-urgent-badge">URGENTE</span>
            ) : (
              <span className={`notice-category-badge ${getCategoryBadgeClass(notice.categoria)}`}>
                {notice.categoria}
              </span>
            )}
          </div>
          <span className={`notice-date${isToday ? " is-today-date" : ""}`}>
            {isToday ? (
              <>Hoy
              </>
            ) : (
              notice.fecha
            )}
          </span>
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

          {canEdit && onEdit && (
            <button
              type="button"
              className="btn-edit-notice"
              onClick={() => onEdit(notice)}
              title="Editar aviso"
              aria-label="Editar aviso"
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
          )}

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
