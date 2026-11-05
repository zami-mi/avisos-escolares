import { useState } from "react";
import NoticeCard from "../components/notices/NoticeCard";
import NoticeFilters from "../components/notices/NoticeFilters";
import NoticeDetailModal from "../components/common/NoticeDetailModal";
import CreateNoticeModal from "../components/notices/CreateNoticeModal";
import NoticeTimeline from "../components/common/NoticeTimeline";

export default function PreceptorDashboard({
  currentUser,
  notices = [],
  onAddNotice,
  onDeleteNotice,
}) {
  const [activeTab, setActiveTab] = useState("avisos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isCreateNoticeOpen, setIsCreateNoticeOpen] = useState(false);

  // Divisiones reales asignadas al preceptor según la base de datos
  const myDivisions = currentUser?.divisiones || [];

  // Avisos de sus divisiones
  const divisionNotices = notices.filter((n) => {
    const target = n.destinatario || "";
    const isMyDivision = myDivisions.length > 0 && myDivisions.some((div) => target.includes(div));
    const isFromPreceptor = n.rolAutor === "preceptor" || (currentUser?.nombre && n.autor?.toLowerCase().includes(currentUser.nombre.toLowerCase()));
    return isMyDivision || isFromPreceptor || target === "Todos";
  });

  // Avisos publicados por el preceptor
  const myNotices = divisionNotices.filter((n) =>
    (currentUser?.id_usuario && n.id_usuario === currentUser.id_usuario) ||
    (n.rolAutor === "preceptor" && currentUser?.nombre && n.autor?.toLowerCase().includes(currentUser.nombre.toLowerCase()))
  );

  const filteredNotices = divisionNotices.filter((notice) => {
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
          <h1>Panel de preceptoría - {currentUser?.nombre}</h1>
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

      <NoticeTimeline
        notices={divisionNotices}
        onSelectNotice={setSelectedNotice}
      />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Avisos de mis cursos</div>
          <div className="stat-value">{divisionNotices.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mis avisos publicados</div>
          <div className="stat-value" style={{ color: "#3182ce" }}>
            {myNotices.length}
          </div>
        </div>
      </div>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "avisos" ? "active" : ""}`}
          onClick={() => setActiveTab("avisos")}
        >
          <i className="fa-regular fa-bell"></i> Avisos de mis cursos ({divisionNotices.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "misAvisos" ? "active" : ""}`}
          onClick={() => setActiveTab("misAvisos")}
        >
          <i className="fa-solid fa-pen-to-square"></i> Mis avisos ({myNotices.length})
        </button>
      </div>

      {activeTab === "avisos" ? (
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
                  canDelete={
                    notice.rolAutor === "preceptor" ||
                    (currentUser?.id_usuario && notice.id_usuario === currentUser.id_usuario) ||
                    (currentUser?.nombre && notice.autor?.toLowerCase().includes(currentUser.nombre.toLowerCase()))
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No hay avisos para tus cursos</h3>
            </div>
          )}
        </div>
      ) : (
        <div>
          <NoticeFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          {filteredMyNotices.length > 0 ? (
            <div className="notices-grid">
              {filteredMyNotices.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  onSelect={setSelectedNotice}
                  onDelete={onDeleteNotice}
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
        isOpen={isCreateNoticeOpen}
        onClose={() => setIsCreateNoticeOpen(false)}
        onSave={onAddNotice}
        currentUser={currentUser}
      />
    </div>
  );
}
