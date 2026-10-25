import { request } from './apiClient';

export const noticeService = {
  /**
   * Obtiene todos los avisos de la base de datos real.
   */
  async getAll() {
    return request('/avisos');
  },

  /**
   * Obtiene los avisos creados por un autor específico.
   * @param {number} userId
   */
  async getByAuthor(userId) {
    return request(`/avisos/autor/${userId}`);
  },

  /**
   * Crea un nuevo aviso escolar en la base de datos.
   * @param {object} noticeData { titulo, contenido, categoria, destinatario, prioridad, id_usuario, notificar_familias }
   */
  async create(noticeData) {
    return request('/avisos', {
      method: 'POST',
      body: JSON.stringify(noticeData),
    });
  },

  /**
   * Elimina un aviso existente.
   * @param {number} noticeId
   */
  async delete(noticeId) {
    return request(`/avisos/${noticeId}`, {
      method: 'DELETE',
    });
  },
};
