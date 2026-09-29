// Datos simulados para desarrollo Frontend sin backend
export const ROLES = {
  ALUMNO: "alumno",
  PROFESOR: "profesor",
  PRECEPTOR: "preceptor",
  REGENTE: "regente",
  SECRETARIA: "secretaria",
};

// Usuarios de prueba con las credenciales solicitadas
export const MOCK_USERS = [
  {
    id: 1,
    email: "alumno@gmail.com",
    password: "1234",
    nombre: "Lucas Benítez",
    rol: ROLES.ALUMNO,
    curso: "4to 2da",
    turno: "Mañana",
    avatar: "LB",
  },
  {
    id: 2,
    email: "profesor@gmail.com",
    password: "1234",
    nombre: "Prof. Martín Gómez",
    rol: ROLES.PROFESOR,
    materias: ["Matemática", "Física"],
    cursosAsignados: ["4to 2da", "5to 1ra"],
    avatar: "MG",
  },
  {
    id: 3,
    email: "preceptor@gmail.com",
    password: "1234",
    nombre: "Preceptora Andrea Silva",
    rol: ROLES.PRECEPTOR,
    divisiones: ["4to 1ra", "4to 2da", "5to 1ra"],
    turno: "Mañana",
    avatar: "AS",
  },
  {
    id: 4,
    email: "regente@gmail.com",
    password: "1234",
    nombre: "Lic. Carlos Navarro",
    rol: ROLES.REGENTE,
    cargo: "Regencia Docente y Académica",
    avatar: "CN",
  },
  {
    id: 5,
    email: "secretaria@gmail.com",
    password: "1234",
    nombre: "Valeria Rossi",
    rol: ROLES.SECRETARIA,
    cargo: "Secretaría Administrativa",
    avatar: "VR",
  },
];

// Categorías oficiales para clasificar los comunicados escolares según su temática
export const CATEGORIAS_AVISOS = [
  "Ausencias y Horarios",
  "Infraestructura y Servicios",
  "Calendario Escolar",
  "Reuniones y Eventos",
  "Comunidad y Cooperadora",
];

// Función para obtener la clase CSS normalizada de la categoría
export function getCategoryBadgeClass(category = "") {
  const normalized = String(category)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  return `cat-${normalized}`;
}

// Avisos de ejemplo clasificados según las nuevas categorías
export const INITIAL_NOTICES = [
  {
    id: 1,
    titulo: "Corte de agua programado y desinfección preventiva de tanques",
    contenido:
      "Se informa a toda la comunidad educativa que el próximo viernes desde las 13:00 hs se realizarán tareas de mantenimiento y desinfección en la red de agua del establecimiento, por lo que el turno tarde se verá desobligado.",
    categoria: "Infraestructura y Servicios",
    autor: "Lic. Carlos Navarro",
    rolAutor: ROLES.REGENTE,
    destinatario: "Todos",
    fecha: "2026-09-18",
    prioridad: "alta",
  },
  {
    id: 2,
    titulo: "Modificación de horario de ingreso y salida por mesa de examen",
    contenido:
      "Atención alumnos de 4to 2da: el día jueves el horario de ingreso será a las 08:50 hs debido a la sustanciación de mesas de examen de materias previas. Los módulos 1 y 2 quedan suspendidos.",
    categoria: "Ausencias y Horarios",
    autor: "Preceptora Andrea Silva",
    rolAutor: ROLES.PRECEPTOR,
    destinatario: "4to 2da",
    fecha: "2026-09-17",
    prioridad: "media",
  },
  {
    id: 3,
    titulo: "Próxima Jornada Institucional EMI - Cronograma de actividades",
    contenido:
      "El próximo miércoles se llevará a cabo la segunda Jornada EMI del ciclo lectivo. Se convoca al personal docente y se recuerda que los estudiantes no tendrán clases presenciales.",
    categoria: "Calendario Escolar",
    autor: "Lic. Carlos Navarro",
    rolAutor: ROLES.REGENTE,
    destinatario: "Todos",
    fecha: "2026-09-16",
    prioridad: "normal",
  },
  {
    id: 4,
    titulo: "Reunión General de Familias y Entrega de Informes de Avance",
    contenido:
      "Invitamos a las familias de 4to año a la reunión de seguimiento pedagógico que se llevará a cabo en el aula magna el martes a las 18:00 hs.",
    categoria: "Reuniones y Eventos",
    autor: "Preceptora Andrea Silva",
    rolAutor: ROLES.PRECEPTOR,
    destinatario: "4to 2da",
    fecha: "2026-09-15",
    prioridad: "media",
  },
  {
    id: 5,
    titulo: "Campaña Solidaria y Asamblea Anual de Cooperadora Escolar",
    contenido:
      "La Asociación Cooperadora convoca a la asamblea anual ordinaria y al lanzamiento del bono contribución para la adquisición de nuevo equipamiento para la sala de informática.",
    categoria: "Comunidad y Cooperadora",
    autor: "Lic. Carlos Navarro",
    rolAutor: ROLES.REGENTE,
    destinatario: "Todos",
    fecha: "2026-09-14",
    prioridad: "normal",
  },
];

// Ausencias informadas por profesores
export const INITIAL_ABSENCES = [
  {
    id: 101,
    profesorId: 2,
    profesorNombre: "Prof. Martín Gómez",
    fecha: "2026-09-22",
    horario: "07:30 a 09:30 hs (1° y 2° módulo)",
    materia: "Matemática",
    curso: "4to 2da",
    motivo: "Licencia médica con reposo laboral",
    estado: "pendiente", // 'pendiente' o 'confirmada'
    fechaEnvio: "2026-09-18",
    confirmadoPor: null,
    fechaConfirmacion: null,
  },
  {
    id: 102,
    profesorId: 2,
    profesorNombre: "Prof. Martín Gómez",
    fecha: "2026-09-10",
    horario: "10:00 a 12:00 hs (4° y 5° módulo)",
    materia: "Física",
    curso: "5to 1ra",
    motivo: "Mesa de examen universitario",
    estado: "confirmada",
    fechaEnvio: "2026-09-08",
    confirmadoPor: "Preceptora Andrea Silva",
    fechaConfirmacion: "2026-09-08",
  },
];

