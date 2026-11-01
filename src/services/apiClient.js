const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Extraer token de autenticación si está presente en localStorage
  const token = localStorage.getItem('avisos_auth_token');
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    // Si la respuesta no es JSON (o está vacía)
    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Si la sesión expiró o el token fue rechazado en rutas autenticadas
      if (response.status === 401 && endpoint !== '/login') {
        localStorage.removeItem('avisos_auth_token');
        localStorage.removeItem('avisos_current_user');
      }

      const errorMessage = (data && data.error) || (typeof data === 'string' && data) || `Error ${response.status}: ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Distinguir error de conexión / servidor caído
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const connError = new Error('No se pudo conectar con el servidor. Verificá que el backend esté ejecutándose.');
      connError.isConnectionError = true;
      throw connError;
    }
    throw error;
  }
}
