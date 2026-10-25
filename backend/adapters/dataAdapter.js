/**
 * @interface SchoolDataAdapter
 * Contrato de acceso a datos para la plataforma escolar.
 * Define las operaciones abstractas que cualquier proveedor (MySQL local, futuro NEXUS API, etc.)
 * debe suministrar al backend.
 *
 * MÉTODOS OBLIGATORIOS:
 * - authenticateUser(email, password): Promise<UserSession>
 * - getCourses(): Promise<Course[]>
 * - getNotices(): Promise<Notice[]>
 * - getNoticesByAuthor(userId): Promise<Notice[]>
 * - createNotice(noticeData): Promise<Notice>
 * - deleteNotice(noticeId): Promise<boolean>
 * - getAbsences(filters): Promise<Absence[]>
 * - getAbsencesByProfesor(userId): Promise<Absence[]>
 * - getAbsencesByPreceptor(userId): Promise<Absence[]>
 * - getAbsencesSummary(): Promise<AbsenceSummary>
 * - createAbsence(absenceData): Promise<Absence>
 * - confirmAbsence(absenceId, confirmData): Promise<{ ausencia: Absence, aviso: Notice }>
 * - getTeacherSchedules(userId): Promise<Schedule[]>
 * - getReadNotifications(userId): Promise<number[]>
 * - toggleNotification(userId, noticeId): Promise<{ id_aviso: number, leido: boolean }>
 * - markAllNotifications(userId, noticeIds): Promise<number[]>
 * - verifyUserRole(userId, allowedRoles): Promise<{ authorized: boolean, user: object }>
 */

module.exports = {};
