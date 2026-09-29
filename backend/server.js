const express = require('express');
const cors = require('cors');

const conexion = require('./db');

const app = express();

app.use(cors());
app.use(express.json());


app.get('/api/test', (req, res) => {
    res.json({
        mensaje: 'El backend funciona correctamente'
    });
});

app.get('/api/cursos', (req, res) => {
    const sql = 'SELECT * FROM cursos';

    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                error: 'Error al consultar los cursos'
            });
        }

        res.json(resultados);
    });
});

app.get('/api/avisos', (req, res) => {
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
                ELSE CONCAT(c.año, '° ', c.division)
            END AS destinatario,
            CONCAT(u.nombre, ' ', u.apellido) AS autor,
            u.rol AS rolAutor
        FROM avisos a
        LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso
        LEFT JOIN cursos c ON ac.id_curso = c.id_curso
        LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
        ORDER BY a.fecha_publicacion DESC, a.id_aviso DESC
    `;

    conexion.query(sql, (error, resultados) => {
        if (error) {
            console.error('Error al consultar los avisos:', error);
            return res.status(500).json({
                error: 'Error al consultar los avisos'
            });
        }

        res.json(resultados);
    });
});


app.post('/api/login', (req, res) => {
    const { email, contrasena } = req.body;
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
                WHEN c.id_curso IS NOT NULL THEN CONCAT(c.año, '° ', c.division)
                ELSE NULL 
            END AS curso,
            c.turno
        FROM usuarios u
        LEFT JOIN alumnos al ON u.id_usuario = al.id_usuario
        LEFT JOIN cursos c ON al.id_curso = c.id_curso
        WHERE u.email = ? AND u.contrasena = ?
    `;

    conexion.query(sql, [email, contrasena], (error, resultados) => {
        if (error) {
            console.error(error);
            return res.status(500).json({
                error: 'Error en el servidor'
            });
        }

        if (resultados.length === 0) {
            return res.status(401).json({
                error: 'Email o contraseña incorrectos'
            });
        }

        const usuario = resultados[0];

        // Si es profesor, enriquecer con materias y cursos asignados desde horarios
        if (usuario.rol === 'profesor') {
            const profSql = `
                SELECT p.id_profesor
                FROM profesores p
                WHERE p.id_usuario = ?
            `;
            conexion.query(profSql, [usuario.id_usuario], (pErr, pRows) => {
                if (pErr || pRows.length === 0) {
                    return res.json({ mensaje: 'Inicio de sesión correcto', usuario });
                }

                const profIds = pRows.map(r => r.id_profesor);
                usuario.id_profesor = pRows[0].id_profesor;

                const horSql = `
                    SELECT DISTINCT m.nombre AS materia
                    FROM horarios h
                    JOIN materias m ON h.id_materia = m.id_materia
                    WHERE h.id_profesor IN (?)
                `;
                conexion.query(horSql, [profIds], (hErr, hRows) => {
                    if (!hErr) {
                        usuario.materias = hRows.map(r => r.materia);
                    }

                    const curSql = `
                        SELECT DISTINCT CONCAT(c.año, '° ', c.division) AS curso
                        FROM horarios h
                        JOIN cursos c ON h.id_curso = c.id_curso
                        WHERE h.id_profesor IN (?)
                    `;
                    conexion.query(curSql, [profIds], (cErr, cRows) => {
                        if (!cErr) {
                            usuario.cursosAsignados = cRows.map(r => r.curso);
                        }

                        res.json({ mensaje: 'Inicio de sesión correcto', usuario });
                    });
                });
            });
        } else if (usuario.rol === 'preceptor') {
            const precSql = `
                SELECT 
                    pc.id_curso,
                    CONCAT(c.año, '° ', c.division) AS curso,
                    c.turno
                FROM preceptores p
                JOIN preceptor_cursos pc ON p.id_preceptor = pc.id_preceptor
                JOIN cursos c ON pc.id_curso = c.id_curso
                WHERE p.id_usuario = ?
            `;
            conexion.query(precSql, [usuario.id_usuario], (prErr, prRows) => {
                if (!prErr && prRows.length > 0) {
                    usuario.divisiones = prRows.map(r => r.curso);
                    usuario.cursosAsignados = prRows.map(r => r.curso);
                    usuario.cursosIds = prRows.map(r => r.id_curso);
                    usuario.turno = prRows[0].turno;
                } else {
                    usuario.divisiones = [];
                    usuario.cursosAsignados = [];
                    usuario.cursosIds = [];
                    usuario.turno = 'Mañana';
                }
                res.json({ mensaje: 'Inicio de sesión correcto', usuario });
            });
        } else {
            res.json({
                mensaje: 'Inicio de sesión correcto',
                usuario
            });
        }
    });
});

