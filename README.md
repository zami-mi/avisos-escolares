# Sistema de Avisos Escolares

Plataforma institucional de comunicados escolares y gestión de ausencias docentes, desarrollada con **React + Vite** en el frontend y **Node.js + Express** en el backend, conectada a una base de datos **MySQL** relacional. El sistema notifica a las familias **exclusivamente por correo electrónico** (sin dashboard familiar).

---

## Estructura del Proyecto

```
avisos-escolares/
│
├── backend/                             # Servidor API REST (Node.js + Express)
│   ├── adapters/
│   │   ├── dataAdapter.js               # Contrato/interfaz de datos (preparación para NEXUS)
│   │   ├── mysqlAdapter.js              # Implementación MySQL con pool, transacciones y lógica de negocio
│   │   └── index.js                     # Selector dinámico de proveedor según DATA_PROVIDER
│   ├── certs/
│   │   └── ca.pem                       # Certificado CA para bases de datos remotas con SSL
│   ├── db.js                            # Conexión MySQL (Pool), compatibilidad SSL dinámica y migraciones automáticas
│   ├── emailService.js                  # Envío de correos SMTP a familias (con fallback de simulación)
│   ├── server.js                        # Definición de rutas y middlewares Express
│   ├── .env                             # Variables de entorno (DB + SMTP) — no se versiona
│   ├── .env.example                     # Plantilla de variables de entorno (con opciones SSL)
│   └── package.json                     # Dependencias del backend (express, mysql2, nodemailer, etc.)
│
├── database/
│   └── avisos_escolares.sql             # Dump SQL completo del esquema y datos del prototipo
│
├── src/                                 # Frontend React
│   ├── main.jsx                         # Punto de entrada; monta <App /> en el DOM
│   ├── App.jsx                          # Componente raíz: autenticación, carga de datos y enrutamiento por rol
│   ├── App.css                          # Estilos globales de la aplicación
│   ├── index.css                        # Reset y tipografía base
│   │
│   ├── data/
│   │   └── mockData.js                  # Constantes de roles (ROLES) usadas en todo el proyecto
│   │
│   ├── services/                        # Capa de comunicación con el backend
│   │   ├── apiClient.js                 # Cliente HTTP base (fetch + manejo de errores centralizado)
│   │   ├── authService.js               # Login contra la API real
│   │   ├── noticeService.js             # CRUD de avisos (listar, crear, eliminar)
│   │   ├── absenceService.js            # Gestión de ausencias (listar por rol, crear, confirmar)
│   │   ├── notificationService.js       # Seguimiento de lecturas de avisos (alumnos)
│   │   ├── courseService.js             # Cursos y horarios del profesor
│   │   └── index.js                     # Re-exporta todos los servicios
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx               # Barra superior con nombre de usuario y botón de cierre de sesión
│   │   │   ├── NoticeDetailModal.jsx    # Modal para ver el contenido completo de un aviso
│   │   │   └── RoleBadge.jsx            # Insignia visual de rol (alumno, profesor, preceptor, etc.)
│   │   ├── notices/
│   │   │   ├── NoticeCard.jsx           # Tarjeta individual de aviso con botón "Ver aviso"
│   │   │   ├── NoticeFilters.jsx        # Barra de búsqueda y filtro por categoría
│   │   │   └── CreateNoticeModal.jsx    # Modal para crear un nuevo aviso con opción de notificar familias por email
│   │   └── absences/
│   │       ├── AbsenceTable.jsx         # Tabla de ausencias con estados (pendiente / confirmada)
│   │       └── CreateAbsenceModal.jsx   # Modal para registrar una nueva ausencia docente
│   │
│   ├── pages/                           # Dashboard por rol (uno por usuario)
│   │   ├── LoginPage.jsx                # Pantalla de inicio de sesión
│   │   ├── AlumnoDashboard.jsx          # Vista del alumno: avisos, lectura y marcar como leído
│   │   ├── ProfesorDashboard.jsx        # Vista del profesor: avisos y registro de ausencias propias
│   │   ├── PreceptorDashboard.jsx       # Vista del preceptor: ausencias a confirmar y emisión de avisos
│   │   ├── RegenteDashboard.jsx         # Vista del regente: avisos propios, gestión y eliminación de avisos
│   │   └── SecretariaDashboard.jsx      # Vista de secretaría: historial completo de ausencias y todos los avisos
│   │
│   ├── styles/
│   │   └── dashboard.css               # Estilos compartidos entre todos los dashboards y componentes
│   │
│   └── images/                          # Recursos gráficos (logo institucional, etc.)
│
├── index.html                           # HTML base del SPA (Vite)
├── vite.config.js                       # Configuración de Vite
├── eslint.config.js                     # Configuración de ESLint (React + React Compiler rules)
├── package.json                         # Dependencias del frontend y scripts (dev, build, lint)
└── .gitignore
```

