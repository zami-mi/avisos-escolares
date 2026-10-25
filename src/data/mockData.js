

export const ROLES = {
  ALUMNO: "alumno",
  PROFESOR: "profesor",
  PRECEPTOR: "preceptor",
  REGENTE: "regente",
  SECRETARIA: "secretaria",
};

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
