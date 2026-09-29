import React, { useState } from "react";
import AbsenceTable from "../components/absences/AbsenceTable";
import NoticeCard from "../components/notices/NoticeCard";
import NoticeFilters from "../components/notices/NoticeFilters";
import NoticeDetailModal from "../components/common/NoticeDetailModal";
import CreateNoticeModal from "../components/notices/CreateNoticeModal";

export default function PreceptorDashboard({
  currentUser,
  notices,
  absences = [],
  onConfirmAbsence,
  onAddNotice,
  onDeleteNotice,
}) {
  const [activeTab, setActiveTab] = useState("ausencias");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isCreateNoticeOpen, setIsCreateNoticeOpen] = useState(false);

  // Filtrar ausencias relevantes para las divisiones del preceptor
  const myDivisions = currentUser?.divisiones && currentUser.divisiones.length > 0
    ? currentUser.divisiones
    : ["2° 2", "6° 1"];

  const relevantAbsences = absences.filter(
    (a) => !a.curso || myDivisions.includes(a.curso)
  );

  const pendingAbsences = relevantAbsences.filter((a) => a.estado === "pendiente");
  const confirmedAbsences = relevantAbsences.filter((a) => a.estado === "confirmada");

  // Avisos de sus divisiones
  const divisionNotices = notices.filter((n) => {
    const target = n.destinatario || "";
    const isMyDivision = myDivisions.some((div) => target.includes(div));
    const isFromPreceptor = n.rolAutor === "preceptor" || (currentUser?.nombre && n.autor?.toLowerCase().includes(currentUser.nombre.toLowerCase()));
    return isMyDivision || isFromPreceptor || target === "Todos";
  });

  const filteredNotices = divisionNotices.filter((notice) => {
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
          <h1>Panel de Preceptoría - {currentUser?.nombre}</h1>
          <p>
            Turno: <strong>{currentUser?.turno}</strong> • Divisiones a cargo:{" "}
            <strong>{myDivisions.join(", ")}</strong>
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="btn-primary-action"
            onClick={() => setIsCreateNoticeOpen(true)}
          >
            <i className="fa-solid fa-plus"></i> Crear aviso
          </button>
        </div>
      </div>
      {pendingAbsences.length > 0 && (
        <div
          style={{
            backgroundColor: "#fffaf0",
            border: "1px solid #feebc8",
            borderRadius: "8px",
            padding: "14px 18px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#c05621", fontSize: "1.3rem" }}></i>
            <div>
              <strong style={{ color: "#c05621" }}>
                Tenés {pendingAbsences.length} formulario(s) de ausencia docente pendiente(s) de confirmación.
              </strong>
              <div style={{ fontSize: "0.82rem", color: "#7b341e" }}>
                Al confirmar una ausencia, los alumnos del curso recibirán la notificación automática en su panel.
              </div>
            </div>
          </div>
          <button
            className="btn-pending-absences-action"
            onClick={() => setActiveTab("ausencias")}
          >
            Ver Ausencias Pendientes <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.75rem" }}></i>
          </button>
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Ausencias Pendientes</div>
          <div
            className="stat-value"
            style={{ color: pendingAbsences.length > 0 ? "#e53e3e" : "#22543d" }}
          >
            {pendingAbsences.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ausencias Confirmadas</div>
          <div className="stat-value" style={{ color: "#22543d" }}>
            {confirmedAbsences.length}
          </div>
        </div>
      </div>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "ausencias" ? "active" : ""}`}
          onClick={() => setActiveTab("ausencias")}
        >
          <i className="fa-regular fa-file-lines"></i>Ausencia Docente ({relevantAbsences.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "avisos" ? "active" : ""}`}
          onClick={() => setActiveTab("avisos")}
        >
          <i className="fa-regular fa-bell"></i> Avisos de mis Cursos ({divisionNotices.length})
        </button>
      </div>
      {activeTab === "ausencias" ? (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ margin: 0, color: "#2d3748" }}>
              Ausencia de docentes
            </h3>
          </div>

          <AbsenceTable
            absences={relevantAbsences}
            canConfirm={true}
            onConfirmAbsence={onConfirmAbsence}
            emptyMessage="No hay formularios de ausencia pendientes para tus divisiones."
          />
        </div>
      ) : (
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
                  canDelete={notice.rolAutor === "preceptor"}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No hay avisos para tus cursos</h3>
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
        isOpen={isCreateNoticeOpen}
        onClose={() => setIsCreateNoticeOpen(false)}
        onSave={onAddNotice}
        currentUser={currentUser}
      />
    </div>
  );
}
