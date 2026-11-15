/**
 * @interface SchoolDataAdapter
 * Contrato de acceso a datos para la plataforma escolar.
 * Define las operaciones abstractas que cualquier proveedor (MySQL local, futuro NEXUS API, etc.)
 * debe suministrar al backend.
 *
 * MÉTODOS OBLIGATORIOS ACTIVOS:
 * - authenticateUser(email, password): Promise<UserSession>
 * - getCourses(): Promise<Course[]>
 * - getCursosByPreceptor(userId): Promise<{ id_curso, curso }[]>
 * - getNotices(): Promise<Notice[]>
 * - getNoticesByAuthor(userId): Promise<Notice[]>
 * - createNotice(noticeData): Promise<Notice>
 * - updateNotice(noticeId, noticeData): Promise<Notice>
 * - deleteNotice(noticeId): Promise<boolean>
 * - getReadNotifications(userId): Promise<number[]>
 * - toggleNotification(userId, noticeId): Promise<{ id_aviso: number, leido: boolean }>
 * - markAllNotifications(userId, noticeIds): Promise<number[]>
 * - updatePassword(userId, contrasenaActual, nuevaContrasena): Promise<{ mensaje: string }>
 */

module.exports = {};
