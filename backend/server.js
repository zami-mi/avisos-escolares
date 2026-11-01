const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const dataAdapter = require('./adapters');

const app = express();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'red35_jwt_school_security_secret_key_default';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Middleware para autenticar tokens JWT.
 * Extrae y valida el token Bearer del encabezado Authorization.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token de autenticación requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(401).json({ error: 'Sesión expirada o token inválido' });
    }
    req.user = decodedUser;
    next();
  });
}

/**
 * Middleware para autorización basada en roles (RBAC).
 * Extrae el rol directamente del token verificado por el backend.
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: `Acceso denegado: El rol "${req.user?.rol}" no tiene permisos para esta acción` });
    }
    next();
  };
}

app.get('/api/test', (req, res) => {
  res.json({
    mensaje: 'El backend escolar funciona correctamente con el adaptador de datos activo',
    proveedor: process.env.DATA_PROVIDER || 'mysql'
  });
});

/** Endpoint de salud — permite al frontend verificar que el backend está disponible. */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
  const { email, contrasena } = req.body;
  if (!email || !contrasena) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  try {
    const usuario = await dataAdapter.authenticateUser(email, contrasena);
    if (!usuario) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    // Generar token JWT firmado por el backend con los datos del usuario verificado
    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      mensaje: 'Inicio de sesión correcto',
      token,
      usuario
    });
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({ error: 'Error interno en el servidor de autenticación' });
  }
});

/**
 * Endpoint protegido para cambiar contraseña.
 * Exclusivo para roles activos (Alumno, Preceptor, Regente).
 * Extrae la identidad directamente del token JWT verificado (previene ataques de cambio cruzado).
 */
app.post('/api/usuarios/cambiar-contrasena', authenticateToken, requireRoles('alumno', 'preceptor', 'regente'), async (req, res) => {
  const { contrasenaActual, nuevaContrasena, confirmarContrasena } = req.body;
  const id_usuario = req.user.id_usuario;

  if (!contrasenaActual || !nuevaContrasena) {
    return res.status(400).json({ error: 'Debes ingresar tu contraseña actual y la nueva contraseña' });
  }

  if (confirmarContrasena !== undefined && nuevaContrasena !== confirmarContrasena) {
    return res.status(400).json({ error: 'La confirmación no coincide con la nueva contraseña' });
  }

  try {
    const resultado = await dataAdapter.updatePassword(id_usuario, contrasenaActual, nuevaContrasena);
    res.json(resultado);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Error al cambiar la contraseña' });
  }
});

app.get('/api/cursos', async (req, res) => {
  try {
    const cursos = await dataAdapter.getCourses();
    res.json(cursos);
  } catch (error) {
    console.error('Error al consultar cursos:', error);
    res.status(500).json({ error: 'Error al consultar los cursos de la base de datos' });
  }
});

app.get('/api/avisos', async (req, res) => {
  try {
    const avisos = await dataAdapter.getNotices();
    res.json(avisos);
  } catch (error) {
    console.error('Error al consultar avisos - code:', error.code, '| sqlMessage:', error.sqlMessage || error.message);
    res.status(500).json({ error: 'Error al consultar avisos escolares' });
  }
});

app.get('/api/avisos/autor/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const avisos = await dataAdapter.getNoticesByAuthor(id_usuario);
    res.json(avisos);
  } catch (error) {
    console.error('Error al consultar avisos del autor:', error);
    res.status(500).json({ error: 'Error al consultar avisos del autor' });
  }
});

// Roles autorizados activos: preceptor y regente.
// [ROLES: Profesor y Secretaria] Bloqueados mediante comentarios para publicación y eliminación de avisos.
app.post('/api/avisos', authenticateToken, requireRoles(/* 'profesor', [ROL: Profesor] */ 'preceptor', 'regente' /* , 'secretaria' [ROL: Secretaria] */), async (req, res) => {
  const { titulo, contenido, categoria, destinatario, prioridad, notificar_familias } = req.body;
  // Identidad garantizada mediante el token verificado
  const id_usuario = req.user.id_usuario;

  if (!titulo || !contenido) {
    return res.status(400).json({ error: 'Título y contenido son obligatorios' });
  }

  try {
    const nuevoAviso = await dataAdapter.createNotice({
      titulo,
      contenido,
      categoria,
      destinatario,
      prioridad,
      id_usuario,
      notificar_familias
    });

    res.json(nuevoAviso);
  } catch (error) {
    console.error('Error al publicar aviso:', error);
    res.status(500).json({ error: 'Error al publicar aviso en la base de datos' });
  }
});

app.delete('/api/avisos/:id_aviso', authenticateToken, requireRoles('preceptor', 'regente' /* , 'profesor', 'secretaria' [ROLES: Profesor y Secretaria] */), async (req, res) => {
  const { id_aviso } = req.params;
  try {
    // Si no es regente, validar que sea el autor original del aviso
    if (req.user.rol !== 'regente') {
      const avisosAutor = await dataAdapter.getNoticesByAuthor(req.user.id_usuario);
      const esAutor = avisosAutor.some((a) => Number(a.id) === Number(id_aviso));
      if (!esAutor) {
        return res.status(403).json({ error: 'Solo tienes permisos para eliminar tus propios avisos' });
      }
    }

    await dataAdapter.deleteNotice(id_aviso);
    res.json({ mensaje: 'Aviso eliminado correctamente', id_aviso: Number(id_aviso) });
  } catch (error) {
    console.error('Error al eliminar aviso:', error);
    res.status(500).json({ error: 'Error al eliminar aviso' });
  }
});

