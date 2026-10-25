import { request } from './apiClient';

export const notificationService = {
  /**
   * Obtiene la lista de IDs de avisos leídos por el usuario.
   * @param {number} userId
   * @returns {Promise<number[]>}
   */
  async getReadNotices(userId) {
    return request(`/notificaciones/${userId}`);
  },

  /**
   * Cambia el estado leído/no leído de un aviso para un usuario.
   * @param {number} userId
   * @param {number} noticeId
   */
  async toggleRead(userId, noticeId) {
    return request('/notificaciones/toggle', {
      method: 'POST',
      body: JSON.stringify({ id_usuario: userId, id_aviso: noticeId }),
    });
  },

  /**
   * Marca un conjunto de avisos como leídos en bloque.
   * @param {number} userId
   * @param {number[]} noticeIds
   */
  async markAllAsRead(userId, noticeIds) {
    return request('/notificaciones/marcar-todas', {
      method: 'POST',
      body: JSON.stringify({ id_usuario: userId, ids_avisos: noticeIds }),
    });
  },
};
