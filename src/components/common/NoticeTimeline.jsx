
import { useState } from "react";

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function diffDays(noticeDate, today) {
  return Math.round((noticeDate - today) / (1000 * 60 * 60 * 24));
}

function formatFecha(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

const PRIORIDAD_COLORS = {
  alta:    { bg: "#fff5f5", border: "#fed7d7", dot: "#c53030", label: "#c53030" },
  urgente: { bg: "#fff5f5", border: "#fed7d7", dot: "#c53030", label: "#c53030" },
  normal:  { bg: "#f0f4ff", border: "#c3dafe", dot: "#3182ce", label: "#2b6cb0" },
  baja:    { bg: "#f0fff4", border: "#c6f6d5", dot: "#38a169", label: "#276749" },
};

function getColors(prioridad) {
  return PRIORIDAD_COLORS[(prioridad || "normal").toLowerCase()] ?? PRIORIDAD_COLORS.normal;
}

function NoticeRow({ notice, onSelect, dateLabel }) {
  const colors = getColors(notice.prioridad);
  return (
    <button
      onClick={() => onSelect && onSelect(notice)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        padding: "9px 10px",
        borderRadius: "6px",
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        marginBottom: "6px",
        transition: "box-shadow 0.15s",
        boxSizing: "border-box",
      }}
      title={notice.contenido}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: colors.dot,
          flexShrink: 0,
          marginTop: "5px",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.83rem",
            fontWeight: "600",
            color: "#2d3748",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {notice.titulo}
        </div>
        <div
          style={{
            fontSize: "0.73rem",
            color: "#718096",
            display: "flex",
            gap: "6px",
            marginTop: "2px",
            flexWrap: "wrap",
          }}
        >
          <span>{notice.destinatario || "Todos"}</span>
          <span>·</span>
          <span style={{ color: colors.label, fontWeight: "600" }}>{dateLabel}</span>
        </div>
      </div>
    </button>
  );
}

function TimelineColumn({ icon, iconColor, title, emptyText, children }) {
  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <i className={icon} style={{ color: iconColor, fontSize: "0.7rem" }} />
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: "700",
            color: "#4a5568",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {title}
        </span>
      </div>
      {children ?? (
        <p style={{ fontSize: "0.8rem", color: "#a0aec0", fontStyle: "italic", margin: 0 }}>
          {emptyText}
        </p>
      )}
    </div>
  );
}

export default function NoticeTimeline({ notices = [], onSelectNotice }) {
  const [expanded, setExpanded] = useState(true);
  const today = todayLocal();

  const publicadosHoy       = [];   
  const publicadosRecientes = [];   
  const proximos            = [];   

  notices.forEach((n) => {
    const d = parseLocalDate(n.fecha);
    if (!d) return;
    const diff = diffDays(d, today);

    if (diff === 0) {
      publicadosHoy.push(n);
    } else if (diff >= -7 && diff < 0) {
      publicadosRecientes.push({ notice: n, diff });
    } else if (diff > 0) {
      proximos.push({ notice: n, diff });
    }
    // diff < -7 → no aparece en el widget (sigue en el historial)
  });

  // Orden: hoy → más reciente publicado primero (por id desc si hay varios hoy);
  //        recientes → de ayer hacia atrás (-1, -2, …);
  //        próximos → más cercano primero (diff 1, 2, …)
  publicadosHoy.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  publicadosRecientes.sort((a, b) => b.diff - a.diff);
  proximos.sort((a, b) => a.diff - b.diff);

  const totalVisible = publicadosHoy.length + publicadosRecientes.length + proximos.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: "var(--radius-lg, 14px)",
        boxShadow: "var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.07))",
        marginBottom: "24px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "13px 18px",
          background: "transparent",
          border: "none",
          borderBottom: expanded ? "1px solid var(--border, #e2e8f0)" : "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <i
            className="fa-solid fa-calendar-days"
            style={{ color: "var(--primary, #b81b14)", fontSize: "0.95rem" }}
          />
          <span style={{ fontSize: "0.92rem", fontWeight: "700", color: "#1a202c" }}>
            Avisos por fecha de publicación
          </span>
          {totalVisible > 0 && (
            <span
              style={{
                backgroundColor: "var(--primary, #b81b14)",
                color: "#fff",
                fontSize: "0.68rem",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "20px",
              }}
            >
              {totalVisible}
            </span>
          )}
        </div>
        <i
          className={`fa-solid fa-chevron-${expanded ? "up" : "down"}`}
          style={{ fontSize: "0.75rem", color: "#718096" }}
        />
      </button>

      <style>{`
        @media (max-width: 640px) {
          .notice-timeline-grid {
            grid-template-columns: 1fr !important;
          }
          .notice-timeline-grid > div {
            border-right: none !important;
            border-bottom: 1px solid var(--border, #e2e8f0);
          }
          .notice-timeline-grid > div:last-child {
            border-bottom: none;
          }
        }
        @media (min-width: 641px) and (max-width: 900px) {
          .notice-timeline-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .notice-timeline-grid > div:nth-child(2) {
            border-right: none !important;
          }
          .notice-timeline-grid > div:last-child {
            grid-column: 1 / -1;
            border-right: none !important;
            border-top: 1px solid var(--border, #e2e8f0);
          }
        }
      `}</style>

      {/* Cuerpo con tres columnas */}
      {expanded && (
        <div
          className="notice-timeline-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
          }}
        >
          {/* Columna 1: Publicados hoy */}
          <div style={{ borderRight: "1px solid var(--border, #e2e8f0)" }}>
            <TimelineColumn
              icon="fa-solid fa-circle-dot"
              iconColor="#c53030"
              title="Publicados hoy"
              emptyText="Ningún aviso publicado hoy."
            >
              {publicadosHoy.length > 0
                ? publicadosHoy.map((n) => (
                    <NoticeRow
                      key={n.id}
                      notice={n}
                      onSelect={onSelectNotice}
                      dateLabel="Hoy"
                    />
                  ))
                : null}
            </TimelineColumn>
          </div>

        </div>
      )}

    </section>
  );
}