app.get('/api/notificaciones/:id_usuario', (req, res) => {
    const { id_usuario } = req.params;
    const sql = 'SELECT id_aviso FROM notificaciones WHERE id_usuario = ? AND leido = 1';
    conexion.query(sql, [id_usuario], (err, resultados) => {
        if (err) {
            console.error('Error al obtener notificaciones leídas:', err);
            return res.status(500).json({ error: 'Error al obtener notificaciones leídas' });
        }
        const readNoticeIds = resultados.map(r => r.id_aviso);
        res.json(readNoticeIds);
    });
});

// Notificaciones detalladas de un usuario (aviso vinculado + estado de lectura)
app.get('/api/notificaciones/:id_usuario/detalle', (req, res) => {
    const { id_usuario } = req.params;
    const sql = `
        SELECT 
            n.id_notificacion,
            n.id_aviso,
            n.leido,
            DATE_FORMAT(n.fecha_lectura, '%Y-%m-%d %H:%i') AS fecha_lectura,
            a.titulo,
            a.tipo AS categoria,
            a.prioridad,
            DATE_FORMAT(a.fecha_publicacion, '%Y-%m-%d') AS fecha_aviso,
            CONCAT(u.nombre, ' ', u.apellido) AS autor
        FROM notificaciones n
        JOIN avisos a ON n.id_aviso = a.id_aviso
        LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
        WHERE n.id_usuario = ?
        ORDER BY n.leido ASC, a.fecha_publicacion DESC
    `;
    conexion.query(sql, [id_usuario], (err, resultados) => {
        if (err) {
            console.error('Error al obtener notificaciones detalladas:', err);
            return res.status(500).json({ error: 'Error al obtener notificaciones detalladas' });
        }
        res.json(resultados);
    });
});

app.post('/api/notificaciones/toggle', (req, res) => {
    const { id_usuario, id_aviso } = req.body;
    if (!id_usuario || !id_aviso) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const checkSql = 'SELECT id_notificacion, leido FROM notificaciones WHERE id_usuario = ? AND id_aviso = ? LIMIT 1';
    conexion.query(checkSql, [id_usuario, id_aviso], (err, rows) => {
        if (err) {
            console.error('Error al verificar notificación:', err);
            return res.status(500).json({ error: 'Error al verificar notificación' });
        }

        if (rows.length > 0) {
            const nuevoEstado = rows[0].leido === 1 ? 0 : 1;
            const fechaLectura = nuevoEstado === 1 ? new Date() : null;
            const updateSql = 'UPDATE notificaciones SET leido = ?, fecha_lectura = ? WHERE id_notificacion = ?';
            conexion.query(updateSql, [nuevoEstado, fechaLectura, rows[0].id_notificacion], (updErr) => {
                if (updErr) {
                    console.error('Error al actualizar notificación:', updErr);
                    return res.status(500).json({ error: 'Error al actualizar notificación' });
                }
                res.json({ id_aviso, leido: nuevoEstado === 1 });
            });
        } else {
            const insertSql = 'INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES (?, ?, 1, NOW())';
            conexion.query(insertSql, [id_aviso, id_usuario], (insErr) => {
                if (insErr) {
                    console.error('Error al registrar notificación:', insErr);
                    return res.status(500).json({ error: 'Error al registrar notificación' });
                }
                res.json({ id_aviso, leido: true });
            });
        }
    });
});


