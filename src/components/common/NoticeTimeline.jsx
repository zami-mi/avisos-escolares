import { getCategoryBadgeClass } from "../../data/mockData";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faClock,
  faCheck,
  faUser,
  faArrowRight,
  faCalendarCheck,
} from "@fortawesome/free-solid-svg-icons";

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match.map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatTodayHeader() {
  const now = new Date();
  const formatted = now.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function NoticeTimeline({ notices = [], onSelectNotice }) {
  const today = new Date();
  const dateLabel = formatTodayHeader();

  // Filtrar avisos publicados durante el día de hoy
  const publicadosHoy = notices.filter((n) => {
    const d = parseLocalDate(n.fecha);
    return d && isSameDay(d, today);
  });

  // Ordenar del más reciente al más antiguo
  publicadosHoy.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

  const totalHoy = publicadosHoy.length;

  return (
    <section className="daily-notices-panel" aria-label="Avisos del día">
      <div className="daily-notices-header">
        <div className="daily-notices-title-group">
          <div className="daily-notices-icon-box">
            <FontAwesomeIcon icon={faCalendarDays} />
          </div>
          <div>
            <h3 className="daily-notices-heading">
              Avisos publicados hoy
            </h3>
            <p className="daily-notices-date-sub">
              {dateLabel}
            </p>
          </div>
        </div>

        <div>
          {totalHoy > 0 ? (
            <span className="daily-notices-badge-active">
              {totalHoy} {totalHoy === 1 ? "aviso nuevo" : "avisos nuevos"}
            </span>
          ) : null }
        </div>
      </div>

      <div className="daily-notices-body">
        {totalHoy > 0 ? (
          <div className="daily-notices-grid">
            {publicadosHoy.map((notice) => {
              const rawPriority = (notice.prioridad || "baja").toLowerCase();
              const normalizedPriority = rawPriority === "normal" ? "media" : rawPriority;
              const prioridadClass = `prioridad-${normalizedPriority}`;

              const isUrgent =
                notice.prioridad?.toLowerCase() === "alta" ||
                notice.categoria?.toLowerCase() === "urgente";

              return (
                <div
                  key={notice.id}
                  className={`daily-notice-item ${prioridadClass}`}
                >
                  <div>
                    <div className="daily-item-top">
                      {isUrgent ? (
                        <span className="notice-urgent-badge">URGENTE</span>
                      ) : (
                        <span
                          className={`notice-category-badge ${getCategoryBadgeClass(
                            notice.categoria
                          )}`}
                        >
                          {notice.categoria}
                        </span>
                      )}
                      <span className="daily-item-target">
                        Para: <strong>{notice.destinatario || "Todos"}</strong>
                      </span>
                    </div>

                    <h4 className="daily-item-title">{notice.titulo}</h4>
                    <p className="daily-item-preview">{notice.contenido}</p>
                  </div>

                  <div className="daily-item-footer">
                    <span className="daily-item-author" title={notice.autor}>
                      <FontAwesomeIcon
                        icon={faUser}
                        style={{ marginRight: "4px" }}
                      />
                      {notice.autor}
                    </span>

                    <button
                      type="button"
                      className="btn-daily-view"
                      onClick={() => onSelectNotice && onSelectNotice(notice)}
                    >
                      Ver aviso
                      <FontAwesomeIcon
                        icon={faArrowRight}
                        style={{ fontSize: "0.7rem", marginLeft: "4px" }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="daily-empty-state">
            <div className="daily-empty-icon">
              <FontAwesomeIcon icon={faCalendarCheck} />
            </div>
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "#4a5568",
                }}
              >
                No hay avisos publicados durante el día de hoy
              </h4>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
