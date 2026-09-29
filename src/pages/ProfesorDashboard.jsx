import React, { useState } from "react";
import AbsenceTable from "../components/absences/AbsenceTable";
import CreateAbsenceModal from "../components/absences/CreateAbsenceModal";
import NoticeCard from "../components/notices/NoticeCard";
import NoticeFilters from "../components/notices/NoticeFilters";
import NoticeDetailModal from "../components/common/NoticeDetailModal";

export default function ProfesorDashboard({
  currentUser,
  notices,
  absences = [],
  onAddAbsence,
}) {
  const [activeTab, setActiveTab] = useState("misAusencias");
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedNotice, setSelectedNotice] = useState(null);

  const myAbsences = absences.filter(
    (a) =>
      a.profesorId === currentUser?.id ||
      a.profesorId === currentUser?.id_usuario ||
      a.profesorNombre === currentUser?.nombre ||
      a.profesorNombre === `${currentUser?.nombre} ${currentUser?.apellido}`
  );

  const pendingAbsences = myAbsences.filter((a) => a.estado === "pendiente");
  const confirmedAbsences = myAbsences.filter((a) => a.estado === "confirmada");

  const institutionalNotices = notices.filter(
    (n) =>
      n.destinatario === "Todos" ||
      n.destinatario === "Docentes" ||
      n.categoria === "Institucional"
  );

  const filteredNotices = institutionalNotices.filter((notice) => {
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
          <h1>Panel Docente - {currentUser?.nombre}</h1>
          <p>
            Materias: <strong>{currentUser?.materias?.join(", ")}</strong> &bull; Cursos asignados:{" "}
            <strong>{currentUser?.cursosAsignados?.join(", ")}</strong>
          </p>
        </div>
        <div className="hero-actions">
          <button
            className="btn-primary-action"
            onClick={() => setIsAbsenceModalOpen(true)}
          >
            <i className="fa-solid fa-file-medical"></i> Informar Ausencia
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Ausencias pendientes</div>
          <div className="stat-value" style={{ color: pendingAbsences.length > 0 ? "#dd6b20" : "#2d3748" }}>
            {pendingAbsences.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ausencias confirmadas</div>
          <div className="stat-value" style={{ color: "#22543d" }}>
            {confirmedAbsences.length}
          </div>
        </div>
      </div>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "misAusencias" ? "active" : ""}`}
          onClick={() => setActiveTab("misAusencias")}
        >
          <i className="fa-regular fa-file-lines"></i> Mis ausencias ({myAbsences.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "circulares" ? "active" : ""}`}
          onClick={() => setActiveTab("circulares")}
        >
          <i className="fa-regular fa-bell"></i> Avisos Escolares({institutionalNotices.length})
        </button>
      </div>

      {activeTab === "misAusencias" ? (
        <div>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "#2d3748" }}>Historial</h3>
            <button
              className="btn-primary-action"
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => setIsAbsenceModalOpen(true)}
            >
              <i className="fa-solid fa-plus"></i> Nueva Ausencia
            </button>
          </div>

          <AbsenceTable
            absences={myAbsences}
            canConfirm={false}
            emptyMessage="No has informado ausencias."
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
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No hay avisos escolares</h3>
              <p>No se encontraron publicaciones con los filtros aplicados.</p>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <CreateAbsenceModal
        isOpen={isAbsenceModalOpen}
        onClose={() => setIsAbsenceModalOpen(false)}
        onSave={onAddAbsence}
        currentUser={currentUser}
      />

      {selectedNotice && (
        <NoticeDetailModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}
    </div>
  );
}