app.post('/api/notificaciones/marcar-todas', (req, res) => {
    const { id_usuario, ids_avisos } = req.body;
    if (!id_usuario || !Array.isArray(ids_avisos) || ids_avisos.length === 0) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const selectSql = 'SELECT id_notificacion, id_aviso FROM notificaciones WHERE id_usuario = ? AND id_aviso IN (?)';
    conexion.query(selectSql, [id_usuario, ids_avisos], (err, existing) => {
        if (err) {
            console.error('Error al consultar notificaciones existentes:', err);
            return res.status(500).json({ error: 'Error al consultar notificaciones' });
        }

        const existingAvisoIds = existing.map(r => r.id_aviso);
        const missingAvisoIds = ids_avisos.filter(id => !existingAvisoIds.includes(id));

        const updatePromise = new Promise((resolve, reject) => {
            if (existing.length === 0) return resolve();
            const updateSql = 'UPDATE notificaciones SET leido = 1, fecha_lectura = NOW() WHERE id_usuario = ? AND id_aviso IN (?)';
            conexion.query(updateSql, [id_usuario, existingAvisoIds], (uErr) => {
                if (uErr) reject(uErr);
                else resolve();
            });
        });

        const insertPromise = new Promise((resolve, reject) => {
            if (missingAvisoIds.length === 0) return resolve();
            const insertValues = missingAvisoIds.map(id => [id, id_usuario, 1, new Date()]);
            const insertSql = 'INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES ?';
            conexion.query(insertSql, [insertValues], (iErr) => {
                if (iErr) reject(iErr);
                else resolve();
            });
        });

        Promise.all([updatePromise, insertPromise])
            .then(() => {
                res.json({ mensaje: 'Todas las notificaciones marcadas como leídas', ids_avisos });
            })
            .catch((pErr) => {
                console.error('Error al marcar notificaciones como leídas:', pErr);
                res.status(500).json({ error: 'Error al marcar todas como leídas' });
            });
    });
});


// Horarios de un profesor (para popular selects en el modal de ausencias)
app.get('/api/profesor/:id_usuario/horarios', (req, res) => {
    const { id_usuario } = req.params;
    const sql = `
        SELECT 
            h.id_horario,
            m.nombre AS materia,
            CONCAT(c.año, '° ', c.division) AS curso,
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
    conexion.query(sql, [id_usuario], (err, resultados) => {
        if (err) {
            console.error('Error al consultar horarios:', err);
            return res.status(500).json({ error: 'Error al consultar horarios' });
        }
        res.json(resultados);
    });
});

// Obtener todas las ausencias con filtros opcionales (para Regencia, Secretaría)
// Acepta query params: ?estado=pendiente|confirmada  ?curso=id_curso
app.get('/api/ausencias', (req, res) => {
    const { estado, curso } = req.query;

    let conditions = [];
    let params = [];

    if (estado && (estado === 'pendiente' || estado === 'confirmada')) {
        conditions.push('aus.estado = ?');
        params.push(estado);
    }
    if (curso && !isNaN(Number(curso))) {
        conditions.push('c.id_curso = ?');
        params.push(Number(curso));
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
            CONCAT(c.año, '° ', c.division) AS curso,
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
    conexion.query(sql, params, (err, resultados) => {
        if (err) {
            console.error('Error al consultar ausencias:', err);
            return res.status(500).json({ error: 'Error al consultar ausencias' });
        }
        res.json(resultados);
    });
});

// Resumen estadístico de ausencias (para el panel de Secretaría)
app.get('/api/ausencias/resumen', (req, res) => {
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
    conexion.query(sql, (err, rows) => {
        if (err) {
            console.error('Error al obtener resumen de ausencias:', err);
            return res.status(500).json({ error: 'Error al obtener resumen' });
        }
        res.json(rows[0]);
    });
});


// Ausencias de un profesor específico
app.get(['/api/ausencias/profesor/:id_usuario', '/api/ausencias/:id_usuario'], (req, res) => {
    const { id_usuario } = req.params;
    const sql = `
        SELECT 
            aus.id_ausencia AS id,
            CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
            u.id_usuario AS profesorId,
            DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
            CONCAT(TIME_FORMAT(h.hora_inicio, '%H:%i'), ' a ', TIME_FORMAT(h.hora_fin, '%H:%i'), ' hs') AS horario,
            m.nombre AS materia,
            CONCAT(c.año, '° ', c.division) AS curso,
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
    conexion.query(sql, [id_usuario], (err, resultados) => {
        if (err) {
            console.error('Error al consultar ausencias del profesor:', err);
            return res.status(500).json({ error: 'Error al consultar ausencias' });
        }
        res.json(resultados);
    });
});

