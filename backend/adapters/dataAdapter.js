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
 * - deleteNotice(noticeId): Promise<boolean>
 * - getAbsences(filters): Promise<Absence[]>
 * - getAbsencesByPreceptor(userId): Promise<Absence[]>
 * - getAbsencesSummary(): Promise<AbsenceSummary>
 * - confirmAbsence(absenceId, confirmData): Promise<{ ausencia: Absence, aviso: Notice }>
 * - getReadNotifications(userId): Promise<number[]>
 * - toggleNotification(userId, noticeId): Promise<{ id_aviso: number, leido: boolean }>
 * - markAllNotifications(userId, noticeIds): Promise<number[]>
 * - updatePassword(userId, contrasenaActual, nuevaContrasena): Promise<{ mensaje: string }>
 *
 * MÉTODOS INACTIVOS (conservados mediante comentarios para rol Profesor):
 * - [ROL: Profesor] getAbsencesByProfesor(userId): Promise<Absence[]>
 * - [ROL: Profesor] createAbsence(absenceData): Promise<Absence>
 * - [ROL: Profesor] getTeacherSchedules(userId): Promise<Schedule[]>
 */

module.exports = {};
