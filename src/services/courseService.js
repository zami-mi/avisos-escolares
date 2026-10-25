import { request } from './apiClient';

export const courseService = {
  /**
   * Obtiene todos los cursos de la institución desde la base de datos.
   */
  async getAll() {
    return request('/cursos');
  },

  /**
   * Obtiene los horarios y materias asignadas a un profesor.
   * @param {number} userId
   */
  async getProfesorSchedules(userId) {
    return request(`/profesor/${userId}/horarios`);
  },
};
