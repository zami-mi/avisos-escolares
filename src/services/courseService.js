import { request } from './apiClient';

export const courseService = {
  /**
   * Obtiene todos los cursos de la institución desde la base de datos.
   */
  async getAll() {
    return request('/cursos');
  },
};
