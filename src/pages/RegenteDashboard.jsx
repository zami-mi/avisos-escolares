import { useState, useEffect } from "react";
import NoticeCard from "../components/notices/NoticeCard";
import NoticeFilters from "../components/notices/NoticeFilters";
import NoticeDetailModal from "../components/common/NoticeDetailModal";
import CreateNoticeModal from "../components/notices/CreateNoticeModal";
import EditNoticeModal from "../components/notices/EditNoticeModal";
import { noticeService } from "../services";
import NoticeTimeline from "../components/common/NoticeTimeline";
import { isAutoridad } from "../data/mockData";

export default function RegenteDashboard({
  currentUser,
  notices = [],
  onAddNotice,
  onEditNotice,
  onDeleteNotice,
}) {
  const [activeTab, setActiveTab] = useState("avisos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  // Avisos propios del regente cargados desde la base de datos
  const [myNotices, setMyNotices] = useState([]);
  const [loadingMyNotices, setLoadingMyNotices] = useState(false);

  // Cargar avisos del regente al acceder a la solapa misAvisos
  useEffect(() => {
    let activo = true;
    if (activeTab === "misAvisos" && currentUser?.id_usuario) {
      noticeService.getByAuthor(currentUser.id_usuario)
        .then((data) => {
          if (activo && Array.isArray(data)) setMyNotices(data);
        })
        .catch((err) => console.error("Error al cargar mis avisos:", err))
        .finally(() => {
          if (activo) setLoadingMyNotices(false);
        });
    }
    return () => { activo = false; };
  }, [activeTab, currentUser?.id_usuario]);

  const handleDeleteMyNotice = async (noticeId) => {
    await onDeleteNotice(noticeId);
    setMyNotices((prev) => prev.filter((n) => n.id !== noticeId));
  };

  const handleEditMyNotice = async (updatedNotice) => {
    const result = await onEditNotice(updatedNotice);
    if (result) {
      setMyNotices((prev) => prev.map((n) => (n.id === result.id ? result : n)));
    }
    return result;
  };

  const handleAddNoticeRegente = async (newNotice) => {
    await onAddNotice(newNotice);
    if (currentUser?.id_usuario) {
      noticeService.getByAuthor(currentUser.id_usuario)
        .then((data) => { if (Array.isArray(data)) setMyNotices(data); })
        .catch(() => { });
    }
  };

  // Avisos emitidos por cualquier rol de autoridad (regente, jefe de taller, directivo, etc.)
  const regenteNotices = notices.filter((n) => isAutoridad(n.rolAutor));

  const filteredNotices = regenteNotices.filter((notice) => {
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
          <i className="fa-solid fa-building-columns"></i>¡Hola, <strong>{currentUser?.nombre} {currentUser?.apellido}</strong>!</h1>
          <p>Panel de administración escolar</p>
        </div>
        <div className="hero-actions">
          <button
            className="btn-primary-action"
            onClick={() => setIsCreateOpen(true)}
          >Crear aviso</button>
        </div>
      </div>

      <NoticeTimeline
        notices={regenteNotices}
        onSelectNotice={setSelectedNotice}
      />

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total de avisos</div>
          <div className="stat-value">{regenteNotices.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mis avisos publicados</div>
          <div className="stat-value" style={{ color: "#3182ce" }}>
            {myNotices.length > 0 ? myNotices.length : regenteNotices.filter(n => n.rolAutor === "regente").length}
          </div>
        </div>
      </div>

      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "avisos" ? "active" : ""}`}
          onClick={() => setActiveTab("avisos")}
        >
          <i className="fa-solid fa-magnifying-glass"></i>Todos los avisos ({regenteNotices.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "misAvisos" ? "active" : ""}`}
          onClick={() => setActiveTab("misAvisos")}
        >
          <i className="fa-solid fa-pen-to-square"></i> Mis avisos
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
              {filteredNotices.map((notice) => {
                const isAuthor =
                  notice.rolAutor === "regente" ||
                  (currentUser?.id_usuario && notice.id_usuario === currentUser.id_usuario) ||
                  (currentUser?.nombre && notice.autor?.toLowerCase().includes(currentUser.nombre.toLowerCase()));
                return (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    onSelect={setSelectedNotice}
                    onDelete={onDeleteNotice}
                    onEdit={setEditingNotice}
                    canDelete={isAuthor}
                    canEdit={isAuthor}
                  />
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No se encontraron avisos</h3>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, color: "#2d3748" }}>Mis avisos publicados</h3>
            </div>
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
                  onEdit={setEditingNotice}
                  canDelete={true}
                  canEdit={true}
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

      <EditNoticeModal
        isOpen={!!editingNotice}
        notice={editingNotice}
        onClose={() => setEditingNotice(null)}
        onSave={handleEditMyNotice}
        currentUser={currentUser}
      />
    </div>
  );
}
