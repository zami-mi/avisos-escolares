const fs = require('fs');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const isLocalHost = (host) => {
    return !host || host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

const configureSsl = () => {
    const rawSslMode = (process.env.DB_SSL_MODE || '').trim().toLowerCase();
    const host = process.env.DB_HOST || 'localhost';

    // Desactivar explícitamente si se especifica o si es localhost y no se forzó SSL
    if (rawSslMode === 'disabled' || rawSslMode === 'false' || rawSslMode === '0') {
        return undefined;
    }
    if (!rawSslMode && isLocalHost(host)) {
        return undefined;
    }

    // Obtener CA si existe (por variable de entorno directa o por archivo)
    let caCertificate = null;
    if (process.env.DB_CA_CERT) {
        caCertificate = process.env.DB_CA_CERT.replace(/\\n/g, '\n');
    } else {
        const certPath = process.env.DB_CA_PATH
            ? path.resolve(process.env.DB_CA_PATH)
            : path.join(__dirname, 'certs', 'ca.pem');

        if (fs.existsSync(certPath)) {
            try {
                caCertificate = fs.readFileSync(certPath, 'utf8');
            } catch (err) {
                console.warn('[DB SSL] Advertencia: No se pudo leer el archivo de certificado CA:', err.message);
            }
        }
    }

    const rejectUnauthorizedEnv = (process.env.DB_SSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase();
    // Validación estricta activada por defecto (true) cuando se proporciona CA o cuando no se apague explícitamente
    const rejectUnauthorized = rejectUnauthorizedEnv === 'false' || rejectUnauthorizedEnv === '0'
        ? false
        : true;

    if (caCertificate) {
        return {
            ca: caCertificate,
            rejectUnauthorized
        };
    }

    // Si requiere SSL pero no hay archivo CA provisto, usar SSL con validación del sistema
    return {
        rejectUnauthorized
    };
};

const sslOptions = configureSsl();

// Pool de conexiones: maneja reconexiones automáticas, pooling y colas de espera
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'avisos_escolares',
    port: Number(process.env.DB_PORT) || 3306,
    charset: 'UTF8MB4',
    ssl: sslOptions,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000
});

// Verificar conexión inicial y estado de tablas
pool.getConnection((err, connection) => {
    if (err) {
        console.error('[DB] Error al conectar con MySQL:', err.message, '| code:', err.code);
        return;
    }
    console.log(`[DB] Conectado correctamente a MySQL (pool) [SSL: ${sslOptions ? 'activo' : 'inactivo'}]`);
    connection.release();
    asegurarEstructuraTablas();
    asegurarColumnaAnio();
});

function asegurarColumnaAnio() {
    // Si la base de datos solo tiene la columna `año` (con tilde),
    // creamos automáticamente la columna virtual `anio` para garantizar
    // compatibilidad tanto con código SQL estándar como con el frontend.
    const checkSql = `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'cursos'
          AND COLUMN_NAME IN ('anio', 'año')
    `;
    pool.query(checkSql, (err, rows) => {
        if (err || !rows) return;
        const colNames = rows.map(r => r.COLUMN_NAME);
        const hasAnio = colNames.includes('anio');
        const hasAnioConTilde = colNames.includes('año');

        if (!hasAnio && hasAnioConTilde) {
            const alterSql = `ALTER TABLE \`cursos\` ADD COLUMN \`anio\` INT GENERATED ALWAYS AS (\`año\`) VIRTUAL`;
            pool.query(alterSql, (alterErr) => {
                if (!alterErr) {
                    console.log('[DB] Columna virtual cursos.anio asegurada');
                }
            });
        }
    });
}

function asegurarEstructuraTablas() {
    const columnas = [
        {
            tabla: 'avisos',
            columna: 'prioridad',
            definicion: "VARCHAR(20) DEFAULT 'baja'"
        }
    ];

    columnas.forEach(({ tabla, columna, definicion }) => {
        const checkSql = `
            SELECT COUNT(*) AS total
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
        `;

        pool.query(checkSql, [tabla, columna], (err, rows) => {
            if (err) {
                console.error(
                    `[DB] Error verificando columna ${tabla}.${columna}:`,
                    err.message
                );
                return;
            }

            if (rows && rows[0].total === 0) {
                const alterSql = `
                    ALTER TABLE \`${tabla}\`
                    ADD COLUMN \`${columna}\` ${definicion}
                `;

                pool.query(alterSql, (alterErr) => {
                    if (alterErr) {
                        console.error(
                            `[DB] Error al agregar columna ${tabla}.${columna}:`,
                            alterErr.message
                        );
                    } else {
                        console.log(
                            `[DB] Columna asegurada: ${tabla}.${columna}`
                        );
                    }
                });
            }
        });
    });
}

module.exports = pool;
