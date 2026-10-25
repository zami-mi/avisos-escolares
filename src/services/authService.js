import { request } from './apiClient';

export const authService = {
  /**
   * Inicia sesión validando credenciales contra la base de datos real.
   * @param {string} email
   * @param {string} contrasena
   * @returns {Promise<{mensaje: string, usuario: object}>}
   */
  async login(email, contrasena) {
    return request('/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), contrasena }),
    });
  },
};
