const express = require('express');
const cors = require('cors');
const dataAdapter = require('./adapters');

const app = express();

app.use(cors());
app.use(express.json());


app.get('/api/test', (req, res) => {
  res.json({
    mensaje: 'El backend escolar funciona correctamente con el adaptador de datos activo',
    proveedor: process.env.DATA_PROVIDER || 'mysql'
  });
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

    res.json({
      mensaje: 'Inicio de sesión correcto',
      usuario
    });
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({ error: 'Error interno en el servidor de autenticación' });
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

app.post('/api/avisos', async (req, res) => {
  const { titulo, contenido, categoria, destinatario, prioridad, id_usuario, notificar_familias } = req.body;

  if (!titulo || !contenido) {
    return res.status(400).json({ error: 'Título y contenido son obligatorios' });
  }
  if (!id_usuario) {
    return res.status(400).json({ error: 'Se requiere id_usuario para publicar un aviso' });
  }

  try {
    const user = await dataAdapter.getUserById(id_usuario);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no reconocido' });
    }
    const rolesAutorizados = ['profesor', 'preceptor', 'regente', 'secretaria'];
    if (!rolesAutorizados.includes(user.rol)) {
      return res.status(403).json({ error: `El rol "${user.rol}" no tiene permisos para emitir avisos escolares` });
    }

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

app.delete('/api/avisos/:id_aviso', async (req, res) => {
  const { id_aviso } = req.params;
  try {
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

app.post('/api/ausencias', async (req, res) => {
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

app.post('/api/ausencias/:id_ausencia/confirmar', async (req, res) => {
  const { id_ausencia } = req.params;
  const { id_usuario, confirmado_por } = req.body;

  if (!id_usuario) {
    return res.status(400).json({ error: 'Se requiere id_usuario del confirmador' });
  }

  try {
    const user = await dataAdapter.getUserById(id_usuario);
    if (!user || (user.rol !== 'preceptor' && user.rol !== 'regente')) {
      return res.status(403).json({ error: 'Solo un preceptor o regente puede confirmar ausencias docentes' });
    }

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

app.get('/api/profesor/:id_usuario/horarios', async (req, res) => {
  const { id_usuario } = req.params;
  try {
    const horarios = await dataAdapter.getTeacherSchedules(id_usuario);
    res.json(horarios);
  } catch (error) {
    console.error('Error al consultar horarios:', error);
    res.status(500).json({ error: 'Error al consultar horarios' });
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

app.post('/api/notificaciones/toggle', async (req, res) => {
  const { id_usuario, id_aviso } = req.body;
  if (!id_usuario || !id_aviso) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos (id_usuario, id_aviso)' });
  }

  try {
    const result = await dataAdapter.toggleNotification(id_usuario, id_aviso);
    res.json(result);
  } catch (error) {
    console.error('Error al alternar notificación:', error);
    res.status(500).json({ error: 'Error al alternar notificación' });
  }
});

app.post('/api/notificaciones/marcar-todas', async (req, res) => {
  const { id_usuario, ids_avisos } = req.body;
  if (!id_usuario || !Array.isArray(ids_avisos) || ids_avisos.length === 0) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos (id_usuario, ids_avisos)' });
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