export const ROLES = {
  ALUMNO: "alumno",
  PRECEPTOR: "preceptor",
  REGENTE: "regente",
  JEFE_TALLER: "jefe_taller",
  AUTORIDAD: "autoridad",
  DIRECTIVO: "directivo",
};

export const ROLES_AUTORIDAD = [
  "regente",
  "jefe_taller",
  "jefe de taller",
  "autoridad",
  "directivo",
  "director",
];

export function isAutoridad(rol = "") {
  return ROLES_AUTORIDAD.includes(String(rol).toLowerCase().trim());
}

export function formatRoleLabel(rol = "") {
  const r = String(rol).toLowerCase().trim();
  switch (r) {
    case "alumno":
      return "Alumno";
    case "preceptor":
      return "Preceptor";
    case "regente":
      return "Regente";
    case "jefe_taller":
    case "jefe de taller":
      return "Jefe de Taller";
    case "directivo":
    case "director":
      return "Directivo";
    case "autoridad":
      return "Autoridad";
    default:
      return rol ? rol.charAt(0).toUpperCase() + rol.slice(1) : "Usuario";
  }
}

export const CATEGORIAS_AVISOS = [
  "Ausencias y Horarios",
  "Infraestructura y Servicios",
  "Calendario Escolar",
  "Reuniones y Eventos",
  "Comunidad y Cooperadora",
];

export function getCategoryBadgeClass(category = "") {
  const normalized = String(category)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
  return `cat-${normalized}`;
}
