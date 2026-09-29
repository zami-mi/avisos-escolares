
import React, { useState } from "react";
import NoticeCard from "../components/notices/NoticeCard";
import NoticeFilters from "../components/notices/NoticeFilters";
import NoticeDetailModal from "../components/common/NoticeDetailModal";

export default function AlumnoDashboard({
  currentUser,
  notices,
  readNoticeIds = [],
  onToggleRead,
  onMarkAllRead,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [viewFilter, setViewFilter] = useState("todos");
  const [selectedNotice, setSelectedNotice] = useState(null);

  const myCourseNotices = notices.filter((notice) => {
    const target = (notice.destinatario || "").toLowerCase();
    const course = (currentUser?.curso || "").toLowerCase();

    const isForStudent =
      !notice.id_curso ||
      target === "todos" ||
      target === "alumnos" ||
      target.includes("alumno") ||
      (course && target.includes(course)) ||
      (currentUser?.id_curso && notice.id_curso === currentUser.id_curso);

    return isForStudent;
  });

  const unreadCount = myCourseNotices.filter((n) => !readNoticeIds.includes(n.id)).length;

  const filteredNotices = myCourseNotices.filter((notice) => {
    const isRead = readNoticeIds.includes(notice.id);

    if (viewFilter === "noLeidas" && isRead) {
      return false;
    }
    const matchesSearch =
      notice.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.contenido.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "Todos" || notice.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const handleOpenNotice = (notice) => {
    setSelectedNotice(notice);
    if (!readNoticeIds.includes(notice.id)) {
      onToggleRead(notice.id);
    }
  };

  return (
    <div className="dashboard-content">
      <div className="welcome-hero">
        <div className="hero-text">
          <h1>¡Hola, {currentUser?.nombre}!</h1>
          <p>
            Estudiante de <strong>{currentUser?.curso}</strong> ({currentUser?.turno})
          </p>
        </div>

        {unreadCount > 0 && (
          <div className="hero-actions">
            <button
              className="btn-mark-all-read"
              onClick={onMarkAllRead}
            >
              <i className="fa-solid fa-check"></i> Marcar todas como leídas ({unreadCount})
            </button>
          </div>
        )}
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Avisos de mi Curso</div>
          <div className="stat-value">{myCourseNotices.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            <i className="fa-solid fa-bell" style={{ marginRight: "6px" }}></i>
            Notificaciones sin leer
          </div>
          <div
            className="stat-value"
            style={{ color: unreadCount > 0 ? "#e53e3e" : "#22543d" }}
          >
            {unreadCount}
          </div>
        </div>
      </div>
      <div className="tabs-nav">
        <button
          className={`tab-btn ${viewFilter === "todos" ? "active" : ""}`}
          onClick={() => setViewFilter("todos")}
        >
          <i className="fa-solid fa-list"></i> Todos los Avisos ({myCourseNotices.length})
        </button>
        <button
          className={`tab-btn ${viewFilter === "noLeidas" ? "active" : ""}`}
          onClick={() => setViewFilter("noLeidas")}
        >
          <i className="fa-solid fa-bell"></i>No leídos ({unreadCount})
        </button>
      </div>

      <NoticeFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {filteredNotices.length > 0 ? (
        <div className="notices-grid">
          {filteredNotices.map((notice) => {
            const isRead = readNoticeIds.includes(notice.id);
            return (
              <NoticeCard
                key={notice.id}
                notice={notice}
                onSelect={handleOpenNotice}
                isRead={isRead}
                onToggleRead={onToggleRead}
              />
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h3>
            {viewFilter === "noLeidas"
              ? "No tenés notificaciones pendientes."
              : "No se encontraron avisos para tu curso."}
          </h3>
          <p>
            {viewFilter === "noLeidas"
              ? "Todas las novedades de tu curso ya fueron marcadas como leídas."
              : "Probá cambiando los términos de búsqueda o las categorías."}
          </p>
        </div>
      )}

      {selectedNotice && (
        <NoticeDetailModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}
    </div>
  );
}