// Ausencias de los cursos a cargo de un preceptor específico
app.get('/api/ausencias/preceptor/:id_usuario', (req, res) => {
    const { id_usuario } = req.params;
    const sql = `
        SELECT 
            aus.id_ausencia AS id,
            CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
            u.id_usuario AS profesorId,
            DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
            CONCAT(TIME_FORMAT(h.hora_inicio, '%H:%i'), ' a ', TIME_FORMAT(h.hora_fin, '%H:%i'), ' hs') AS horario,
            m.nombre AS materia,
            CONCAT(c.año, '° ', c.division) AS curso,
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
    conexion.query(sql, [id_usuario], (err, resultados) => {
        if (err) {
            console.error('Error al consultar ausencias para preceptor:', err);
            return res.status(500).json({ error: 'Error al consultar ausencias' });
        }
        res.json(resultados);
    });
});

// Crear una nueva ausencia de profesor
app.post('/api/ausencias', (req, res) => {
    const { id_horario, fecha, motivo, notificar_familias } = req.body;
    if (!id_horario || !fecha) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (id_horario, fecha)' });
    }

    const notificarFamiliasVal = notificar_familias ? 1 : 0;
    const sql = 'INSERT INTO ausencias (id_horario, fecha, motivo, notificar_familias) VALUES (?, ?, ?, ?)';
    conexion.query(sql, [id_horario, fecha, motivo || null, notificarFamiliasVal], (err, result) => {
        if (err) {
            console.error('Error al registrar ausencia:', err);
            return res.status(500).json({ error: 'Error al registrar ausencia' });
        }

        // Devolver la ausencia creada en el formato del frontend
        const getSql = `
            SELECT 
                aus.id_ausencia AS id,
                CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
                u.id_usuario AS profesorId,
                DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
                CONCAT(TIME_FORMAT(h.hora_inicio, '%H:%i'), ' a ', TIME_FORMAT(h.hora_fin, '%H:%i'), ' hs') AS horario,
                m.nombre AS materia,
                CONCAT(c.año, '° ', c.division) AS curso,
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
        conexion.query(getSql, [result.insertId], (getErr, getRows) => {
            if (getErr || getRows.length === 0) {
                return res.json({ mensaje: 'Ausencia registrada', id: result.insertId, notificar_familias: notificarFamiliasVal === 1 });
            }
            res.json(getRows[0]);
        });
    });
});

// Confirmar ausencia docente y generar aviso automático a los alumnos (Preceptor)
app.post('/api/ausencias/:id_ausencia/confirmar', (req, res) => {
    const { id_ausencia } = req.params;
    const { id_usuario, confirmado_por } = req.body;

    const nombreConfirmador = confirmado_por || 'Preceptoría';

    // 1. Obtener detalles de la ausencia
    const infoSql = `
        SELECT 
            aus.id_ausencia,
            aus.id_horario,
            DATE_FORMAT(aus.fecha, '%Y-%m-%d') AS fecha,
            aus.motivo,
            CONCAT(u.nombre, ' ', u.apellido) AS profesorNombre,
            m.nombre AS materia,
            CONCAT(c.año, '° ', c.division) AS curso,
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

    conexion.query(infoSql, [id_ausencia], (infoErr, infoRows) => {
        if (infoErr || infoRows.length === 0) {
            console.error('Error al buscar ausencia:', infoErr);
            return res.status(404).json({ error: 'Ausencia no encontrada' });
        }

        const ausData = infoRows[0];

        // 2. Actualizar estado de la ausencia a confirmada
        const updSql = `
            UPDATE ausencias 
            SET estado = 'confirmada', confirmado_por = ?, fecha_confirmacion = CURDATE()
            WHERE id_ausencia = ?
        `;

        conexion.query(updSql, [nombreConfirmador, id_ausencia], (updErr) => {
            if (updErr) {
                console.error('Error al confirmar ausencia:', updErr);
                return res.status(500).json({ error: 'Error al confirmar ausencia' });
            }

            // 3. Crear aviso automático para los alumnos del curso
            const titulo = `Ausencia Docente: ${ausData.profesorNombre} (${ausData.materia})`;
            const motivoStr = ausData.motivo ? ausData.motivo.toLowerCase() : 'motivos justificados';
            const contenido = `Se informa a los alumnos de ${ausData.curso} que el día ${ausData.fecha} en el horario de ${ausData.horario} el/la docente no asistirá por ${motivoStr}. Comunicado confirmado por Preceptoría.`;
            const tipo = 'Ausencias y Horarios';
            const prioridad = 'alta';
            const autorId = id_usuario || 7;
            const notifFamilias = ausData.notificar_familias || 0;

            const avisoSql = `
                INSERT INTO avisos (titulo, contenido, tipo, prioridad, id_usuario, notificar_familias)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            conexion.query(avisoSql, [titulo, contenido, tipo, prioridad, autorId, notifFamilias], (avErr, avResult) => {
                if (avErr) {
                    console.error('Error al generar aviso automático:', avErr);
                    return res.status(500).json({ error: 'Ausencia confirmada pero error al generar aviso' });
                }

                const nuevoAvisoId = avResult.insertId;

                // 4. Vincular el aviso al curso afectado
                const cursoAvisoSql = 'INSERT INTO avisos_cursos (id_aviso, id_curso) VALUES (?, ?)';
                conexion.query(cursoAvisoSql, [nuevoAvisoId, ausData.id_curso], (acErr) => {
                    if (acErr) {
                        console.error('Error al vincular aviso con curso:', acErr);
                    }

                    // Función final para responder al frontend
                    const responder = () => {
                        const ausenciaConfirmada = {
                            id: Number(id_ausencia),
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

                        res.json({
                            mensaje: 'Ausencia confirmada y aviso generado exitosamente',
                            ausencia: ausenciaConfirmada,
                            aviso: avisoGenerado
                        });
                    };

                    // 5. Generar notificaciones en DB para los alumnos de la división afectada
                    const notifSql = 'SELECT id_usuario FROM alumnos WHERE id_curso = ?';
                    conexion.query(notifSql, [ausData.id_curso], (notifErr, alumnosRows) => {
                        if (!notifErr && alumnosRows && alumnosRows.length > 0) {
                            const notifValues = alumnosRows.map(a => [nuevoAvisoId, a.id_usuario, 0, null]);
                            conexion.query(
                                'INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES ?',
                                [notifValues],
                                (insNotifErr) => {
                                    if (insNotifErr) {
                                        console.error('Error al registrar notificaciones:', insNotifErr);
                                    }
                                    responder();
                                }
                            );
                        } else {
                            responder();
                        }
                    });
                });
            });
        });
    });
});

