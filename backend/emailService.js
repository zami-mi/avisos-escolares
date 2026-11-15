const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const LOGO_PATH = path.join(__dirname, '../src/images/logo35.png');

function formatearFecha(fechaStr) {
  if (!fechaStr) {
    const hoy = new Date();
    const d = String(hoy.getDate()).padStart(2, '0');
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const y = hoy.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const partes = String(fechaStr).split('T')[0].split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return fechaStr;
}

/**
 * Crea y retorna el transporte de correo según las credenciales configuradas en el entorno.
 * Si las credenciales no están presentes, opera con un transport seguro que simula y registra
 * los envíos en consola sin interrumpi
 * r la operación del sistema escolar.
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
  async enviarAvisoAAlumnos({ aviso, destinatarios }) {
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return { total: 0, exitosos: 0, fallidos: 0, detalle: [] };
    }

    const transporter = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"RED35 - Avisos escolares"';
    const isMockTransport = !process.env.SMTP_USER || !process.env.SMTP_PASS;

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

    const tieneLogo = fs.existsSync(LOGO_PATH);
    const attachments = tieneLogo
      ? [
          {
            filename: 'logo35.png',
            path: LOGO_PATH,
            cid: 'logo35',
          },
        ]
      : [];

    for (const alumno of listaUnica) {
      const nombreAlumno = alumno.nombre
        ? `${alumno.nombre}${alumno.apellido ? ' ' + alumno.apellido : ''}`
        : 'Estudiante';

      const fechaFormateada = formatearFecha(aviso.fecha);
      const subject = `RED35 - ${aviso.titulo}`;

      const mailOptions = {
        from: fromAddress,
        to: alumno.email,
        subject,
        text: `RED35 - ${aviso.titulo}\n\nHola, ${nombreAlumno}\n\n${aviso.contenido}\n\nFecha: ${fechaFormateada}\nPublicado por: ${aviso.autor || 'Preceptoría / Regencia'}\n\n---------------------------------------------------------\nEste es un mensaje automático de la Escuela 35. Por favor no respondas a este correo.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #b81b14; padding: 14px 20px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  ${
                    tieneLogo
                      ? `<td width="48" style="vertical-align: middle; padding-right: 12px;">
                          <img src="cid:logo35" alt="Logo Escuela 35" width="40" height="40" style="display: block; border: 0; max-height: 40px; max-width: 40px; border-radius: 4px; object-fit: contain;" />
                        </td>`
                      : ''
                  }
                  <td style="vertical-align: middle;">
                    <h2 style="margin: 0; color: #ffffff; font-size: 1.15rem; font-weight: 700; line-height: 1.3;">RED35 - ${aviso.titulo}</h2>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding: 24px 22px; color: #2d3748;">
              <p style="margin: 0 0 16px 0; font-size: 1.05rem; font-weight: 600; color: #1a202c;">Hola, ${nombreAlumno}</p>
              <div style="background-color: #f7fafc; border-left: 4px solid #b81b14; padding: 16px 18px; margin: 16px 0 22px 0; border-radius: 4px;">
                <p style="margin: 0; color: #2d3748; font-size: 0.98rem; line-height: 1.65; white-space: pre-line;">${aviso.contenido}</p>
              </div>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #edf2f7; padding-top: 14px; font-size: 0.88rem; color: #4a5568;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Fecha:</strong> ${fechaFormateada}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Publicado por:</strong> ${aviso.autor || 'Preceptoría / Regencia'}</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #f8fafc; padding: 12px 20px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #a0aec0; text-align: center;">
              Mensaje escolar generado automáticamente. Por favor no respondas a este correo electrónico.
            </div>
          </div>
        `,
        attachments,
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        exitosos++;
        resultados.push({
          email: alumno.email,
          status: 'enviado',
          messageId: info?.messageId || 'simulado',
        });
        if (isMockTransport) {
          console.log(`[EMAIL SIMULADO] Aviso enviado a alumno: ${alumno.email} (${nombreAlumno})`);
        } else {
          console.log(`[EMAIL ENVIADO] Aviso enviado a alumno: ${alumno.email}`);
        }
      } catch (err) {
        fallidos++;
        console.error(`[EMAIL ERROR] Falló el envío a alumno ${alumno.email}:`, err.message);
        resultados.push({
          email: alumno.email,
          status: 'error',
          error: err.message,
        });
      }
    }

    return {
      total: listaUnica.length,
      exitosos,
      fallidos,
      detalle: resultados,
    };
  },

  async enviarAvisoAFamilias({ aviso, destinatarios }) {
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return { total: 0, exitosos: 0, fallidos: 0, detalle: [] };
    }

    const transporter = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"RED35 - avisos escolares" <avisos@escuela.com>';
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

    const tieneLogo = fs.existsSync(LOGO_PATH);
    const attachments = tieneLogo
      ? [
          {
            filename: 'logo35.png',
            path: LOGO_PATH,
            cid: 'logo35',
          },
        ]
      : [];

    for (const familiar of listaUnica) {
      const nombreDestinatario = familiar.nombre && familiar.apellido
        ? `${familiar.nombre} ${familiar.apellido}`
        : 'Familia / Tutor';

      const fechaFormateada = formatearFecha(aviso.fecha);

      const mailOptions = {
        from: fromAddress,
        to: familiar.email,
        subject: `RED35 - [Aviso a Familias] ${aviso.titulo}`,
        text: `RED35 - ${aviso.titulo}\n\nEstimada/o ${nombreDestinatario}:\n\n${aviso.contenido}\n\nFecha: ${fechaFormateada}\nDestinatarios: ${aviso.destinatario || 'Todos los cursos'}\nPublicado por: ${aviso.autor || 'Equipo Directivo / Preceptoría'}\n\n---------------------------------------------------------\nEste es un mensaje escolar automático. Por favor no responda a este correo.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #b81b14; padding: 14px 20px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  ${
                    tieneLogo
                      ? `<td width="48" style="vertical-align: middle; padding-right: 12px;">
                          <img src="cid:logo35" alt="Logo Escuela 35" width="40" height="40" style="display: block; border: 0; max-height: 40px; max-width: 40px; border-radius: 4px; object-fit: contain;" />
                        </td>`
                      : ''
                  }
                  <td style="vertical-align: middle;">
                    <h2 style="margin: 0; color: #ffffff; font-size: 1.15rem; font-weight: 700; line-height: 1.3;">RED35 - ${aviso.titulo}</h2>
                  </td>
                </tr>
              </table>
            </div>
            <div style="padding: 24px 22px; color: #2d3748;">
              <p style="font-size: 1rem; margin-top: 0;">Estimada/o <strong>${nombreDestinatario}</strong>:</p>
              <div style="background-color: #f7fafc; border-left: 4px solid #b81b14; padding: 16px 18px; margin: 16px 0 22px 0; border-radius: 4px;">
                <p style="margin: 0; color: #2d3748; font-size: 0.98rem; line-height: 1.65; white-space: pre-line;">${aviso.contenido}</p>
              </div>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #edf2f7; padding-top: 14px; font-size: 0.88rem; color: #4a5568;">
                <tr>
                  <td style="padding: 4px 0;"><strong>Fecha:</strong> ${fechaFormateada}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Destinatarios:</strong> ${aviso.destinatario || 'Toda la escuela'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;"><strong>Publicado por:</strong> ${aviso.autor || 'Equipo Directivo'}</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #f8fafc; padding: 12px 20px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #a0aec0; text-align: center;">
              Mensaje escolar oficial. Por favor no responda a este correo electrónico.
            </div>
          </div>
        `,
        attachments,
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
