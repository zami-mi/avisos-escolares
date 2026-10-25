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
│   │   ├── mysqlAdapter.js              # Implementación MySQL con transacciones y lógica de negocio
│   │   └── index.js                     # Selector dinámico de proveedor según DATA_PROVIDER
│   ├── db.js                            # Conexión a MySQL y migraciones de columnas en arranque
│   ├── emailService.js                  # Envío de correos SMTP a familias (con fallback de simulación)
│   ├── server.js                        # Definición de rutas y middlewares Express
│   ├── .env                             # Variables de entorno (DB + SMTP) — no se versiona
│   ├── .env.example                     # Plantilla de variables de entorno
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
├── vite.config.js                       # Configuración de Vite (proxy al backend en desarrollo)
├── eslint.config.js                     # Configuración de ESLint (React + React Compiler rules)
├── package.json                         # Dependencias del frontend y scripts (dev, build, lint)
└── .gitignore
```

---

## Ejecución

Para iniciar el backend (puerto `3002`) y el frontend (puerto `5173`) en paralelo:
npm run dev

Para compilar el frontend para producción:
npm run build

## Variables de Entorno

Copiar `backend/.env.example` a `backend/.env` y completar los valores:

# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=avisos_escolares

# Proveedor de datos (mysql | nexus)
DATA_PROVIDER=mysql

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

Al crear un aviso con la opción **"Notificar familias por correo"** activa:

1. El aviso se guarda en la tabla `avisos` dentro de una **transacción MySQL**.
2. Se registran notificaciones internas en `notificaciones` para los alumnos de la app.
3. Se consultan los correos de las familias vinculadas a los cursos destinatarios (`familia_alumno` → `familias`).
4. `emailService.js` envía un correo individual a cada familia con deduplicación por dirección, gestionando errores por destinatario sin interrumpir el resto de envíos.

---

## Preparación para NEXUS

El backend implementa el patrón **Adaptador / Repositorio** (`backend/adapters/`):

- El proveedor activo se controla con `DATA_PROVIDER=mysql` en el `.env`.
- Para integrar la API institucional NEXUS, basta con crear `backend/adapters/nexusAdapter.js` respetando el contrato definido en `dataAdapter.js` y cambiar `DATA_PROVIDER=nexus`.
- El frontend y las rutas de la API permanecen **100% inalterados**.

