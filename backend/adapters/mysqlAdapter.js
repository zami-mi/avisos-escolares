const conexion = require('../db');
const emailService = require('../emailService');

function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    conexion.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function withTransaction(callback) {
  return new Promise((resolve, reject) => {
    conexion.beginTransaction(async (err) => {
      if (err) return reject(err);
      try {
        const result = await callback();
        conexion.commit((commitErr) => {
          if (commitErr) {
            return conexion.rollback(() => reject(commitErr));
          }
          resolve(result);
        });
      } catch (error) {
        conexion.rollback(() => reject(error));
      }
    });
  });
}

const mysqlAdapter = {
  async authenticateUser(email, contrasena) {
    const sql = `
      SELECT 
        u.id_usuario, 
        u.id_usuario AS id,
        u.nombre, 
        u.apellido, 
        u.email, 
        u.rol,
        al.id_curso,
        CASE 
          WHEN c.id_curso IS NOT NULL THEN CONCAT(c.anio, '\u00b0 ', c.division)
          ELSE NULL 
        END AS curso,
        c.turno
      FROM usuarios u
      LEFT JOIN alumnos al ON u.id_usuario = al.id_usuario
      LEFT JOIN cursos c ON al.id_curso = c.id_curso
      WHERE u.email = ? AND u.contrasena = ?
    `;

    const rows = await queryAsync(sql, [email, contrasena]);
    if (rows.length === 0) return null;

    const usuario = rows[0];

    if (usuario.rol === 'profesor') {
      const profRows = await queryAsync('SELECT id_profesor FROM profesores WHERE id_usuario = ?', [usuario.id_usuario]);
      if (profRows.length > 0) {
        const profIds = profRows.map(r => r.id_profesor);
        usuario.id_profesor = profRows[0].id_profesor;

        const horSql = `
          SELECT DISTINCT m.nombre AS materia
          FROM horarios h
          JOIN materias m ON h.id_materia = m.id_materia
          WHERE h.id_profesor IN (?)
        `;
        const horRows = await queryAsync(horSql, [profIds]);
        usuario.materias = horRows.map(r => r.materia);

        const curSql = `
          SELECT DISTINCT CONCAT(c.anio, '\u00b0 ', c.division) AS curso
          FROM horarios h
          JOIN cursos c ON h.id_curso = c.id_curso
          WHERE h.id_profesor IN (?)
        `;
        const curRows = await queryAsync(curSql, [profIds]);
        usuario.cursosAsignados = curRows.map(r => r.curso);
      } else {
        usuario.materias = [];
        usuario.cursosAsignados = [];
      }
    } else if (usuario.rol === 'preceptor') {
      const precSql = `
        SELECT 
          pc.id_curso,
          CONCAT(c.anio, '\u00b0 ', c.division) AS curso,
          c.turno
        FROM preceptores p
        JOIN preceptor_cursos pc ON p.id_preceptor = pc.id_preceptor
        JOIN cursos c ON pc.id_curso = c.id_curso
        WHERE p.id_usuario = ?
      `;
      const precRows = await queryAsync(precSql, [usuario.id_usuario]);
      if (precRows.length > 0) {
        usuario.divisiones = precRows.map(r => r.curso);
        usuario.cursosAsignados = precRows.map(r => r.curso);
        usuario.cursosIds = precRows.map(r => r.id_curso);
        usuario.turno = precRows[0].turno;
      } else {
        usuario.divisiones = [];
        usuario.cursosAsignados = [];
        usuario.cursosIds = [];
        usuario.turno = 'Mañana';
      }
    }

    return usuario;
  },

  async getUserById(userId) {
    const rows = await queryAsync('SELECT id_usuario, nombre, apellido, email, rol FROM usuarios WHERE id_usuario = ?', [userId]);
    return rows.length > 0 ? rows[0] : null;
  },

  async getCourses() {
    return queryAsync('SELECT * FROM cursos ORDER BY anio ASC, division ASC');
  },

  async getNotices() {
    const sql = `
      SELECT 
        a.id_aviso AS id,
        a.titulo,
        a.contenido,
        DATE_FORMAT(a.fecha_publicacion, '%Y-%m-%d') AS fecha,
        a.tipo AS categoria,
        a.prioridad,
        a.notificar_familias,
        ac.id_curso,
        CASE 
          WHEN ac.id_curso IS NULL THEN 'Todos'
          ELSE CONCAT(c.anio, '\u00b0 ', c.division)
        END AS destinatario,
        CONCAT(u.nombre, ' ', u.apellido) AS autor,
        u.rol AS rolAutor
      FROM avisos a
      LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso
      LEFT JOIN cursos c ON ac.id_curso = c.id_curso
      LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
      ORDER BY a.fecha_publicacion DESC, a.id_aviso DESC
    `;
    return queryAsync(sql);
  },

  async getNoticesByAuthor(userId) {
    const sql = `
      SELECT 
        a.id_aviso AS id,
        a.titulo,
        a.contenido,
        DATE_FORMAT(a.fecha_publicacion, '%Y-%m-%d') AS fecha,
        a.tipo AS categoria,
        a.prioridad,
        a.notificar_familias,
        ac.id_curso,
        CASE 
          WHEN ac.id_curso IS NULL THEN 'Todos'
          ELSE CONCAT(c.anio, '\u00b0 ', c.division)
        END AS destinatario,
        CONCAT(u.nombre, ' ', u.apellido) AS autor,
        u.rol AS rolAutor
      FROM avisos a
      LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso
      LEFT JOIN cursos c ON ac.id_curso = c.id_curso
      LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
      WHERE a.id_usuario = ?
      ORDER BY a.fecha_publicacion DESC, a.id_aviso DESC
    `;
    return queryAsync(sql, [userId]);
  },

  async resolveCourses(destinatario) {
    if (!destinatario || destinatario === 'Todos' || destinatario === 'Toda la escuela') {
      const all = await queryAsync("SELECT id_curso, CONCAT(anio, '\u00b0 ', division) AS curso_nombre FROM cursos ORDER BY anio ASC, division ASC");
      return { esTodos: true, cursos: all };
    }

    const destinatariosList = Array.isArray(destinatario) ? destinatario : [destinatario];
    const cursosEncontrados = [];

    for (const d of destinatariosList) {
      if (typeof d === 'number') {
        const rows = await queryAsync("SELECT id_curso, CONCAT(anio, '\u00b0 ', division) AS curso_nombre FROM cursos WHERE id_curso = ?", [d]);
        if (rows.length > 0) cursosEncontrados.push(rows[0]);
        continue;
      }

      const clean = String(d)
        .replace(/^curso\s+/i, '')
        .replace(/^alumnos\s+de\s+/i, '')
        .trim();

      const searchSql = `
        SELECT id_curso, CONCAT(anio, '\u00b0 ', division) AS curso_nombre 
        FROM cursos 
        WHERE CONCAT(anio, '\u00b0 ', division) = ? 
           OR CONCAT(anio, 'to ', division) = ? 
           OR CONCAT(anio, 'ro ', division) = ? 
           OR division = ?
           OR ? LIKE CONCAT('%', anio, '\u00b0 ', division, '%')
           OR ? LIKE CONCAT('%', anio, '%', division, '%')
        LIMIT 1
      `;
      const cRows = await queryAsync(searchSql, [clean, clean, clean, clean, clean, clean]);
      if (cRows.length > 0) {
        cursosEncontrados.push(cRows[0]);
      }
    }

    const uniqueMap = new Map();
    cursosEncontrados.forEach(c => uniqueMap.set(c.id_curso, c));
    return { esTodos: false, cursos: Array.from(uniqueMap.values()) };
  },

  async createNotice({ titulo, contenido, categoria, destinatario, prioridad, id_usuario, notificar_familias }) {
    const resultadoTransaccion = await withTransaction(async () => {
      const tipoAviso = categoria || 'Institucional';
      const prioridadAviso = prioridad || 'normal';
      const notificarFamiliasVal = notificar_familias ? 1 : 0;

      const insertSql = `
        INSERT INTO avisos (titulo, contenido, tipo, prioridad, id_usuario, notificar_familias)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const result = await queryAsync(insertSql, [titulo, contenido, tipoAviso, prioridadAviso, id_usuario, notificarFamiliasVal]);
      const id_aviso = result.insertId;

      const { esTodos, cursos } = await this.resolveCourses(destinatario);

      // Si no es "Todos", asociamos los cursos en avisos_cursos
      if (!esTodos && cursos.length > 0) {
        const avisosCursosValues = cursos.map(c => [id_aviso, c.id_curso]);
        await queryAsync('INSERT INTO avisos_cursos (id_aviso, id_curso) VALUES ?', [avisosCursosValues]);
      }

      // 1. Obtener alumnos destinatarios según los cursos del aviso
      let alumnosRows = [];
      if (esTodos) {
        alumnosRows = await queryAsync('SELECT id_alumno, id_usuario, id_curso FROM alumnos');
      } else if (cursos.length > 0) {
        const cursosIds = cursos.map(c => c.id_curso);
        alumnosRows = await queryAsync('SELECT id_alumno, id_usuario, id_curso FROM alumnos WHERE id_curso IN (?)', [cursosIds]);
      }

      const alumnosIdsUsuarios = [];
      const alumnosIdsAlumnos = [];

      alumnosRows.forEach(a => {
        if (a.id_usuario && !alumnosIdsUsuarios.includes(a.id_usuario)) {
          alumnosIdsUsuarios.push(a.id_usuario);
        }
        if (a.id_alumno && !alumnosIdsAlumnos.includes(a.id_alumno)) {
          alumnosIdsAlumnos.push(a.id_alumno);
        }
      });

      // 2. Registrar notificaciones internas en la DB exclusivamente para los alumnos de la app
      if (alumnosIdsUsuarios.length > 0) {
        const notifValues = alumnosIdsUsuarios.map(userId => [id_aviso, userId, 0, null]);
        await queryAsync('INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES ?', [notifValues]);
      }

      // 3. Obtener familias asociadas a los cursos/alumnos si la opción de notificar está activa
      let familiasParaEmail = [];
      if (notificarFamiliasVal === 1) {
        if (esTodos) {
          const famSql = `
            SELECT DISTINCT 
              f.email,
              f.nombre,
              f.apellido
            FROM familias f
            JOIN familia_alumno fa ON f.id_familia = fa.id_familia
            JOIN alumnos al ON fa.id_alumno = al.id_alumno
          `;
          familiasParaEmail = await queryAsync(famSql);
        } else if (alumnosIdsAlumnos.length > 0) {
          const famSql = `
            SELECT DISTINCT 
              f.email,
              f.nombre,
              f.apellido
            FROM familias f
            JOIN familia_alumno fa ON f.id_familia = fa.id_familia
            WHERE fa.id_alumno IN (?)
          `;
          familiasParaEmail = await queryAsync(famSql, [alumnosIdsAlumnos]);
        }
      }

      // 4. Recuperar el aviso recién insertado para la respuesta
      const getAvisoSql = `
        SELECT 
          a.id_aviso AS id,
          a.titulo,
          a.contenido,
          DATE_FORMAT(a.fecha_publicacion, '%Y-%m-%d') AS fecha,
          a.tipo AS categoria,
          a.prioridad,
          a.notificar_familias,
          ac.id_curso,
          CASE 
            WHEN ac.id_curso IS NULL THEN 'Todos'
            ELSE CONCAT(c.anio, '\u00b0 ', c.division)
          END AS destinatario,
          CONCAT(u.nombre, ' ', u.apellido) AS autor,
          u.rol AS rolAutor
        FROM avisos a
        LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso
        LEFT JOIN cursos c ON ac.id_curso = c.id_curso
        LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
        WHERE a.id_aviso = ?
        LIMIT 1
      `;
      const noticeRows = await queryAsync(getAvisoSql, [id_aviso]);
      const avisoCreado = noticeRows[0] || {
        id: id_aviso,
        titulo,
        contenido,
        categoria: tipoAviso,
        prioridad: prioridadAviso,
        notificar_familias: notificarFamiliasVal,
        destinatario: esTodos ? 'Todos' : (cursos[0]?.curso_nombre || 'Varios cursos')
      };

      avisoCreado.notificaciones_alumnos = alumnosIdsUsuarios.length;

      return { avisoCreado, familiasParaEmail, notificarFamiliasVal };
    });

    const { avisoCreado, familiasParaEmail, notificarFamiliasVal } = resultadoTransaccion;

    // 5. Envío exclusivo por correo electrónico a las familias (sin duplicación y con gestión de errores individual)
    if (notificarFamiliasVal === 1 && familiasParaEmail.length > 0) {
      const resumenEmails = await emailService.enviarAvisoAFamilias({
        aviso: avisoCreado,
        destinatarios: familiasParaEmail,
      });
      avisoCreado.envio_emails = resumenEmails;
    } else {
      avisoCreado.envio_emails = { total: 0, exitosos: 0, fallidos: 0, detalle: [] };
    }

    return avisoCreado;
  },

  async deleteNotice(noticeId) {
    await queryAsync('DELETE FROM notificaciones WHERE id_aviso = ?', [noticeId]);
    await queryAsync('DELETE FROM avisos_cursos WHERE id_aviso = ?', [noticeId]);
    await queryAsync('DELETE FROM avisos WHERE id_aviso = ?', [noticeId]);
    return true;
  },

  async getAbsences(filters = {}) {
    let conditions = [];
    let params = [];

    if (filters.estado && (filters.estado === 'pendiente' || filters.estado === 'confirmada')) {
      conditions.push('aus.estado = ?');
      params.push(filters.estado);
    }
    if (filters.curso && !isNaN(Number(filters.curso))) {
      conditions.push('c.id_curso = ?');
      params.push(Number(filters.curso));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        aus.id_ausencia AS id,
        CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
        u.id_usuario AS profesorId,
        DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
        CONCAT(TIME_FORMAT(h.hora_inicio, '%H:%i'), ' a ', TIME_FORMAT(h.hora_fin, '%H:%i'), ' hs') AS horario,
        m.nombre AS materia,
        CONCAT(c.anio, '\u00b0 ', c.division) AS curso,
        c.id_curso,
        aus.motivo,
        COALESCE(aus.estado, 'pendiente') AS estado,
        aus.confirmado_por AS confirmadoPor,
        DATE_FORMAT(aus.fecha_confirmacion, '%Y-%m-%d') AS fechaConfirmacion,
        aus.notificar_familias
      FROM ausencias aus
      JOIN horarios h ON aus.id_horario = h.id_horario
      JOIN profesores p ON h.id_profesor = p.id_profesor
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      JOIN materias m ON h.id_materia = m.id_materia
      JOIN cursos c ON h.id_curso = c.id_curso
      ${whereClause}
      ORDER BY aus.fecha DESC, aus.id_ausencia DESC
    `;
    return queryAsync(sql, params);
  },

  async getAbsencesByProfesor(userId) {
    const sql = `
      SELECT 
        aus.id_ausencia AS id,
        CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
        u.id_usuario AS profesorId,
        DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
        CONCAT(TIME_FORMAT(h.hora_inicio, '%H:%i'), ' a ', TIME_FORMAT(h.hora_fin, '%H:%i'), ' hs') AS horario,
        m.nombre AS materia,
        CONCAT(c.anio, '\u00b0 ', c.division) AS curso,
        c.id_curso,
        aus.motivo,
        COALESCE(aus.estado, 'pendiente') AS estado,
        aus.confirmado_por AS confirmadoPor,
        DATE_FORMAT(aus.fecha_confirmacion, '%Y-%m-%d') AS fechaConfirmacion,
        aus.notificar_familias
      FROM ausencias aus
      JOIN horarios h ON aus.id_horario = h.id_horario
      JOIN profesores p ON h.id_profesor = p.id_profesor
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      JOIN materias m ON h.id_materia = m.id_materia
      JOIN cursos c ON h.id_curso = c.id_curso
      WHERE p.id_usuario = ?
      ORDER BY aus.fecha DESC, aus.id_ausencia DESC
    `;
    return queryAsync(sql, [userId]);
  },

  async getAbsencesByPreceptor(userId) {
    const sql = `
      SELECT 
        aus.id_ausencia AS id,
        CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
        u.id_usuario AS profesorId,
        DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
        CONCAT(TIME_FORMAT(h.hora_inicio, '%H:%i'), ' a ', TIME_FORMAT(h.hora_fin, '%H:%i'), ' hs') AS horario,
        m.nombre AS materia,
        CONCAT(c.anio, '\u00b0 ', c.division) AS curso,
        c.id_curso,
        aus.motivo,
        COALESCE(aus.estado, 'pendiente') AS estado,
        aus.confirmado_por AS confirmadoPor,
        DATE_FORMAT(aus.fecha_confirmacion, '%Y-%m-%d') AS fechaConfirmacion,
        aus.notificar_familias
      FROM ausencias aus
      JOIN horarios h ON aus.id_horario = h.id_horario
      JOIN profesores p ON h.id_profesor = p.id_profesor
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      JOIN materias m ON h.id_materia = m.id_materia
      JOIN cursos c ON h.id_curso = c.id_curso
      JOIN preceptor_cursos pc ON c.id_curso = pc.id_curso
      JOIN preceptores prec ON pc.id_preceptor = prec.id_preceptor
      WHERE prec.id_usuario = ?
      ORDER BY aus.fecha DESC, aus.id_ausencia DESC
    `;
    return queryAsync(sql, [userId]);
  },

  async getAbsencesSummary() {
    const sql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN aus.estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN aus.estado = 'confirmada' THEN 1 ELSE 0 END) AS confirmadas,
        COUNT(DISTINCT h.id_profesor) AS profesoresInvolucrados,
        COUNT(DISTINCT h.id_curso) AS cursosAfectados
      FROM ausencias aus
      JOIN horarios h ON aus.id_horario = h.id_horario
    `;
    const rows = await queryAsync(sql);
    return rows[0];
  },

  async createAbsence({ id_horario, fecha, motivo, notificar_familias }) {
    const notificarFamiliasVal = notificar_familias ? 1 : 0;
    const insertSql = 'INSERT INTO ausencias (id_horario, fecha, motivo, notificar_familias) VALUES (?, ?, ?, ?)';
    const result = await queryAsync(insertSql, [id_horario, fecha, motivo || null, notificarFamiliasVal]);

    const getSql = `
      SELECT 
        aus.id_ausencia AS id,
        CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
        u.id_usuario AS profesorId,
        DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
        CONCAT(TIME_FORMAT(h.hora_inicio, '%H:%i'), ' a ', TIME_FORMAT(h.hora_fin, '%H:%i'), ' hs') AS horario,
        m.nombre AS materia,
        CONCAT(c.anio, '\u00b0 ', c.division) AS curso,
        c.id_curso,
        aus.motivo,
        COALESCE(aus.estado, 'pendiente') AS estado,
        aus.confirmado_por AS confirmadoPor,
        DATE_FORMAT(aus.fecha_confirmacion, '%Y-%m-%d') AS fechaConfirmacion,
        aus.notificar_familias
      FROM ausencias aus
      JOIN horarios h ON aus.id_horario = h.id_horario
      JOIN profesores p ON h.id_profesor = p.id_profesor
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      JOIN materias m ON h.id_materia = m.id_materia
      JOIN cursos c ON h.id_curso = c.id_curso
      WHERE aus.id_ausencia = ?
    `;
    const rows = await queryAsync(getSql, [result.insertId]);
    return rows[0];
  },

  async confirmAbsence(absenceId, { id_usuario, confirmado_por }) {
    const infoSql = `
      SELECT 
        aus.id_ausencia,
        aus.id_horario,
        DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
        aus.motivo,
        CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
        m.nombre AS materia,
        CONCAT(c.anio, '\u00b0 ', c.division) AS curso,
        c.id_curso,
        CONCAT(TIME_FORMAT(h.hora_inicio, '%H:%i'), ' a ', TIME_FORMAT(h.hora_fin, '%H:%i'), ' hs') AS horario,
        aus.notificar_familias
      FROM ausencias aus
      JOIN horarios h ON aus.id_horario = h.id_horario
      JOIN profesores p ON h.id_profesor = p.id_profesor
      JOIN usuarios u ON p.id_usuario = u.id_usuario
      JOIN materias m ON h.id_materia = m.id_materia
      JOIN cursos c ON h.id_curso = c.id_curso
      WHERE aus.id_ausencia = ?
    `;
    const ausRows = await queryAsync(infoSql, [absenceId]);
    if (ausRows.length === 0) return null;

    const ausData = ausRows[0];
    const nombreConfirmador = confirmado_por || 'Preceptoría';

    const updSql = `
      UPDATE ausencias 
      SET estado = 'confirmada', confirmado_por = ?, fecha_confirmacion = CURDATE()
      WHERE id_ausencia = ?
    `;
    await queryAsync(updSql, [nombreConfirmador, absenceId]);

    const titulo = `Ausencia Docente: ${ausData.profesorNombre} (${ausData.materia})`;
    const motivoStr = ausData.motivo ? ausData.motivo.toLowerCase() : 'motivos justificados';
    const contenido = `Se informa a los alumnos de ${ausData.curso} que el día ${ausData.fecha} en el horario de ${ausData.horario} el/la docente no asistirá por ${motivoStr}. Comunicado confirmado por Preceptoría.`;
    const tipo = 'Ausencias y Horarios';
    const prioridad = 'alta';
    const autorId = id_usuario;
    const notifFamilias = ausData.notificar_familias || 0;

    const insAvisoSql = `
      INSERT INTO avisos (titulo, contenido, tipo, prioridad, id_usuario, notificar_familias)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const avResult = await queryAsync(insAvisoSql, [titulo, contenido, tipo, prioridad, autorId, notifFamilias]);
    const nuevoAvisoId = avResult.insertId;

    await queryAsync('INSERT INTO avisos_cursos (id_aviso, id_curso) VALUES (?, ?)', [nuevoAvisoId, ausData.id_curso]);

    const alumnos = await queryAsync('SELECT id_usuario FROM alumnos WHERE id_curso = ?', [ausData.id_curso]);
    if (alumnos.length > 0) {
      const notifValues = alumnos.map(a => [nuevoAvisoId, a.id_usuario, 0, null]);
      await queryAsync('INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES ?', [notifValues]);
    }

    const ausenciaConfirmada = {
      id: Number(absenceId),
      profesorNombre: ausData.profesorNombre,
      fecha: ausData.fecha,
      horario: ausData.horario,
      materia: ausData.materia,
      curso: ausData.curso,
      id_curso: ausData.id_curso,
      motivo: ausData.motivo,
      estado: 'confirmada',
      confirmadoPor: nombreConfirmador,
      fechaConfirmacion: new Date().toISOString().split('T')[0],
      notificar_familias: ausData.notificar_familias
    };

    const avisoGenerado = {
      id: nuevoAvisoId,
      titulo,
      contenido,
      fecha: new Date().toISOString().split('T')[0],
      categoria: tipo,
      prioridad,
      destinatario: ausData.curso,
      id_curso: ausData.id_curso,
      autor: nombreConfirmador,
      rolAutor: 'preceptor',
      notificar_familias: notifFamilias === 1
    };

    return { ausencia: ausenciaConfirmada, aviso: avisoGenerado };
  },

  async getTeacherSchedules(userId) {
    const sql = `
      SELECT 
        h.id_horario,
        m.nombre AS materia,
        CONCAT(c.anio, '\u00b0 ', c.division) AS curso,
        h.id_curso,
        h.dia_semana,
        TIME_FORMAT(h.hora_inicio, '%H:%i') AS hora_inicio,
        TIME_FORMAT(h.hora_fin, '%H:%i') AS hora_fin
      FROM horarios h
      JOIN profesores p ON h.id_profesor = p.id_profesor
      JOIN materias m ON h.id_materia = m.id_materia
      JOIN cursos c ON h.id_curso = c.id_curso
      WHERE p.id_usuario = ?
      ORDER BY h.dia_semana, h.hora_inicio
    `;
    return queryAsync(sql, [userId]);
  },

  async getReadNotifications(userId) {
    const sql = 'SELECT id_aviso FROM notificaciones WHERE id_usuario = ? AND leido = 1';
    const rows = await queryAsync(sql, [userId]);
    return rows.map(r => r.id_aviso);
  },

  async toggleNotification(userId, noticeId) {
    const checkSql = 'SELECT id_notificacion, leido FROM notificaciones WHERE id_usuario = ? AND id_aviso = ? LIMIT 1';
    const rows = await queryAsync(checkSql, [userId, noticeId]);

    if (rows.length > 0) {
      const nuevoEstado = rows[0].leido === 1 ? 0 : 1;
      const fechaLectura = nuevoEstado === 1 ? new Date() : null;
      await queryAsync('UPDATE notificaciones SET leido = ?, fecha_lectura = ? WHERE id_notificacion = ?', [nuevoEstado, fechaLectura, rows[0].id_notificacion]);
      return { id_aviso: noticeId, leido: nuevoEstado === 1 };
    } else {
      await queryAsync('INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES (?, ?, 1, NOW())', [noticeId, userId]);
      return { id_aviso: noticeId, leido: true };
    }
  },

  async markAllNotifications(userId, noticeIds) {
    if (!noticeIds || noticeIds.length === 0) return [];

    const existing = await queryAsync('SELECT id_notificacion, id_aviso FROM notificaciones WHERE id_usuario = ? AND id_aviso IN (?)', [userId, noticeIds]);
    const existingIds = existing.map(r => r.id_aviso);
    const missingIds = noticeIds.filter(id => !existingIds.includes(id));

    if (existing.length > 0) {
      await queryAsync('UPDATE notificaciones SET leido = 1, fecha_lectura = NOW() WHERE id_usuario = ? AND id_aviso IN (?)', [userId, existingIds]);
    }
    if (missingIds.length > 0) {
      const values = missingIds.map(id => [id, userId, 1, new Date()]);
      await queryAsync('INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES ?', [values]);
    }

    return noticeIds;
  },
};

module.exports = mysqlAdapter;