// Avisos publicados por un usuario específico (el regente ve los suyos propios)
app.get('/api/avisos/autor/:id_usuario', (req, res) => {
    const { id_usuario } = req.params;
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
                ELSE CONCAT(c.año, '° ', c.division)
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
    conexion.query(sql, [id_usuario], (err, resultados) => {
        if (err) {
            console.error('Error al consultar avisos del autor:', err);
            return res.status(500).json({ error: 'Error al consultar avisos del autor' });
        }
        res.json(resultados);
    });
});

// Crear aviso escolar (Preceptor, Regente, etc.)
app.post('/api/avisos', (req, res) => {
    const { titulo, contenido, categoria, destinatario, prioridad, id_usuario, notificar_familias } = req.body;

    if (!titulo || !contenido) {
        return res.status(400).json({ error: 'Título y contenido son obligatorios' });
    }

    if (!id_usuario) {
        return res.status(400).json({ error: 'Se requiere id_usuario para publicar un aviso' });
    }

    const tipoAviso = categoria || 'Institucional';
    const prioridadAviso = prioridad || 'normal';
    const autorUsuarioId = id_usuario;
    const notificarFamiliasVal = notificar_familias ? 1 : 0;

    const sql = `
        INSERT INTO avisos (titulo, contenido, tipo, prioridad, id_usuario, notificar_familias)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    conexion.query(sql, [titulo, contenido, tipoAviso, prioridadAviso, autorUsuarioId, notificarFamiliasVal], (err, result) => {
        if (err) {
            console.error('Error al publicar aviso:', err);
            return res.status(500).json({ error: 'Error al publicar aviso' });
        }

        const id_aviso = result.insertId;

        // Si el aviso es para un curso específico, insertarlo en avisos_cursos
        const vincularCursoYResponder = (idCurso = null, nombreDestinatario = 'Todos') => {
            // Devolver aviso formateado para el frontend
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
                        ELSE CONCAT(c.año, '° ', c.division)
                    END AS destinatario,
                    CONCAT(u.nombre, ' ', u.apellido) AS autor,
                    u.rol AS rolAutor
                FROM avisos a
                LEFT JOIN avisos_cursos ac ON a.id_aviso = ac.id_aviso
                LEFT JOIN cursos c ON ac.id_curso = c.id_curso
                LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
                WHERE a.id_aviso = ?
            `;
            conexion.query(getAvisoSql, [id_aviso], (gErr, gRows) => {
                if (gErr || gRows.length === 0) {
                    return res.json({
                        id: id_aviso,
                        titulo,
                        contenido,
                        categoria: tipoAviso,
                        destinatario: nombreDestinatario,
                        prioridad: prioridadAviso,
                        notificar_familias: notificarFamiliasVal === 1,
                        fecha: new Date().toISOString().split('T')[0]
                    });
                }
                res.json(gRows[0]);
            });
        };

        if (destinatario && destinatario !== 'Todos') {
            // Buscar id_curso que coincida con "X° Y"
            const searchCursoSql = `
                SELECT id_curso, CONCAT(año, '° ', division) AS curso_nombre 
                FROM cursos 
                WHERE CONCAT(año, '° ', division) = ? 
                   OR CONCAT(año, 'to ', division) = ? 
                   OR division = ?
                LIMIT 1
            `;
            conexion.query(searchCursoSql, [destinatario, destinatario, destinatario], (cErr, cRows) => {
                if (!cErr && cRows.length > 0) {
                    const id_curso = cRows[0].id_curso;
                    conexion.query('INSERT INTO avisos_cursos (id_aviso, id_curso) VALUES (?, ?)', [id_aviso, id_curso], () => {
                        // Generar notificaciones para los alumnos del curso
                        conexion.query('SELECT id_usuario FROM alumnos WHERE id_curso = ?', [id_curso], (aErr, aRows) => {
                            if (!aErr && aRows && aRows.length > 0) {
                                const notifValues = aRows.map(a => [id_aviso, a.id_usuario, 0, null]);
                                conexion.query('INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES ?', [notifValues], () => {
                                    vincularCursoYResponder(id_curso, cRows[0].curso_nombre);
                                });
                            } else {
                                vincularCursoYResponder(id_curso, cRows[0].curso_nombre);
                            }
                        });
                    });
                } else {
                    vincularCursoYResponder(null, 'Todos');
                }
            });
        } else {
            // Notificaciones para todos los alumnos si el aviso es general
            conexion.query('SELECT id_usuario FROM usuarios WHERE rol = "alumno"', (aErr, aRows) => {
                if (!aErr && aRows && aRows.length > 0) {
                    const notifValues = aRows.map(a => [id_aviso, a.id_usuario, 0, null]);
                    conexion.query('INSERT INTO notificaciones (id_aviso, id_usuario, leido, fecha_lectura) VALUES ?', [notifValues], () => {
                        vincularCursoYResponder(null, 'Todos');
                    });
                } else {
                    vincularCursoYResponder(null, 'Todos');
                }
            });
        }
    });
});


