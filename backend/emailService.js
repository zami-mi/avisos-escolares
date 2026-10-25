const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

/**
 * Crea y retorna el transporte de correo según las credenciales configuradas en el entorno.
 * Si las credenciales no están presentes, opera con un transport seguro que simula y registra
 * los envíos en consola sin interrumpir la operación del sistema escolar.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  // Transporte de desarrollo / fallback cuando aún no se han configurado credenciales reales
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

const emailService = {
  /**
   * Envía un aviso por correo electrónico a la lista de familias destinatarias.
   * - Deduplica por dirección de correo para evitar envíos repetidos a una misma familia.
   * - Gestiona cada envío en forma aislada (un error individual no frena el resto).
   *
   * @param {object} params
   * @param {object} params.aviso { titulo, contenido, fecha, categoria, prioridad, destinatario, autor }
   * @param {Array<{ email: string, nombre?: string, apellido?: string, curso?: string }>} params.destinatarios
   * @returns {Promise<{ total: number, exitosos: number, fallidos: number, detalle: Array }>}
   */
  async enviarAvisoAFamilias({ aviso, destinatarios }) {
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return { total: 0, exitosos: 0, fallidos: 0, detalle: [] };
    }

    const transporter = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"Sistema de Avisos Escolares" <avisos@escuela.com>';
    const isMockTransport = !process.env.SMTP_USER || !process.env.SMTP_PASS;

    if (isMockTransport) {
      console.log('[EMAIL SERVICE] Modo desarrollo/simulación activo (credenciales SMTP pendientes en backend/.env).');
    }

    // Deduplicación estricta por dirección de correo en minúsculas
    const emailsUnicosMap = new Map();
    destinatarios.forEach((dest) => {
      if (dest && dest.email && typeof dest.email === 'string') {
        const emailNormalizado = dest.email.trim().toLowerCase();
        if (!emailsUnicosMap.has(emailNormalizado)) {
          emailsUnicosMap.set(emailNormalizado, {
            ...dest,
            email: emailNormalizado,
          });
        }
      }
    });

    const listaUnica = Array.from(emailsUnicosMap.values());
    const resultados = [];
    let exitosos = 0;
    let fallidos = 0;

    for (const familiar of listaUnica) {
      const nombreDestinatario = familiar.nombre && familiar.apellido
        ? `${familiar.nombre} ${familiar.apellido}`
        : 'Familia / Tutor';

      const mailOptions = {
        from: fromAddress,
        to: familiar.email,
        subject: `[Aviso Escolar] ${aviso.titulo}`,
        text: `Estimada/o ${nombreDestinatario}:

Se ha publicado un nuevo comunicado escolar institucional.

Título: ${aviso.titulo}
Categoría: ${aviso.categoria || 'Institucional'}
Prioridad: ${aviso.prioridad || 'Normal'}
Fecha: ${aviso.fecha || new Date().toISOString().split('T')[0]}
Destinatarios: ${aviso.destinatario || 'Todos los cursos'}
Emitido por: ${aviso.autor || 'Dirección / Preceptoría'}

Mensaje:
${aviso.contenido}

---------------------------------------------------------
Este es un mensaje institucional automático. Por favor no responda a este correo.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #b81b14; color: #ffffff; padding: 18px 24px;">
              <h2 style="margin: 0; font-size: 1.25rem;">Sistema de Avisos Escolares</h2>
              <p style="margin: 4px 0 0; font-size: 0.85rem; opacity: 0.9;">Comunicado oficial para las familias</p>
            </div>
            <div style="padding: 24px; color: #2d3748;">
              <p style="font-size: 1rem; margin-top: 0;">Estimada/o <strong>${nombreDestinatario}</strong>:</p>
              <div style="background-color: #f7fafc; border-left: 4px solid #b81b14; padding: 14px 18px; margin: 16px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 8px; color: #1a202c; font-size: 1.15rem;">${aviso.titulo}</h3>
                <p style="margin: 0; color: #4a5568; line-height: 1.6; white-space: pre-line;">${aviso.contenido}</p>
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 0.85rem; color: #718096;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Fecha:</strong> ${aviso.fecha || new Date().toISOString().split('T')[0]}</td>
                  <td style="padding: 4px 0;"><strong>Categoría:</strong> ${aviso.categoria || 'Institucional'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Destinatarios:</strong> ${aviso.destinatario || 'Toda la escuela'}</td>
                  <td style="padding: 4px 0;"><strong>Prioridad:</strong> <span style="text-transform: uppercase;">${aviso.prioridad || 'Normal'}</span></td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;" colspan="2"><strong>Publicado por:</strong> ${aviso.autor || 'Equipo Directivo'}</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #f7fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #a0aec0; text-align: center;">
              Mensaje institucional generado automáticamente. No responda a este correo electrónico.
            </div>
          </div>
        `,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        exitosos++;
        resultados.push({
          email: familiar.email,
          status: 'enviado',
          messageId: info?.messageId || 'simulado',
        });
        if (isMockTransport) {
          console.log(`[EMAIL SIMULADO] Aviso enviado a: ${familiar.email} (${nombreDestinatario})`);
        }
      } catch (err) {
        fallidos++;
        console.error(`[EMAIL ERROR] Falló el envío a ${familiar.email}:`, err.message);
        resultados.push({
          email: familiar.email,
          status: 'error',
          error: err.message,
        });
        // Se continúa con el siguiente email sin interrumpir los demás
      }
    }

    return {
      total: listaUnica.length,
      exitosos,
      fallidos,
      detalle: resultados,
    };
  },
};

module.exports = emailService;
