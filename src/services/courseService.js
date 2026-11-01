import { request } from './apiClient';

export const courseService = {
  /**
   * Obtiene todos los cursos de la institución desde la base de datos.
   */
  async getAll() {
    return request('/cursos');
  },

  /* [ROL: Profesor] Consulta exclusiva de horarios y materias asignadas a un profesor - INACTIVO
  async getProfesorSchedules(userId) {
    return request(`/profesor/${userId}/horarios`);
  },
  */
};
