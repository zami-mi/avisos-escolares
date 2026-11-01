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

  /**
   * Cambia la contraseña del usuario actualmente autenticado.
   * La identidad es extraída de forma segura por el backend mediante el token JWT.
   * @param {string} contrasenaActual
   * @param {string} nuevaContrasena
   * @param {string} confirmarContrasena
   * @returns {Promise<{mensaje: string}>}
   */
  async changePassword(contrasenaActual, nuevaContrasena, confirmarContrasena) {
    return request('/usuarios/cambiar-contrasena', {
      method: 'POST',
      body: JSON.stringify({
        contrasenaActual,
        nuevaContrasena,
        confirmarContrasena
      }),
    });
  },
};