---

## Ejecución

Para iniciar el backend (puerto `3002`) y el frontend (puerto `5173`) en desarrollo:

```bash
# Iniciar backend
cd backend
npm run dev

# Iniciar frontend (en otra terminal)
npm run dev
```

Para compilar el frontend para producción:
```bash
npm run build
```

---

## Variables de Entorno

Copiar `backend/.env.example` a `backend/.env` y completar los valores:

```ini
# Base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=avisos_escolares

# Proveedor de datos (mysql | nexus)
DATA_PROVIDER=mysql

# Configuración SSL para MySQL (opcional):
# - En local (localhost / 127.0.0.1) SSL se desactiva automáticamente para evitar errores de handshake.
# - En producción remota (Render, Aiven, AWS) se activa SSL con validación estricta usando certs/ca.pem.
# DB_SSL_MODE=disabled                     # 'disabled' o 'required'
# DB_CA_PATH=certs/ca.pem                  # Ruta al certificado CA
# DB_CA_CERT="-----BEGIN CERTIFICATE..."   # Alternativa como string en variables de entorno de Render
# DB_SSL_REJECT_UNAUTHORIZED=true          # Validación estricta del certificado CA

# SMTP para notificaciones a familias por email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@email.com
SMTP_PASS=tu_contrasena_de_aplicacion
EMAIL_FROM="Escuela <tu@email.com>"
```

Si las credenciales SMTP no están configuradas, `emailService.js` activa automáticamente un **modo simulación** que registra los envíos en consola sin enviar correos reales.

---

## Compatibilidad de Esquema y Base de Datos

El backend incluye inicializaciones automáticas en [`backend/db.js`](backend/db.js) para asegurar la compatibilidad sin necesidad de alterar manualmente la base de datos:

- **Pool de Conexiones (`mysql2.createPool`):** Maneja reconexiones automáticas, `keepAlive` (30s) y soporte contra desconexiones por inactividad en entornos como Render.
- **Detección Dinámica de SSL:** Previene el error `HANDSHAKE_SSL_ERROR` adaptando el uso de SSL según si el host es local o remoto.
- **Compatibilidad con columna `anio` / `año`:** Si la tabla `cursos` contiene originalmente la columna `año` (con tilde), el sistema genera automáticamente una columna virtual `anio` (`VIRTUAL GENERATED`), permitiendo compatibilidad nativa tanto con queries SQL limpias (`c.anio`) como con el selector del frontend (`1° 1`, `2° 2`, etc.) sin riesgo de `ER_BAD_FIELD_ERROR`.

---

## Usuarios del Prototipo (MySQL)

| Rol | Nombre | Email | Contraseña | Detalle |
|:----|:-------|:------|:-----------|:--------|
| **Alumno** | Juan Pérez | `juan.perez@escuela.com` | `1234` | Curso 5° 1ra (Tarde) |
| **Alumno** | Sofía Gómez | `sofia.gomez@escuela.com` | `2341` | Curso 2° 2da (Tarde) |
| **Profesor** | María González | `maria.gonzalez@escuela.com` | `5678` | Matemática / Inglés |
| **Profesor** | Carlos Martínez | `carlos.martinez@escuela.com` | `6785` | Computación / Base de Datos |
| **Preceptor** | Ana López | `ana.lopez@escuela.com` | `7856` | Cursos: 5° 1ra y 6° 2da |
| **Regente** | Laura Sánchez | `laura.sanchez@escuela.com` | `8567` | Gestión académica general |
| **Secretaría** | Patricia Díaz | `patricia.diaz@escuela.com` | `9109` | Registro y estadísticas |

---

## Flujo de Notificaciones a Familias

Al crear un aviso con la opción **"Notificar a las familias por correo electrónico"** activa:

1. El aviso se guarda en la tabla `avisos` dentro de una **transacción MySQL** controlada sobre el pool.
2. Se registran notificaciones internas en `notificaciones` para los alumnos de la app.
3. Se consultan los correos de las familias vinculadas a los cursos destinatarios (`familia_alumno` → `familias`).
4. `emailService.js` envía un correo individual a cada familia con deduplicación por dirección, gestionando errores por destinatario sin interrumpir el resto de envíos.

---

## Preparación para NEXUS

El backend implementa el patrón **Adaptador / Repositorio** (`backend/adapters/`):

- El proveedor activo se controla con `DATA_PROVIDER=mysql` en el `.env`.
- Para integrar la API institucional NEXUS, basta con crear `backend/adapters/nexusAdapter.js` respetando el contrato definido en `dataAdapter.js` y cambiar `DATA_PROVIDER=nexus`.
- El frontend y las rutas de la API permanecen **100% inalterados**.
