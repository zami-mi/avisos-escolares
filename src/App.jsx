import { useState, useEffect } from "react";
import "./App.css";
import "./styles/dashboard.css";

import { ROLES } from "./data/mockData";
import { noticeService, absenceService, notificationService } from "./services";
import Header from "./components/common/Header";
import LoginPage from "./pages/LoginPage";
import AlumnoDashboard from "./pages/AlumnoDashboard";
import ProfesorDashboard from "./pages/ProfesorDashboard";
import PreceptorDashboard from "./pages/PreceptorDashboard";
import RegenteDashboard from "./pages/RegenteDashboard";
import SecretariaDashboard from "./pages/SecretariaDashboard";

function App() {
  // Estado de usuario autenticado mediante la BD real
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("avisos_current_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Estados de datos escolares reales
  const [notices, setNotices] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [readNoticeIds, setReadNoticeIds] = useState([]);

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

        let absencesPromise = Promise.resolve([]);
        if (currentUser.rol === ROLES.PROFESOR) {
          absencesPromise = absenceService.getByProfesor(currentUser.id_usuario);
        } else if (currentUser.rol === ROLES.PRECEPTOR) {
          absencesPromise = absenceService.getByPreceptor(currentUser.id_usuario);
        } else if (currentUser.rol !== ROLES.ALUMNO) {
          absencesPromise = absenceService.getAll();
        }

        const notificationsPromise = currentUser.id_usuario
          ? notificationService.getReadNotices(currentUser.id_usuario)
          : Promise.resolve([]);

        const [noticesData, absencesData, notificationsData] = await Promise.all([
          noticesPromise,
          absencesPromise,
          notificationsPromise,
        ]);

        if (isMounted) {
          if (Array.isArray(noticesData)) {
            setNotices(noticesData);
            setConnectionError(null);
          }
          if (Array.isArray(absencesData)) {
            setAbsences(absencesData);
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
  function handleLogin(user) {
    setLoading(true);
    setCurrentUser(user);
    localStorage.setItem("avisos_current_user", JSON.stringify(user));
  }

  function handleLogout() {
    setLoading(false);
    setCurrentUser(null);
    localStorage.removeItem("avisos_current_user");
    setNotices([]);
    setAbsences([]);
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

  async function handleAddAbsence(newAbsence) {
    try {
      const ausenciaCreada = await absenceService.create({
        id_horario: newAbsence.id_horario,
        fecha: newAbsence.fecha,
        motivo: newAbsence.motivo,
        notificar_familias: newAbsence.notificar_familias,
      });

      setAbsences((prev) => [ausenciaCreada, ...prev]);
      alert(
        `Una vez confirmado por preceptoría, los alumnos de ${ausenciaCreada.curso || 'la división'} recibirán la notificación.`
      );
    } catch (error) {
      console.error("Error al registrar ausencia:", error);
      alert(error.message || "No se pudo registrar la ausencia.");
    }
  }

  async function handleConfirmAbsence(absenceId) {
    const targetAbsence = absences.find((a) => a.id === absenceId);
    if (!targetAbsence) return;

    try {
      const resultado = await absenceService.confirm(absenceId, {
        id_usuario: currentUser?.id_usuario,
        confirmado_por: currentUser?.nombre ? `${currentUser.nombre} ${currentUser.apellido || ""}`.trim() : "Preceptoría",
      });

      setAbsences((prev) =>
        prev.map((a) => (a.id === absenceId ? resultado.ausencia : a))
      );

      if (resultado.aviso) {
        setNotices((prev) => [resultado.aviso, ...prev]);
      }

      alert(
        `Ausencia confirmada para los alumnos de ${resultado.ausencia.curso}.`
      );
    } catch (error) {
      console.error("Error al confirmar ausencia:", error);
      alert(error.message || "No se pudo confirmar la ausencia.");
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
    const studentNotices = notices.filter((n) => {
      const target = (n.destinatario || "").toLowerCase();
      return (
        !n.id_curso ||
        target === "todos" ||
        target === "alumnos" ||
        (studentCourse && target.includes(studentCourse)) ||
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

      case ROLES.PROFESOR:
        return (
          <ProfesorDashboard
            currentUser={currentUser}
            notices={notices}
            absences={absences}
            onAddAbsence={handleAddAbsence}
          />
        );

      case ROLES.PRECEPTOR:
        return (
          <PreceptorDashboard
            currentUser={currentUser}
            notices={notices}
            absences={absences}
            onConfirmAbsence={handleConfirmAbsence}
            onAddNotice={handleAddNotice}
            onDeleteNotice={handleDeleteNotice}
          />
        );

      case ROLES.REGENTE:
        return (
          <RegenteDashboard
            currentUser={currentUser}
            notices={notices}
            absences={absences}
            onAddNotice={handleAddNotice}
            onDeleteNotice={handleDeleteNotice}
          />
        );

      case ROLES.SECRETARIA:
        return (
          <SecretariaDashboard
            currentUser={currentUser}
            notices={notices}
            absences={absences}
          />
        );

      default:
        return (
          <div className="dashboard-content">
            <div className="empty-state">
              <h3>Rol no reconocido</h3>
              <p>El rol "{currentUser.rol}" no tiene un panel configurado en el sistema.</p>
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
