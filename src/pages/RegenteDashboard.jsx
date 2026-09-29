import React, { useState, useEffect } from "react";
import AbsenceTable from "../components/absences/AbsenceTable";
import NoticeCard from "../components/notices/NoticeCard";
import NoticeFilters from "../components/notices/NoticeFilters";
import NoticeDetailModal from "../components/common/NoticeDetailModal";
import CreateNoticeModal from "../components/notices/CreateNoticeModal";

export default function RegenteDashboard({
  currentUser,
  notices,
  absences = [],
  onAddNotice,
  onDeleteNotice,
}) {
  const [activeTab, setActiveTab] = useState("ausencias");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Avisos propios del regente cargados desde MySQL
  const [myNotices, setMyNotices] = useState([]);
  const [loadingMyNotices, setLoadingMyNotices] = useState(false);

  // Cargar los avisos propios del regente desde MySQL cuando se entra a la solapa
  useEffect(() => {
    if (activeTab !== "misAvisos" || !currentUser?.id_usuario) return;

    setLoadingMyNotices(true);
    fetch(`http://localhost:3002/api/avisos/autor/${currentUser.id_usuario}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setMyNotices(data);
      })
      .catch((err) => console.error("Error al cargar mis avisos:", err))
      .finally(() => setLoadingMyNotices(false));
  }, [activeTab, currentUser?.id_usuario]);

  // Sincronizar myNotices cuando se elimina un aviso desde onDeleteNotice
  const handleDeleteMyNotice = async (noticeId) => {
    await onDeleteNotice(noticeId);
    setMyNotices((prev) => prev.filter((n) => n.id !== noticeId));
  };

  // También actualiza myNotices cuando se agrega un aviso nuevo
  const handleAddNoticeRegente = async (newNotice) => {
    await onAddNotice(newNotice);
    // Recargar mis avisos desde MySQL para que se sincronice el nuevo aviso
    if (currentUser?.id_usuario) {
      fetch(`http://localhost:3002/api/avisos/autor/${currentUser.id_usuario}`)
        .then((res) => res.json())
        .then((data) => { if (Array.isArray(data)) setMyNotices(data); })
        .catch(() => { });
    }
  };

  // Estadísticas
  const pendingAbsences = absences.filter((a) => a.estado === "pendiente");

  const filteredNotices = notices.filter((notice) => {
    const matchesSearch =
      notice.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.contenido.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" || notice.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredMyNotices = myNotices.filter((notice) => {
    const matchesSearch =
      notice.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.contenido.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" || notice.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="dashboard-content">
      <div className="welcome-hero">
        <div className="hero-text">
          <h1>
            <i className="fa-solid fa-building-columns" style={{ marginRight: "10px" }}></i>Panel de Regencia</h1>
          <p>
            Regente: <strong>{currentUser?.nombre} {currentUser?.apellido}</strong>
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="btn-primary-action"
            onClick={() => setIsCreateOpen(true)}
          >
            <i className="fa-solid fa-bullhorn"></i> Crear Aviso
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total de ausencias</div>
          <div className="stat-value">{absences.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ausencias pendientes</div>
          <div className="stat-value" style={{ color: pendingAbsences.length > 0 ? "#dd6b20" : "#2d3748" }}>
            {pendingAbsences.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mis avisos publicados</div>
          <div className="stat-value" style={{ color: "#3182ce" }}>
            {myNotices.length > 0 ? myNotices.length : notices.filter(n => n.rolAutor === "regente").length}
          </div>
        </div>
      </div>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "ausencias" ? "active" : ""}`}
          onClick={() => setActiveTab("ausencias")}
        >
          <i className="fa-solid fa-clipboard-list"></i>Ausencias docentes ({absences.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "avisos" ? "active" : ""}`}
          onClick={() => setActiveTab("avisos")}
        >
          <i className="fa-solid fa-magnifying-glass"></i>Todos los avisos ({notices.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "misAvisos" ? "active" : ""}`}
          onClick={() => setActiveTab("misAvisos")}
        >
          <i className="fa-solid fa-pen-to-square"></i> Mis Avisos
        </button>
      </div>

      {activeTab === "ausencias" ? (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ margin: 0, color: "#2d3748" }}>
              Panel de ausencias
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#718096" }}>
              Información de ausencias remitidas por profesores.
            </p>
          </div>

          <AbsenceTable
            absences={absences}
            canConfirm={false}
            emptyMessage="No hay registros de ausencias docentes en el sistema."
          />
        </div>
      ) : activeTab === "avisos" ? (
        <div>
          <NoticeFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          {filteredNotices.length > 0 ? (
            <div className="notices-grid">
              {filteredNotices.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  onSelect={setSelectedNotice}
                  onDelete={onDeleteNotice}
                  canDelete={notice.rolAutor === "regente" || notice.autor === `${currentUser?.nombre} ${currentUser?.apellido}`}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No se encontraron avisos</h3>
              <p>No hay avisos escolares que coincidan con la búsqueda.</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, color: "#2d3748" }}>Mis avisos publicados</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#718096" }}>Administra los avisos
              </p>
            </div>
            <button
              className="btn-primary-action"
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => setIsCreateOpen(true)}
            >
              <i className="fa-solid fa-plus"></i> Nuevo Aviso
            </button>
          </div>

          <NoticeFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          {loadingMyNotices ? (
            <div className="empty-state">
              <p>Cargando tus avisos...</p>
            </div>
          ) : filteredMyNotices.length > 0 ? (
            <div className="notices-grid">
              {filteredMyNotices.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  onSelect={setSelectedNotice}
                  onDelete={handleDeleteMyNotice}
                  canDelete={true}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No tenés avisos publicados</h3>
            </div>
          )}
        </div>
      )}

      {selectedNotice && (
        <NoticeDetailModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}

      <CreateNoticeModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleAddNoticeRegente}
        currentUser={currentUser}
      />
    </div>
  );
}
