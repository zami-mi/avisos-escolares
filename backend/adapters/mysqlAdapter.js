// pool es el objeto mysql2 Pool exportado por db.js.
const pool = require('../db');
const emailService = require('../emailService');
const bcrypt = require('bcryptjs');

// Ejecuta una query sobre el pool (obtiene y libera conexión automáticamente).
function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) {
        // Log detallado del error SQL para diagnóstico en Render.
        console.error('[SQL ERROR]', err.code, '|', err.sqlMessage || err.message, '| sql:', sql.slice(0, 200));
        return reject(err);
      }
      resolve(results);
    });
  });
}

// Ejecuta un bloque en transacción usando una conexión dedicada del pool.
function withTransaction(callback) {
  return new Promise((resolve, reject) => {
    pool.getConnection((connErr, connection) => {
      if (connErr) return reject(connErr);

      connection.beginTransaction(async (txErr) => {
        if (txErr) {
          connection.release();
          return reject(txErr);
        }

        // queryAsync interno que usa la conexión dedicada de la transacción.
        function qTx(sql, params = []) {
          return new Promise((res, rej) => {
            connection.query(sql, params, (err, results) => {
              if (err) {
                console.error('[SQL TX ERROR]', err.code, '|', err.sqlMessage || err.message, '| sql:', sql.slice(0, 200));
                return rej(err);
              }
              res(results);
            });
          });
        }

        try {
          const result = await callback(qTx);
          connection.commit((commitErr) => {
            connection.release();
            if (commitErr) return reject(commitErr);
            resolve(result);
          });
        } catch (error) {
          connection.rollback(() => {
            connection.release();
            reject(error);
          });
        }
      });
    });
  });
}

