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

// Roles autorizados activos: preceptor, regente, jefe de taller, directivo y otras autoridades.
const ROLES_AUTORIDAD_BACKEND = ['regente', 'jefe_taller', 'jefe de taller', 'directivo', 'director', 'autoridad'];
const isAutoridadBackend = (rol) => ROLES_AUTORIDAD_BACKEND.includes((rol || '').toLowerCase());

app.post('/api/avisos', authenticateToken, requireRoles('preceptor', 'regente', 'jefe_taller', 'jefe de taller', 'directivo', 'director', 'autoridad'), async (req, res) => {
  const { titulo, contenido, categoria, destinatario, prioridad, notificar_familias } = req.body;
  // Identidad garantizada mediante el token verificado
  const id_usuario = req.user.id_usuario;
  const rolUsuario = req.user.rol;

  if (!titulo || !contenido) {
    return res.status(400).json({ error: 'Título y contenido son obligatorios' });
  }

  const PRIORIDADES_VALIDAS = ['baja', 'media', 'alta', 'normal'];
  const prioridadSolicitada = (prioridad || 'baja').toLowerCase();
  if (!PRIORIDADES_VALIDAS.includes(prioridadSolicitada)) {
    return res.status(400).json({ error: 'Prioridad inválida. Las opciones válidas son: Baja, Media o Alta' });
  }

  // Validaciones exclusivas para el rol preceptor
  if (rolUsuario === 'preceptor') {
    // a) Prioridad permitida: solo baja o media
    if (prioridadSolicitada === 'alta') {
      return res.status(403).json({ error: 'El preceptor solo puede usar prioridad Baja o Media' });
    }

    // b) Verificar que el curso seleccionado esté asignado al preceptor
    if (!destinatario || destinatario === 'Todos' || destinatario === 'Toda la escuela') {
      return res.status(403).json({ error: 'El preceptor solo puede publicar avisos para sus cursos asignados' });
    }

    try {
      const cursosPreceptor = await dataAdapter.getCursosByPreceptor(id_usuario);
      const cursoAsignado = cursosPreceptor.some((c) => {
        const nombreCurso = c.curso || '';
        const destinatarioClean = String(destinatario).replace(/^Curso\s+/i, '').trim();
        return nombreCurso === destinatarioClean || nombreCurso === destinatario;
      });

      if (!cursoAsignado) {
        return res.status(403).json({ error: 'Solo podés publicar avisos para los cursos que tenés asignados' });
      }
    } catch (error) {
      console.error('Error al verificar cursos del preceptor:', error);
      return res.status(500).json({ error: 'Error al verificar cursos asignados al preceptor' });
    }
  }

  // Validaciones exclusivas para el rol regente y otras autoridades
  if (isAutoridadBackend(rolUsuario)) {
    const DESTINATARIOS_PERMITIDOS_AUTORIDAD = ['Todos', 'Turno Mañana', 'Turno Tarde', 'Turno Noche'];
    if (!destinatario || !DESTINATARIOS_PERMITIDOS_AUTORIDAD.includes(destinatario)) {
      return res.status(400).json({ error: 'Destinatario inválido para autoridad. Las opciones válidas son: Toda la escuela, Turno Mañana, Turno Tarde o Turno Noche' });
    }
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

app.delete('/api/avisos/:id_aviso', authenticateToken, requireRoles('preceptor', 'regente', 'jefe_taller', 'jefe de taller', 'directivo', 'director', 'autoridad'), async (req, res) => {
  const { id_aviso } = req.params;
  try {
    // Si no es una autoridad, validar que sea el autor original del aviso
    if (!isAutoridadBackend(req.user.rol)) {
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

app.put('/api/avisos/:id_aviso', authenticateToken, requireRoles('preceptor', 'regente', 'jefe_taller', 'jefe de taller', 'directivo', 'director', 'autoridad'), async (req, res) => {
  const { id_aviso } = req.params;
  const { titulo, contenido, categoria, destinatario, prioridad } = req.body;

  if (!titulo || !titulo.trim() || !contenido || !contenido.trim()) {
    return res.status(400).json({ error: 'Título y contenido son obligatorios' });
  }

  if (prioridad) {
    const PRIORIDADES_VALIDAS = ['baja', 'media', 'alta', 'normal'];
    const prioridadNorm = prioridad.toLowerCase();
    if (!PRIORIDADES_VALIDAS.includes(prioridadNorm)) {
      return res.status(400).json({ error: 'Prioridad inválida. Las opciones válidas son: Baja, Media o Alta' });
    }
  }

  try {
    // Las autoridades pueden editar cualquier aviso; el preceptor solo los suyos
    if (!isAutoridadBackend(req.user.rol)) {
      const avisosAutor = await dataAdapter.getNoticesByAuthor(req.user.id_usuario);
      const esAutor = avisosAutor.some((a) => Number(a.id) === Number(id_aviso));
      if (!esAutor) {
        return res.status(403).json({ error: 'Solo tenés permisos para editar tus propios avisos' });
      }

      if (prioridad && prioridad.toLowerCase() === 'alta') {
        return res.status(403).json({ error: 'El preceptor solo puede usar prioridad Baja o Media' });
      }
    }

    const avisoActualizado = await dataAdapter.updateNotice(id_aviso, {
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      categoria,
      destinatario,
      prioridad
    });

    res.json(avisoActualizado);
  } catch (error) {
    console.error('Error al editar aviso:', error);
    res.status(500).json({ error: 'Error al actualizar el aviso en la base de datos' });
  }
});

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