// Eliminar aviso escolar
app.delete('/api/avisos/:id_aviso', (req, res) => {
    const { id_aviso } = req.params;

    // Eliminar notificaciones leídas asociadas primero
    conexion.query('DELETE FROM notificaciones WHERE id_aviso = ?', [id_aviso], () => {
        // Eliminar vínculo con curso
        conexion.query('DELETE FROM avisos_cursos WHERE id_aviso = ?', [id_aviso], () => {
            // Eliminar aviso
            conexion.query('DELETE FROM avisos WHERE id_aviso = ?', [id_aviso], (err, result) => {
                if (err) {
                    console.error('Error al eliminar aviso:', err);
                    return res.status(500).json({ error: 'Error al eliminar aviso' });
                }
                res.json({ mensaje: 'Aviso eliminado correctamente', id_aviso: Number(id_aviso) });
            });
        });
    });
});

// Consultar familias de un alumno según la base de datos
app.get('/api/familias/alumno/:id_alumno', (req, res) => {
    const { id_alumno } = req.params;
    const sql = `
        SELECT f.id_familia, f.nombre, f.apellido, f.email
        FROM familias f
        JOIN familia_alumno fa ON f.id_familia = fa.id_familia
        WHERE fa.id_alumno = ?
    `;

    conexion.query(sql, [id_alumno], (err, resultados) => {
        if (err) {
            console.error('Error al consultar familias del alumno:', err);
            return res.status(500).json({ error: 'Error al consultar familias del alumno' });
        }
        res.json({ familias: resultados || [] });
    });
});

const PORT = 3002;

app.listen(PORT, () => {
    console.log(`Servidor backend ejecutándose en http://localhost:${PORT}`);
});