app.get('/api/ausencias', async (req, res) => {
  const { estado, curso } = req.query;
  try {
    const ausencias = await dataAdapter.getAbsences({ estado, curso });
    res.json(ausencias);
  } catch (error) {
    console.error('Error al consultar ausencias:', error);
    res.status(500).json({ error: 'Error al consultar ausencias' });
  }
});

app.get('/api/ausencias/resumen', async (req, res) => {
  try {
    const resumen = await dataAdapter.getAbsencesSummary();
    res.json(resumen);
  } catch (error) {
    console.error('Error al obtener resumen de ausencias:', error);
    res.status(500).json({ error: 'Error al obtener resumen de ausencias' });
  }
});

/* [ROL: Profesor] Endpoint exclusivo para consultar ausencias de un profesor específico - INACTIVO
app.get(['/api/ausencias/profesor/:id_usuario', '/api/ausencias/:id_usuario'], async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const ausencias = await dataAdapter.getAbsencesByProfesor(id_usuario);
    res.json(ausencias);
  } catch (error) {
    console.error('Error al consultar ausencias del profesor:', error);
    res.status(500).json({ error: 'Error al consultar ausencias del profesor' });
  }
});
*/

app.get('/api/ausencias/preceptor/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const ausencias = await dataAdapter.getAbsencesByPreceptor(id_usuario);
    res.json(ausencias);
  } catch (error) {
    console.error('Error al consultar ausencias para preceptor:', error);
    res.status(500).json({ error: 'Error al consultar ausencias para preceptor' });
  }
});

/* [ROL: Profesor] Endpoint exclusivo para que profesores registren ausencias - INACTIVO
app.post('/api/ausencias', authenticateToken, requireRoles('profesor'), async (req, res) => {
  const { id_horario, fecha, motivo, notificar_familias } = req.body;
  if (!id_horario || !fecha) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios (id_horario, fecha)' });
  }

  try {
    const nuevaAusencia = await dataAdapter.createAbsence({
      id_horario,
      fecha,
      motivo,
      notificar_familias
    });
    res.json(nuevaAusencia);
  } catch (error) {
    console.error('Error al registrar ausencia:', error);
    res.status(500).json({ error: 'Error al registrar la ausencia en la base de datos' });
  }
});
*/

app.post('/api/ausencias/:id_ausencia/confirmar', authenticateToken, requireRoles('preceptor', 'regente'), async (req, res) => {
  const { id_ausencia } = req.params;
  const id_usuario = req.user.id_usuario;
  const { confirmado_por } = req.body;

  try {
    const user = await dataAdapter.getUserById(id_usuario);
    const resultado = await dataAdapter.confirmAbsence(id_ausencia, {
      id_usuario,
      confirmado_por: confirmado_por || `${user.nombre} ${user.apellido || ''}`.trim()
    });

    if (!resultado) {
      return res.status(404).json({ error: 'Ausencia no encontrada' });
    }

    res.json({
      mensaje: 'Ausencia confirmada y aviso generado exitosamente',
      ...resultado
    });
  } catch (error) {
    console.error('Error al confirmar ausencia:', error);
    res.status(500).json({ error: 'Error al confirmar ausencia en la base de datos' });
  }
});

/* [ROL: Profesor] Endpoint exclusivo para consultar horarios de un profesor - INACTIVO
app.get('/api/profesor/:id_usuario/horarios', authenticateToken, async (req, res) => {
  const { id_usuario } = req.params;
  // Solo el propio docente o personal administrativo/directivo puede consultar sus horarios
  if (req.user.rol === 'profesor' && req.user.id_usuario !== Number(id_usuario)) {
    return res.status(403).json({ error: 'Acceso denegado: No puedes consultar horarios de otro docente' });
  }

  try {
    const horarios = await dataAdapter.getTeacherSchedules(id_usuario);
    res.json(horarios);
  } catch (error) {
    console.error('Error al consultar horarios:', error);
    res.status(500).json({ error: 'Error al consultar horarios' });
  }
});
*/

app.get('/api/notificaciones/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const readIds = await dataAdapter.getReadNotifications(id_usuario);
    res.json(readIds);
  } catch (error) {
    console.error('Error al consultar notificaciones leídas:', error);
    res.status(500).json({ error: 'Error al consultar notificaciones leídas' });
  }
});

app.post('/api/notificaciones/toggle', authenticateToken, async (req, res) => {
  const id_usuario = req.user.id_usuario;
  const { id_aviso } = req.body;
  if (!id_aviso) {
    return res.status(400).json({ error: 'Falta parámetro requerido: id_aviso' });
  }

  try {
    const result = await dataAdapter.toggleNotification(id_usuario, id_aviso);
    res.json(result);
  } catch (error) {
    console.error('Error al alternar notificación:', error);
    res.status(500).json({ error: 'Error al alternar notificación' });
  }
});

app.post('/api/notificaciones/marcar-todas', authenticateToken, async (req, res) => {
  const id_usuario = req.user.id_usuario;
  const { ids_avisos } = req.body;
  if (!Array.isArray(ids_avisos) || ids_avisos.length === 0) {
    return res.status(400).json({ error: 'Falta parámetro requerido: ids_avisos' });
  }

  try {
    const marcadas = await dataAdapter.markAllNotifications(id_usuario, ids_avisos);
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas', ids_avisos: marcadas });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ error: 'Error al marcar notificaciones como leídas' });
  }
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Servidor backend ejecutándose en http://localhost:${PORT} [DATA_PROVIDER: ${process.env.DATA_PROVIDER || 'mysql'}]`);
});