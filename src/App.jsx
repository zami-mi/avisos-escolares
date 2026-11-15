import { useState, useEffect } from "react";
import "./App.css";
import "./styles/dashboard.css";

import { ROLES, isAutoridad } from "./data/mockData";
import { noticeService, notificationService } from "./services";
import Header from "./components/common/Header";
import ChangePasswordModal from "./components/common/ChangePasswordModal";
import LoginPage from "./pages/LoginPage";
import AlumnoDashboard from "./pages/AlumnoDashboard";
import PreceptorDashboard from "./pages/PreceptorDashboard";
import RegenteDashboard from "./pages/RegenteDashboard";

function App() {
  // Estado de usuario autenticado mediante la BD real
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("avisos_current_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Estados de datos escolares reales
  const [notices, setNotices] = useState([]);
  const [readNoticeIds, setReadNoticeIds] = useState([]);

  // Estado para el modal de cambio de contraseña
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Estados de carga y error de conexión
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("avisos_current_user")));
  const [connectionError, setConnectionError] = useState(null);

  // Carga unificada de datos escolares según el usuario autenticado
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    async function fetchData() {
      try {
        const noticesPromise = noticeService.getAll();

        const notificationsPromise = currentUser.id_usuario
          ? notificationService.getReadNotices(currentUser.id_usuario)
          : Promise.resolve([]);

        const [noticesData, notificationsData] = await Promise.all([
          noticesPromise,
          notificationsPromise,
        ]);

        if (isMounted) {
          if (Array.isArray(noticesData)) {
            setNotices(noticesData);
            setConnectionError(null);
          }
          if (Array.isArray(notificationsData)) {
            setReadNoticeIds(notificationsData);
          }
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error al cargar datos escolares:", error);
          setConnectionError(error.message || "Error al conectar con la base de datos");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Manejadores de sesión estricta
  function handleLogin(user, token) {
    setLoading(true);
    setCurrentUser(user);
    localStorage.setItem("avisos_current_user", JSON.stringify(user));
    if (token) {
      localStorage.setItem("avisos_auth_token", token);
    }
  }

  function handleLogout() {
    setLoading(false);
    setCurrentUser(null);
    localStorage.removeItem("avisos_current_user");
    localStorage.removeItem("avisos_auth_token");
    setNotices([]);
    setReadNoticeIds([]);
    setConnectionError(null);
  }

  async function handleAddNotice(newNotice) {
    try {
      const avisoCreado = await noticeService.create({
        titulo: newNotice.titulo,
        contenido: newNotice.contenido,
        categoria: newNotice.categoria,
        destinatario: newNotice.destinatario,
        prioridad: newNotice.prioridad,
        id_usuario: currentUser?.id_usuario,
        notificar_familias: newNotice.notificar_familias,
      });

      setNotices((prev) => [avisoCreado, ...prev]);
      return avisoCreado;
    } catch (error) {
      console.error("Error al publicar aviso:", error);
      throw error;
    }
  }

  async function handleEditNotice(updatedNotice) {
    try {
      const result = await noticeService.update(updatedNotice.id, {
        titulo: updatedNotice.titulo,
        contenido: updatedNotice.contenido,
        categoria: updatedNotice.categoria,
        destinatario: updatedNotice.destinatario,
        prioridad: updatedNotice.prioridad,
      });
      setNotices((prev) => prev.map((n) => (n.id === result.id ? result : n)));
      return result;
    } catch (error) {
      console.error("Error al editar aviso:", error);
      throw error;
    }
  }

  async function handleDeleteNotice(noticeId) {
    if (!window.confirm("¿Estás seguro de que deseás eliminar este aviso?")) return;

    try {
      await noticeService.delete(noticeId);
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
    } catch (error) {
      console.error("Error al eliminar aviso:", error);
      alert(error.message || "Error al eliminar el aviso.");
    }
  }

  // Notificaciones de lectura (Alumno)
  async function handleToggleReadNotice(noticeId) {
    setReadNoticeIds((prev) =>
      prev.includes(noticeId) ? prev.filter((id) => id !== noticeId) : [...prev, noticeId]
    );

    try {
      await notificationService.toggleRead(currentUser.id_usuario, noticeId);
    } catch (error) {
      console.error("Error al alternar estado de lectura:", error);
    }
  }

  async function handleMarkAllRead() {
    const studentCourse = (currentUser?.curso || "").toLowerCase();
    const studentTurno = (currentUser?.turno || "").toLowerCase();
    const studentNotices = notices.filter((n) => {
      const target = (n.destinatario || "").toLowerCase();
      return (
        !n.id_curso ||
        target === "todos" ||
        target === "alumnos" ||
        (studentCourse && target.includes(studentCourse)) ||
        (studentTurno && target.includes(studentTurno)) ||
        (currentUser?.id_curso && n.id_curso === currentUser.id_curso)
      );
    });

    const allIds = studentNotices.map((n) => n.id);
    setReadNoticeIds((prev) => Array.from(new Set([...prev, ...allIds])));

    try {
      await notificationService.markAllAsRead(currentUser.id_usuario, allIds);
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  const renderDashboardByRole = () => {
    switch (currentUser.rol) {
      case ROLES.ALUMNO:
        return (
          <AlumnoDashboard
            currentUser={currentUser}
            notices={notices}
            readNoticeIds={readNoticeIds}
            onToggleRead={handleToggleReadNotice}
            onMarkAllRead={handleMarkAllRead}
          />
        );

      case ROLES.PRECEPTOR:
        return (
          <PreceptorDashboard
            currentUser={currentUser}
            notices={notices}
            onAddNotice={handleAddNotice}
            onEditNotice={handleEditNotice}
            onDeleteNotice={handleDeleteNotice}
          />
        );

      case ROLES.REGENTE:
      case ROLES.JEFE_TALLER:
      case ROLES.AUTORIDAD:
      case ROLES.DIRECTIVO:
        return (
          <RegenteDashboard
            currentUser={currentUser}
            notices={notices}
            onAddNotice={handleAddNotice}
            onEditNotice={handleEditNotice}
            onDeleteNotice={handleDeleteNotice}
          />
        );

      default:
        // Catch-all para cualquier otro rol de autoridad no listado explícitamente
        if (isAutoridad(currentUser.rol)) {
          return (
            <RegenteDashboard
              currentUser={currentUser}
              notices={notices}
              onAddNotice={handleAddNotice}
              onEditNotice={handleEditNotice}
              onDeleteNotice={handleDeleteNotice}
            />
          );
        }
        // eslint-disable-next-line no-fallthrough
        return (
          <div className="dashboard-content">
            <div className="empty-state">
              <h3><i className="fa-solid fa-lock" style={{ marginRight: "8px" }}></i> Rol no disponible</h3>
              <p>El panel para el rol "{currentUser.rol}" no se encuentra activo en el sistema.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {connectionError && (
        <div style={{
          backgroundColor: "#fff5f5",
          border: "1px solid #feb2b2",
          color: "#c53030",
          padding: "12px 20px",
          margin: "16px 24px 0",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "0.9rem"
        }}>
          <i className="fa-solid fa-circle-exclamation"></i>
          <span><strong>Aviso de conexión:</strong> {connectionError}</span>
        </div>
      )}

      {loading ? (
        <div className="dashboard-content" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#718096" }}>Cargando datos...</p>
        </div>
      ) : (
        renderDashboardByRole()
      )}
    </div>
  );
}

export default App;