const mysqlAdapter = {
  async authenticateUser(email, contrasena) {
    const sql =
      'SELECT ' +
      '  u.id_usuario, ' +
      '  u.id_usuario AS id, ' +
      '  u.nombre, ' +
      '  u.apellido, ' +
      '  u.email, ' +
      '  u.contrasena, ' +
      '  u.rol, ' +
      '  al.id_curso, ' +
      '  CASE ' +
      '    WHEN c.id_curso IS NOT NULL THEN CONCAT(c.anio, \'° \', c.division) ' +
      '    ELSE NULL ' +
      '  END AS curso, ' +
      '  c.turno ' +
      'FROM usuarios u ' +
      'LEFT JOIN alumnos al ON u.id_usuario = al.id_usuario ' +
      'LEFT JOIN cursos c ON al.id_curso = c.id_curso ' +
      'WHERE u.email = ?';

    const rows = await queryAsync(sql, [email]);
    if (rows.length === 0) return null;

    const usuario = rows[0];
    const dbPassword = usuario.contrasena || '';

    // Soporte dual: verifica si la contraseña es hash bcrypt o texto plano existente
    const isBcrypt = dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$') || dbPassword.startsWith('$2y$');
    let passwordMatches = false;

    if (isBcrypt) {
      passwordMatches = await bcrypt.compare(contrasena, dbPassword);
    } else {
      passwordMatches = (contrasena === dbPassword);
    }

    if (!passwordMatches) return null;

    // Eliminar la contraseña del objeto usuario para proteger los datos
    delete usuario.contrasena;

    if (usuario.rol === 'preceptor') {
      const precSql =
        'SELECT ' +
        '  pc.id_curso, ' +
        '  CONCAT(c.anio, \'° \', c.division) AS curso, ' +
        '  c.turno ' +
        'FROM preceptores p ' +
        'JOIN preceptor_cursos pc ON p.id_preceptor = pc.id_preceptor ' +
        'JOIN cursos c ON pc.id_curso = c.id_curso ' +
        'WHERE p.id_usuario = ?';
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

  /**
   * Devuelve los cursos asignados a un preceptor por su id_usuario.
   * Usado en la validación del endpoint POST /api/avisos para el rol preceptor.
   */
  async getCursosByPreceptor(userId) {
    const sql =
      'SELECT ' +
      '  pc.id_curso, ' +
      '  CONCAT(c.anio, \'° \', c.division) AS curso ' +
      'FROM preceptores p ' +
      'JOIN preceptor_cursos pc ON p.id_preceptor = pc.id_preceptor ' +
      'JOIN cursos c ON pc.id_curso = c.id_curso ' +
      'WHERE p.id_usuario = ?';
    return queryAsync(sql, [userId]);
  },

  async getCourses() {
    return queryAsync(
      'SELECT id_curso, anio AS anio, division, especialidad, turno FROM cursos ORDER BY anio ASC, division ASC'
    );
  },

  async getNotices() {
    const sql =
      'SELECT ' +
      '  a.id_aviso AS id, ' +
      '  a.titulo, ' +
      '  a.contenido, ' +
      '  DATE_FORMAT(a.fecha_publicacion, \'%Y-%m-%d\') AS fecha, ' +
      '  a.tipo AS categoria, ' +
      '  a.prioridad, ' +
      '  a.notificar_familias, ' +
      '  MAX(ac.id_curso) AS id_curso, ' +
      '  CASE ' +
      '    WHEN COUNT(ac.id_curso) = 0 THEN \'Todos\' ' +
      '    WHEN COUNT(DISTINCT ac.id_curso) = (SELECT COUNT(*) FROM cursos) THEN \'Todos\' ' +
      '    WHEN COUNT(DISTINCT c.turno) = 1 AND COUNT(DISTINCT ac.id_curso) = (SELECT COUNT(*) FROM cursos WHERE turno = MAX(c.turno)) THEN CONCAT(\'Turno \', MAX(c.turno)) ' +
      '    WHEN COUNT(DISTINCT ac.id_curso) = 1 THEN MAX(CONCAT(c.anio, \'° \', c.division)) ' +
      '    ELSE GROUP_CONCAT(DISTINCT CONCAT(c.anio, \'° \', c.division) ORDER BY c.anio, c.division SEPARATOR \', \') ' +
      '  END AS destinatario, ' +
      '  CONCAT(u.nombre, \' \', u.apellido) AS autor, ' +
      '  u.rol AS rolAutor, ' +
      '  a.id_usuario ' +
      'FROM avisos a ' +
      'LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso ' +
      'LEFT JOIN cursos c ON ac.id_curso = c.id_curso ' +
      'LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario ' +
      'GROUP BY a.id_aviso ' +
      'ORDER BY a.fecha_publicacion DESC, a.id_aviso DESC';
    return queryAsync(sql);
  },

  async getNoticesByAuthor(userId) {
    const sql =
      'SELECT ' +
      '  a.id_aviso AS id, ' +
      '  a.titulo, ' +
      '  a.contenido, ' +
      '  DATE_FORMAT(a.fecha_publicacion, \'%Y-%m-%d\') AS fecha, ' +
      '  a.tipo AS categoria, ' +
      '  a.prioridad, ' +
      '  a.notificar_familias, ' +
      '  MAX(ac.id_curso) AS id_curso, ' +
      '  CASE ' +
      '    WHEN COUNT(ac.id_curso) = 0 THEN \'Todos\' ' +
      '    WHEN COUNT(DISTINCT ac.id_curso) = (SELECT COUNT(*) FROM cursos) THEN \'Todos\' ' +
      '    WHEN COUNT(DISTINCT c.turno) = 1 AND COUNT(DISTINCT ac.id_curso) = (SELECT COUNT(*) FROM cursos WHERE turno = MAX(c.turno)) THEN CONCAT(\'Turno \', MAX(c.turno)) ' +
      '    WHEN COUNT(DISTINCT ac.id_curso) = 1 THEN MAX(CONCAT(c.anio, \'° \', c.division)) ' +
      '    ELSE GROUP_CONCAT(DISTINCT CONCAT(c.anio, \'° \', c.division) ORDER BY c.anio, c.division SEPARATOR \', \') ' +
      '  END AS destinatario, ' +
      '  CONCAT(u.nombre, \' \', u.apellido) AS autor, ' +
      '  u.rol AS rolAutor, ' +
      '  a.id_usuario ' +
      'FROM avisos a ' +
      'LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso ' +
      'LEFT JOIN cursos c ON ac.id_curso = c.id_curso ' +
      'LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario ' +
      'WHERE a.id_usuario = ? ' +
      'GROUP BY a.id_aviso ' +
      'ORDER BY a.fecha_publicacion DESC, a.id_aviso DESC';
    return queryAsync(sql, [userId]);
  },

  async resolveCourses(destinatario) {
    if (!destinatario || destinatario === 'Todos' || destinatario === 'Toda la escuela') {
      const all = await queryAsync(
        'SELECT id_curso, CONCAT(anio, \'° \', division) AS curso_nombre FROM cursos ORDER BY anio ASC, division ASC'
      );
      return { esTodos: true, cursos: all };
    }

    // Opciones de turno exclusivas del rol regente
    const turnoMap = {
      'Turno Mañana': 'Mañana',
      'Turno Tarde': 'Tarde',
      'Turno Noche': 'Noche',
    };
    if (turnoMap[destinatario] !== undefined) {
      const cursos = await queryAsync(
        'SELECT id_curso, CONCAT(anio, \'° \', division) AS curso_nombre FROM cursos WHERE turno = ? ORDER BY anio ASC, division ASC',
        [turnoMap[destinatario]]
      );
      return { esTodos: false, cursos };
    }

    const destinatariosList = Array.isArray(destinatario) ? destinatario : [destinatario];
    const cursosEncontrados = [];

    for (const d of destinatariosList) {
      if (typeof d === 'number') {
        const rows = await queryAsync(
          'SELECT id_curso, CONCAT(anio, \'° \', division) AS curso_nombre FROM cursos WHERE id_curso = ?',
          [d]
        );
        if (rows.length > 0) cursosEncontrados.push(rows[0]);
        continue;
      }

      const clean = String(d)
        .replace(/^curso\s+/i, '')
        .replace(/^alumnos\s+de\s+/i, '')
        .trim();

      const searchSql =
        'SELECT id_curso, CONCAT(anio, \'° \', division) AS curso_nombre ' +
        'FROM cursos ' +
        'WHERE CONCAT(anio, \'° \', division) = ? ' +
        '   OR CONCAT(anio, \'to \', division) = ? ' +
        '   OR CONCAT(anio, \'ro \', division) = ? ' +
        '   OR division = ? ' +
        '   OR ? LIKE CONCAT(\'%\', anio, \'° \', division, \'%\') ' +
        '   OR ? LIKE CONCAT(\'%\', anio, \'%\', division, \'%\') ' +
        'LIMIT 1';
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
    const resultadoTransaccion = await withTransaction(async (qTx) => {
      const tipoAviso = categoria || 'Institucional';
      const prioridadAviso = prioridad || 'baja';
      const notificarFamiliasVal = notificar_familias ? 1 : 0;

      const insertSql =
        'INSERT INTO avisos (titulo, contenido, tipo, prioridad, id_usuario, notificar_familias) ' +
        'VALUES (?, ?, ?, ?, ?, ?)';
      const result = await qTx(insertSql, [titulo, contenido, tipoAviso, prioridadAviso, id_usuario, notificarFamiliasVal]);
      const id_aviso = result.insertId;

      const { esTodos, cursos } = await this.resolveCourses(destinatario);

      // Si no es "Todos", asociamos los cursos en avisos_cursos
      if (!esTodos && cursos.length > 0) {
        const avisosCursosValues = cursos.map(c => [id_aviso, c.id_curso]);
        await qTx('INSERT INTO avisos_cursos (id_aviso, id_curso) VALUES ?', [avisosCursosValues]);
      }

      // 1. Obtener alumnos destinatarios según los cursos del aviso
      let alumnosRows = [];
      if (esTodos) {
        const sqlAlumnos =
          'SELECT al.id_alumno, al.id_usuario, al.id_curso, u.email, u.nombre, u.apellido ' +
          'FROM alumnos al ' +
          'JOIN usuarios u ON al.id_usuario = u.id_usuario ' +
          'WHERE u.rol = "alumno"';
        alumnosRows = await qTx(sqlAlumnos);
      } else if (cursos.length > 0) {
        const cursosIds = cursos.map(c => c.id_curso);
        const sqlAlumnos =
          'SELECT al.id_alumno, al.id_usuario, al.id_curso, u.email, u.nombre, u.apellido ' +
          'FROM alumnos al ' +
          'JOIN usuarios u ON al.id_usuario = u.id_usuario ' +
          'WHERE u.rol = "alumno" AND al.id_curso IN (?)';
        alumnosRows = await qTx(sqlAlumnos, [cursosIds]);
      }

      const alumnosIdsUsuarios = [];
      const alumnosIdsAlumnos = [];
      const alumnosParaEmail = [];

      alumnosRows.forEach(a => {
        if (a.id_usuario && !alumnosIdsUsuarios.includes(a.id_usuario)) {
          alumnosIdsUsuarios.push(a.id_usuario);
        }
        if (a.id_alumno && !alumnosIdsAlumnos.includes(a.id_alumno)) {
          alumnosIdsAlumnos.push(a.id_alumno);
        }
        if (a.email && typeof a.email === 'string' && a.email.trim()) {
          alumnosParaEmail.push({
            email: a.email.trim(),
            nombre: a.nombre,
            apellido: a.apellido,
          });
        }
      });

      // 2. Registrar notificaciones internas en la DB exclusivamente para los alumnos de la app
      if (alumnosIdsUsuarios.length > 0) {
        const notifValues = alumnosIdsUsuarios.map(userId => [id_aviso, userId, 0, null]);
        await qTx('INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES ?', [notifValues]);
      }

      // 3. Obtener familias asociadas a los cursos/alumnos si la opción de notificar está activa
      let familiasParaEmail = [];
      if (notificarFamiliasVal === 1) {
        if (esTodos) {
          const famSql =
            'SELECT DISTINCT f.email, f.nombre, f.apellido ' +
            'FROM familias f ' +
            'JOIN familia_alumno fa ON f.id_familia = fa.id_familia ' +
            'JOIN alumnos al ON fa.id_alumno = al.id_alumno';
          familiasParaEmail = await qTx(famSql);
        } else if (alumnosIdsAlumnos.length > 0) {
          const famSql =
            'SELECT DISTINCT f.email, f.nombre, f.apellido ' +
            'FROM familias f ' +
            'JOIN familia_alumno fa ON f.id_familia = fa.id_familia ' +
            'WHERE fa.id_alumno IN (?)';
          familiasParaEmail = await qTx(famSql, [alumnosIdsAlumnos]);
        }
      }

      // 4. Recuperar el aviso recién insertado para la respuesta
      const getAvisoSql =
        'SELECT ' +
        '  a.id_aviso AS id, ' +
        '  a.titulo, ' +
        '  a.contenido, ' +
        '  DATE_FORMAT(a.fecha_publicacion, \'%Y-%m-%d\') AS fecha, ' +
        '  a.tipo AS categoria, ' +
        '  a.prioridad, ' +
        '  a.notificar_familias, ' +
        '  MAX(ac.id_curso) AS id_curso, ' +
        '  CASE ' +
        '    WHEN COUNT(ac.id_curso) = 0 THEN \'Todos\' ' +
        '    WHEN COUNT(DISTINCT ac.id_curso) = (SELECT COUNT(*) FROM cursos) THEN \'Todos\' ' +
        '    WHEN COUNT(DISTINCT c.turno) = 1 AND COUNT(DISTINCT ac.id_curso) = (SELECT COUNT(*) FROM cursos WHERE turno = MAX(c.turno)) THEN CONCAT(\'Turno \', MAX(c.turno)) ' +
        '    WHEN COUNT(DISTINCT ac.id_curso) = 1 THEN MAX(CONCAT(c.anio, \'° \', c.division)) ' +
        '    ELSE GROUP_CONCAT(DISTINCT CONCAT(c.anio, \'° \', c.division) ORDER BY c.anio, c.division SEPARATOR \', \') ' +
        '  END AS destinatario, ' +
        '  CONCAT(u.nombre, \' \', u.apellido) AS autor, ' +
        '  u.rol AS rolAutor ' +
        'FROM avisos a ' +
        'LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso ' +
        'LEFT JOIN cursos c ON ac.id_curso = c.id_curso ' +
        'LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario ' +
        'WHERE a.id_aviso = ? ' +
        'GROUP BY a.id_aviso ' +
        'LIMIT 1';
      const noticeRows = await qTx(getAvisoSql, [id_aviso]);
      const avisoCreado = noticeRows[0] || {
        id: id_aviso,
        titulo,
        contenido,
        categoria: tipoAviso,
        prioridad: prioridadAviso,
        notificar_familias: notificarFamiliasVal,
        destinatario: destinatario || (esTodos ? 'Todos' : (cursos[0]?.curso_nombre || 'Varios cursos'))
      };

      if (destinatario && (!avisoCreado.destinatario || avisoCreado.destinatario === 'Todos')) {
        avisoCreado.destinatario = destinatario;
      }

      avisoCreado.notificaciones_alumnos = alumnosIdsUsuarios.length;

      return { avisoCreado, familiasParaEmail, notificarFamiliasVal, alumnosParaEmail };
    });

    const { avisoCreado, familiasParaEmail, notificarFamiliasVal, alumnosParaEmail } = resultadoTransaccion;

    // 5. Envío automático por correo electrónico a los alumnos destinatarios (en segundo plano)
    if (alumnosParaEmail && alumnosParaEmail.length > 0) {
      emailService
        .enviarAvisoAAlumnos({
          aviso: avisoCreado,
          destinatarios: alumnosParaEmail,
        })
        .then((resAlumnos) => {
          console.log(`[EMAIL ALUMNOS] Aviso #${avisoCreado.id} enviado a ${resAlumnos.exitosos}/${resAlumnos.total} alumnos.`);
        })
        .catch((err) => {
          console.error('[EMAIL ERROR] Error al enviar correos a los alumnos:', err);
        });
    }

    // 6. Envío exclusivo por correo electrónico a las familias si el regente lo solicitó
    if (notificarFamiliasVal === 1 && familiasParaEmail.length > 0) {
      emailService
        .enviarAvisoAFamilias({
          aviso: avisoCreado,
          destinatarios: familiasParaEmail,
        })
        .then((resFamilias) => {
          console.log(`[EMAIL FAMILIAS] Aviso #${avisoCreado.id} enviado a ${resFamilias.exitosos}/${resFamilias.total} familias.`);
        })
        .catch((err) => {
          console.error('[EMAIL ERROR] Error al enviar correos a familias:', err);
        });
    }

    return avisoCreado;
  },

  async deleteNotice(noticeId) {
    await queryAsync('DELETE FROM notificaciones WHERE id_aviso = ?', [noticeId]);
    await queryAsync('DELETE FROM avisos_cursos WHERE id_aviso = ?', [noticeId]);
    await queryAsync('DELETE FROM avisos WHERE id_aviso = ?', [noticeId]);
    return true;
  },

  async updateNotice(noticeId, { titulo, contenido, categoria, destinatario, prioridad }) {
    const tipoAviso = categoria || 'Institucional';
    const prioridadAviso = prioridad || 'baja';

    const updateSql =
      'UPDATE avisos SET titulo = ?, contenido = ?, tipo = ?, prioridad = ? WHERE id_aviso = ?';
    await queryAsync(updateSql, [titulo, contenido, tipoAviso, prioridadAviso, noticeId]);

    if (destinatario) {
      const { esTodos, cursos } = await this.resolveCourses(destinatario);
      await queryAsync('DELETE FROM avisos_cursos WHERE id_aviso = ?', [noticeId]);
      if (!esTodos && cursos.length > 0) {
        const avisosCursosValues = cursos.map(c => [noticeId, c.id_curso]);
        await queryAsync('INSERT INTO avisos_cursos (id_aviso, id_curso) VALUES ?', [avisosCursosValues]);
      }
    }

    const getAvisoSql =
      'SELECT ' +
      '  a.id_aviso AS id, ' +
      '  a.titulo, ' +
      '  a.contenido, ' +
      '  DATE_FORMAT(a.fecha_publicacion, \'%Y-%m-%d\') AS fecha, ' +
      '  a.tipo AS categoria, ' +
      '  a.prioridad, ' +
      '  a.notificar_familias, ' +
      '  MAX(ac.id_curso) AS id_curso, ' +
      '  CASE ' +
      '    WHEN COUNT(ac.id_curso) = 0 THEN \'Todos\' ' +
      '    WHEN COUNT(DISTINCT ac.id_curso) = (SELECT COUNT(*) FROM cursos) THEN \'Todos\' ' +
      '    WHEN COUNT(DISTINCT c.turno) = 1 AND COUNT(DISTINCT ac.id_curso) = (SELECT COUNT(*) FROM cursos WHERE turno = MAX(c.turno)) THEN CONCAT(\'Turno \', MAX(c.turno)) ' +
      '    WHEN COUNT(DISTINCT ac.id_curso) = 1 THEN MAX(CONCAT(c.anio, \'° \', c.division)) ' +
      '    ELSE GROUP_CONCAT(DISTINCT CONCAT(c.anio, \'° \', c.division) ORDER BY c.anio, c.division SEPARATOR \', \') ' +
      '  END AS destinatario, ' +
      '  CONCAT(u.nombre, \' \', u.apellido) AS autor, ' +
      '  u.rol AS rolAutor, ' +
      '  a.id_usuario ' +
      'FROM avisos a ' +
      'LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso ' +
      'LEFT JOIN cursos c ON ac.id_curso = c.id_curso ' +
      'LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario ' +
      'WHERE a.id_aviso = ? ' +
      'GROUP BY a.id_aviso ' +
      'LIMIT 1';
    const rows = await queryAsync(getAvisoSql, [noticeId]);
    return rows[0];
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

  async updatePassword(userId, contrasenaActual, nuevaContrasena) {
    const rows = await queryAsync('SELECT id_usuario, contrasena, rol FROM usuarios WHERE id_usuario = ?', [userId]);
    if (rows.length === 0) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }

    const usuario = rows[0];
    const dbPassword = usuario.contrasena || '';

    // Validar contraseña actual con bcrypt (soporte de texto plano para contingencia)
    const isBcrypt = dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$') || dbPassword.startsWith('$2y$');
    let matches = false;
    if (isBcrypt) {
      matches = await bcrypt.compare(contrasenaActual, dbPassword);
    } else {
      matches = (contrasenaActual === dbPassword);
    }

    if (!matches) {
      const err = new Error('La contraseña actual ingresada es incorrecta');
      err.status = 400;
      throw err;
    }

    // Validar que la nueva contraseña sea distinta a la actual
    if (contrasenaActual === nuevaContrasena) {
      const err = new Error('La nueva contraseña no puede ser idéntica a la contraseña actual');
      err.status = 400;
      throw err;
    }

    // Validar longitud mínima
    if (!nuevaContrasena || nuevaContrasena.trim().length < 4) {
      const err = new Error('La nueva contraseña debe tener al menos 4 caracteres');
      err.status = 400;
      throw err;
    }

    // Hashear con bcrypt y guardar
    const saltRounds = 10;
    const nuevoHash = await bcrypt.hash(nuevaContrasena, saltRounds);

    await queryAsync('UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?', [nuevoHash, userId]);

    return { mensaje: 'Contraseña actualizada correctamente' };
  },
};

module.exports = mysqlAdapter;
