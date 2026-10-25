import { request } from './apiClient';

export const absenceService = {
  /**
   * Obtiene todas las ausencias con filtros opcionales.
   * @param {{ estado?: string, curso?: string|number }} filters
   */
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.estado && filters.estado !== 'todos') {
      params.append('estado', filters.estado);
    }
    if (filters.curso) {
      params.append('curso', filters.curso);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/ausencias${query}`);
  },

  /**
   * Obtiene las ausencias de un profesor específico.
   * @param {number} userId
   */
  async getByProfesor(userId) {
    return request(`/ausencias/profesor/${userId}`);
  },

  /**
   * Obtiene las ausencias de los cursos asignados a un preceptor.
   * @param {number} userId
   */
  async getByPreceptor(userId) {
    return request(`/ausencias/preceptor/${userId}`);
  },

  /**
   * Obtiene el resumen estadístico de ausencias (para secretaría/regencia).
   */
  async getSummary() {
    return request('/ausencias/resumen');
  },

  /**
   * Registra una nueva ausencia docente.
   * @param {{ id_horario: number, fecha: string, motivo: string, notificar_familias: boolean }} absenceData
   */
  async create(absenceData) {
    return request('/ausencias', {
      method: 'POST',
      body: JSON.stringify(absenceData),
    });
  },

  /**
   * Confirma una ausencia docente y genera aviso automático a los alumnos del curso.
   * @param {number} absenceId
   * @param {{ id_usuario: number, confirmado_por: string }} confirmData
   */
  async confirm(absenceId, confirmData) {
    return request(`/ausencias/${absenceId}/confirmar`, {
      method: 'POST',
      body: JSON.stringify(confirmData),
    });
  },
};
