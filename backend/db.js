const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const conexion = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'avisos_escolares',
    port: Number(process.env.DB_PORT) || 3306
});

conexion.connect((error) => {
    if (error) {
        console.error('Error al conectar con MySQL:', error);
        return;
    }

    console.log('Conectado correctamente a MySQL');
    asegurarEstructuraTablas();
    corregirAsignacionesHorarios();
});

function asegurarEstructuraTablas() {
    const columnas = [
        { tabla: 'avisos', columna: 'prioridad', definicion: "VARCHAR(20) DEFAULT 'normal'" },
        { tabla: 'ausencias', columna: 'estado', definicion: "VARCHAR(20) DEFAULT 'pendiente'" },
        { tabla: 'ausencias', columna: 'confirmado_por', definicion: "VARCHAR(100) NULL" },
        { tabla: 'ausencias', columna: 'fecha_confirmacion', definicion: "DATE NULL" }
    ];

    columnas.forEach(({ tabla, columna, definicion }) => {
        const checkSql = `
            SELECT COUNT(*) AS total 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'avisos_escolares' 
              AND TABLE_NAME = ? 
              AND COLUMN_NAME = ?
        `;
        conexion.query(checkSql, [tabla, columna], (err, rows) => {
            if (!err && rows && rows[0].total === 0) {
                const alterSql = `ALTER TABLE \`${tabla}\` ADD COLUMN \`${columna}\` ${definicion}`;
                conexion.query(alterSql, (alterErr) => {
                    if (alterErr) {
                        console.error(`Error al asegurar columna ${columna} en ${tabla}:`, alterErr.message);
                    } else {
                        console.log(`Columna asegurada: ${tabla}.${columna}`);
                    }
                });
            }
        });
    });
}

function corregirAsignacionesHorarios() {
    // Asegurar que Programación y Base de Datos (Computación) pertenezcan al docente de Computación (Carlos Martínez),
    // y que Matemática e Inglés pertenezcan a María González según la asignación de cursos.
    const updates = [
        "UPDATE horarios SET id_profesor = 2 WHERE id_horario = 1 AND id_profesor != 2",
        "UPDATE horarios SET id_profesor = 1 WHERE id_horario = 2 AND id_profesor != 1",
        "UPDATE horarios SET id_profesor = 4 WHERE id_horario = 3 AND id_profesor != 4",
        "UPDATE horarios SET id_profesor = 3 WHERE id_horario = 4 AND id_profesor != 3"
    ];
    updates.forEach((sql) => {
        conexion.query(sql, () => {});
    });
}

module.exports = conexion;