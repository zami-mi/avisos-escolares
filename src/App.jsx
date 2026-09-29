import { useState, useEffect } from "react";
import "./App.css";
import "./styles/dashboard.css";

import { ROLES } from "./data/mockData";
import Header from "./components/common/Header";
import LoginPage from "./pages/LoginPage";
import AlumnoDashboard from "./pages/AlumnoDashboard";
import ProfesorDashboard from "./pages/ProfesorDashboard";
import PreceptorDashboard from "./pages/PreceptorDashboard";
import RegenteDashboard from "./pages/RegenteDashboard";
import SecretariaDashboard from "./pages/SecretariaDashboard";

function App() {
  // Estado de usuario conectado (recuperado de localStorage para persistir sesión básica)
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("avisos_current_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Estado de avisos escolares (cargado 100% desde MySQL mediante el backend)
  const [notices, setNotices] = useState([]);

  // Estado de ausencias informadas por profesores (cargado desde MySQL)
  const [absences, setAbsences] = useState([]);

  // Estado de notificaciones leídas por alumnos (cargado desde MySQL)
  const [readNoticeIds, setReadNoticeIds] = useState([]);

  // Carga inicial de avisos desde MySQL mediante la API del backend
  useEffect(() => {
    async function cargarAvisos() {
      try {
        const respuesta = await fetch("http://localhost:3002/api/avisos");
        if (respuesta.ok) {
          const data = await respuesta.json();
          if (Array.isArray(data)) {
            setNotices(data);
          }
        }
      } catch (error) {
        console.error("Error al cargar los avisos desde MySQL:", error);
      }
    }

    cargarAvisos();
  }, []);

  // Cargar ausencias desde MySQL (profesor ve las suyas, preceptor/regente/secretaría ven todas)
  useEffect(() => {
    if (!currentUser?.id_usuario || currentUser?.rol === 'alumno') return;

    async function cargarAusencias() {
      try {
        const url = currentUser.rol === 'profesor'
          ? `http://localhost:3002/api/ausencias/profesor/${currentUser.id_usuario}`
          : currentUser.rol === 'preceptor'
          ? `http://localhost:3002/api/ausencias/preceptor/${currentUser.id_usuario}`
          : `http://localhost:3002/api/ausencias`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            setAbsences(data);
          }
        }
      } catch (error) {
        console.error("Error al cargar ausencias desde MySQL:", error);
      }
    }

    cargarAusencias();
  }, [currentUser?.id_usuario, currentUser?.rol]);

  // Cargar notificaciones leídas desde MySQL cuando hay usuario conectado
  useEffect(() => {
    if (!currentUser?.id_usuario) {
      setReadNoticeIds([]);
      return;
    }

    async function cargarNotificacionesLeidas() {
      try {
        const resp = await fetch(`http://localhost:3002/api/notificaciones/${currentUser.id_usuario}`);
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            setReadNoticeIds(data);
          }
        }
      } catch (error) {
        console.error("Error al cargar notificaciones leídas:", error);
      }
    }

    cargarNotificacionesLeidas();
  }, [currentUser?.id_usuario]);

  // Manejadores de sesión
  function handleLogin(user) {
    setCurrentUser(user);
    localStorage.setItem("avisos_current_user", JSON.stringify(user));
  }

  function handleLogout() {
    setCurrentUser(null);
    localStorage.removeItem("avisos_current_user");
  }

  function handleSwitchRole(user) {
    setCurrentUser(user);
    localStorage.setItem("avisos_current_user", JSON.stringify(user));
  }

  // Manejador de publicación manual de avisos (Preceptor y Regente) — sincronizado con MySQL
  async function handleAddNotice(newNotice) {
    try {
      const resp = await fetch("http://localhost:3002/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: newNotice.titulo,
          contenido: newNotice.contenido,
          categoria: newNotice.categoria,
          destinatario: newNotice.destinatario,
          prioridad: newNotice.prioridad,
          id_usuario: currentUser?.id_usuario,
          notificar_familias: newNotice.notificar_familias,
        }),
      });

      if (resp.ok) {
        const avisoCreado = await resp.json();
        setNotices((prev) => [avisoCreado, ...prev]);
        alert("Aviso escolar publicado exitosamente.");
      } else {
        alert("Error al publicar el aviso en el servidor.");
      }
    } catch (error) {
      console.error("Error al publicar aviso:", error);
      setNotices((prev) => [newNotice, ...prev]);
    }
  }

  async function handleDeleteNotice(noticeId) {
    if (!window.confirm("¿Estás seguro de que deseás eliminar este aviso?")) return;

    try {
      const resp = await fetch(`http://localhost:3002/api/avisos/${noticeId}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        setNotices((prev) => prev.filter((n) => n.id !== noticeId));
      } else {
        alert("Error al eliminar el aviso.");
      }
    } catch (error) {
      console.error("Error al eliminar aviso:", error);
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
    }
  }

  // Manejador de envío de ausencia docente (Profesor) — sincronizado con MySQL
  async function handleAddAbsence(newAbsence) {
    try {
      const resp = await fetch("http://localhost:3002/api/ausencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_horario: newAbsence.id_horario,
          fecha: newAbsence.fecha,
          motivo: newAbsence.motivo,
          notificar_familias: newAbsence.notificar_familias,
        }),
      });

      if (resp.ok) {
        const ausenciaCreada = await resp.json();
        setAbsences((prev) => [ausenciaCreada, ...prev]);
        alert(
          `Formulario de ausencia enviado correctamente.\nFue remitido a Preceptoría, Regencia y Secretaría.\nLos alumnos de ${ausenciaCreada.curso} serán notificados una vez que Preceptoría confirme la ausencia.`
        );
      } else {
        alert("Error al registrar la ausencia en el servidor.");
      }
    } catch (error) {
      console.error("Error al enviar ausencia:", error);
      alert("No se pudo conectar con el servidor para registrar la ausencia.");
    }
  }

  // Manejador de confirmación de ausencia (Preceptor) -> Sincronizado con MySQL
  async function handleConfirmAbsence(absenceId) {
    const targetAbsence = absences.find((a) => a.id === absenceId);
    if (!targetAbsence) return;

    try {
      const resp = await fetch(`http://localhost:3002/api/ausencias/${absenceId}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: currentUser?.id_usuario,
          confirmado_por: currentUser?.nombre ? `${currentUser.nombre} ${currentUser.apellido || ""}`.trim() : "Preceptoría",
        }),
      });

      if (resp.ok) {
        const { ausencia, aviso } = await resp.json();
        setAbsences((prev) =>
          prev.map((a) => (a.id === absenceId ? ausencia : a))
        );
        if (aviso) {
          setNotices((prev) => [aviso, ...prev]);
        }
        alert(
          `Ausencia confirmada.\nSe ha generado y emitido automáticamente la notificación para los alumnos de ${ausencia.curso}.`
        );
      } else {
        alert("Error al confirmar la ausencia en el servidor.");
      }
    } catch (error) {
      console.error("Error al confirmar ausencia:", error);
      alert("No se pudo conectar con el servidor para confirmar la ausencia.");
    }
  }

  // Manejador de notificaciones leídas (Alumno) — sincronizado con MySQL
  async function handleToggleReadNotice(noticeId) {
    // Actualización optimista inmediata en React
    setReadNoticeIds((prev) =>
      prev.includes(noticeId) ? prev.filter((id) => id !== noticeId) : [...prev, noticeId]
    );

    // Sincronización con MySQL
    try {
      await fetch("http://localhost:3002/api/notificaciones/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: currentUser.id_usuario, id_aviso: noticeId }),
      });
    } catch (error) {
      console.error("Error al sincronizar notificación:", error);
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
    // Actualización optimista inmediata en React
    setReadNoticeIds((prev) => Array.from(new Set([...prev, ...allIds])));

    // Sincronización con MySQL
    try {
      await fetch("http://localhost:3002/api/notificaciones/marcar-todas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: currentUser.id_usuario, ids_avisos: allIds }),
      });
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  }

  // Si no hay usuario autenticado, mostramos la pantalla de Login
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  // Renderizado del panel correspondiente según el rol del usuario conectado
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
            <p>Rol no reconocido.</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
      />
      {renderDashboardByRole()}
    </div>
  );
}

export default App;
