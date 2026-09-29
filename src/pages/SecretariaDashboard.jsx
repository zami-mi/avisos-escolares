import React, { useState, useEffect } from "react";
import AbsenceTable from "../components/absences/AbsenceTable";
import NoticeCard from "../components/notices/NoticeCard";
import NoticeFilters from "../components/notices/NoticeFilters";
import NoticeDetailModal from "../components/common/NoticeDetailModal";

export default function SecretariaDashboard({
  currentUser,
  notices,
  absences = [],
}) {
  const [activeTab, setActiveTab] = useState("registroAusencias");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedNotice, setSelectedNotice] = useState(null);

  // Filtros de la tabla de ausencias
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroDocente, setFiltroDocente] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("");

  // Resumen estadístico desde MySQL
  const [resumen, setResumen] = useState(null);

  // Cargar resumen al entrar a la pestaña de ausencias
  useEffect(() => {
    if (activeTab !== "registroAusencias") return;
    fetch("http://localhost:3002/api/ausencias/resumen")
      .then((r) => r.json())
      .then((d) => { if (d && d.total !== undefined) setResumen(d); })
      .catch(() => {});
  }, [activeTab]);

  // Obtener lista de docentes únicos para el selector de filtro
  const docentesUnicos = [...new Map(
    absences.map((a) => [a.profesorId, { id: a.profesorId, nombre: a.profesorNombre }])
  ).values()];

  // Obtener lista de cursos únicos para el selector de filtro
  const cursosUnicos = [...new Map(
    absences.map((a) => [a.id_curso, { id: a.id_curso, nombre: a.curso }])
  ).values()];

  // Aplicar filtros localmente sobre la prop absences
  const ausenciasFiltradas = absences.filter((a) => {
    const matchEstado =
      filtroEstado === "todos" ||
      a.estado === filtroEstado;
    const matchDocente =
      filtroDocente === "" ||
      String(a.profesorId) === filtroDocente;
    const matchCurso =
      filtroCurso === "" ||
      String(a.id_curso) === filtroCurso;
    return matchEstado && matchDocente && matchCurso;
  });

  const pendientesCount = absences.filter((a) => a.estado === "pendiente").length;
  const confirmadasCount = absences.filter((a) => a.estado === "confirmada").length;

  // Avisos relevantes para secretaría: todos (lectura del registro institucional completo)
  const filteredNotices = notices.filter((notice) => {
    const matchesSearch =
      notice.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.contenido.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" || notice.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const resetFiltros = () => {
    setFiltroEstado("todos");
    setFiltroDocente("");
    setFiltroCurso("");
  };

  return (
    <div className="dashboard-content">
      <div className="welcome-hero">
        <div className="hero-text">
          <h1>
            <i className="fa-solid fa-building" style={{ marginRight: "10px" }}></i>
            Secretaría
          </h1>
          <p>
            Responsable: <strong>{currentUser?.nombre} {currentUser?.apellido}</strong>
          </p>
        </div>
      </div>

      {/* Estadísticas desglosadas */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total ausencias</div>
          <div className="stat-value">{absences.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            <i className="fa-solid fa-hourglass-half" style={{ marginRight: "5px", color: "#c05621" }}></i>
            Pendientes
          </div>
          <div className="stat-value" style={{ color: pendientesCount > 0 ? "#dd6b20" : "#2d3748" }}>
            {pendientesCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            <i className="fa-solid fa-check" style={{ marginRight: "5px", color: "#22543d" }}></i>
            Confirmadas
          </div>
          <div className="stat-value" style={{ color: "#22543d" }}>
            {confirmadasCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avisos registrados</div>
          <div className="stat-value" style={{ color: "#3182ce" }}>{notices.length}</div>
        </div>
      </div>

      {/* Alerta si hay ausencias pendientes */}
      {pendientesCount > 0 && (
        <div
          style={{
            backgroundColor: "#fffaf0",
            border: "1px solid #feebc8",
            borderRadius: "8px",
            padding: "12px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <i className="fa-solid fa-triangle-exclamation" style={{ color: "#c05621", fontSize: "1.2rem" }}></i>
          <span style={{ color: "#c05621", fontWeight: "600" }}>
            Hay {pendientesCount} ausencia(s) pendiente(s) de confirmación por Preceptoría.
          </span>
        </div>
      )}

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "registroAusencias" ? "active" : ""}`}
          onClick={() => setActiveTab("registroAusencias")}
        >
          <i className="fa-solid fa-clipboard-list"></i> Registro de ausencias ({absences.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "avisosTodos" ? "active" : ""}`}
          onClick={() => setActiveTab("avisosTodos")}
        >
          <i className="fa-solid fa-bullhorn"></i> Todos los avisos ({notices.length})
        </button>
      </div>

      {activeTab === "registroAusencias" ? (
        <div>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ margin: 0, color: "#2d3748" }}>Historial de ausencias</h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#718096" }}>
                Planilla de inasistencias presentadas por los docentes.
              </p>
            </div>
          </div>

          {/* Filtros de la tabla */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "16px",
              padding: "14px",
              backgroundColor: "#f7fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#4a5568" }}>
              <i className="fa-solid fa-filter" style={{ marginRight: "5px" }}></i>Filtrar por:
            </span>

            {/* Filtro estado */}
            <select
              id="filtro-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e0", fontSize: "0.85rem", color: "#2d3748" }}
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmada">Confirmadas</option>
            </select>

            {/* Filtro docente */}
            <select
              id="filtro-docente"
              value={filtroDocente}
              onChange={(e) => setFiltroDocente(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e0", fontSize: "0.85rem", color: "#2d3748" }}
            >
              <option value="">Todos los docentes</option>
              {docentesUnicos.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.nombre}</option>
              ))}
            </select>

            {/* Filtro curso */}
            <select
              id="filtro-curso"
              value={filtroCurso}
              onChange={(e) => setFiltroCurso(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e0", fontSize: "0.85rem", color: "#2d3748" }}
            >
              <option value="">Todos los cursos</option>
              {cursosUnicos.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.nombre}</option>
              ))}
            </select>

            {(filtroEstado !== "todos" || filtroDocente !== "" || filtroCurso !== "") && (
              <button
                onClick={resetFiltros}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#e2e8f0",
                  color: "#4a5568",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                <i className="fa-solid fa-xmark" style={{ marginRight: "4px" }}></i>
                Limpiar filtros
              </button>
            )}

            <span style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#718096" }}>
              Mostrando <strong>{ausenciasFiltradas.length}</strong> de <strong>{absences.length}</strong> registros
            </span>
          </div>

          <AbsenceTable
            absences={ausenciasFiltradas}
            canConfirm={false}
            emptyMessage={
              absences.length === 0
                ? "No hay registros de ausencias asentados actualmente."
                : "No hay ausencias que coincidan con los filtros seleccionados."
            }
          />
        </div>
      ) : (
        /* Pestaña: Todos los avisos — solo lectura para Secretaría */
        <div>
          <div style={{ marginBottom: "14px" }}>
            <h3 style={{ margin: 0, color: "#2d3748" }}>Registro institucional de avisos</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#718096" }}>
              Todos los comunicados publicados en el sistema.
            </p>
          </div>

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
              <h3>No hay avisos</h3>
              <p>No se encontraron avisos que coincidan con la búsqueda.</p>
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
    </div>
  );
}
