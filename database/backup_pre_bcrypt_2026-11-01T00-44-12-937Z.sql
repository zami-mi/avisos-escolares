-- BACKUP COMPLETO AVISOS ESCOLARES PRE-BCRYPT
-- Fecha: 2026-11-01T00:44:13.071Z

DROP TABLE IF EXISTS `alumnos`;
CREATE TABLE `alumnos` (
  `id_alumno` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_curso` int NOT NULL,
  PRIMARY KEY (`id_alumno`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_curso` (`id_curso`),
  CONSTRAINT `alumnos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `alumnos_ibfk_2` FOREIGN KEY (`id_curso`) REFERENCES `cursos` (`id_curso`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `alumnos` (`id_alumno`, `id_usuario`, `id_curso`) VALUES
(1, 1, 5),
(2, 2, 2),
(3, 3, 4),
(4, 4, 6);

DROP TABLE IF EXISTS `ausencias`;
CREATE TABLE `ausencias` (
  `id_ausencia` int NOT NULL AUTO_INCREMENT,
  `id_horario` int NOT NULL,
  `fecha` date NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `notificar_familias` tinyint(1) NOT NULL DEFAULT '0',
  `estado` varchar(20) DEFAULT 'pendiente',
  `confirmado_por` varchar(100) DEFAULT NULL,
  `fecha_confirmacion` date DEFAULT NULL,
  PRIMARY KEY (`id_ausencia`),
  KEY `id_horario` (`id_horario`),
  CONSTRAINT `ausencias_ibfk_1` FOREIGN KEY (`id_horario`) REFERENCES `horarios` (`id_horario`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `ausencias` (`id_ausencia`, `id_horario`, `fecha`, `motivo`, `notificar_familias`, `estado`, `confirmado_por`, `fecha_confirmacion`) VALUES
(1, 1, '2026-10-05 03:00:00', 'Motivos personales', 0, 'confirmada', 'Ana López', '2026-10-24 03:00:00'),
(2, 2, '2026-10-08 03:00:00', 'Turno médico', 0, 'pendiente', NULL, NULL),
(3, 2, '2026-10-26 03:00:00', 'Razones particulares / fuerza mayor', 1, 'pendiente', NULL, NULL),
(4, 1, '2026-10-26 03:00:00', 'Razones particulares / fuerza mayor', 1, 'confirmada', 'Ana López', '2026-10-25 03:00:00');

DROP TABLE IF EXISTS `avisos`;
CREATE TABLE `avisos` (
  `id_aviso` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) NOT NULL,
  `contenido` text NOT NULL,
  `fecha_publicacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `tipo` varchar(50) NOT NULL,
  `id_usuario` int NOT NULL,
  `notificar_familias` tinyint(1) NOT NULL DEFAULT '0',
  `prioridad` varchar(20) DEFAULT 'normal',
  PRIMARY KEY (`id_aviso`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `avisos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=109 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `avisos` (`id_aviso`, `titulo`, `contenido`, `fecha_publicacion`, `tipo`, `id_usuario`, `notificar_familias`, `prioridad`) VALUES
(1, 'Ausencia de profesor', 'La profesora no asistirá a clases el día lunes 29/09.', '2026-09-29 03:37:35', 'Ausencias y Horarios', 7, 1, 'normal'),
(2, 'Corte de agua', 'El día martes 30/09 habrá una interrupción temporal del servicio de agua.', '2026-09-29 03:37:35', 'Infraestructura y Servicios', 8, 0, 'normal'),
(3, 'Reunión de familias', 'Se realizará una reunión general de familias el próximo viernes 3/10.', '2026-09-29 03:37:35', 'Reuniones y Eventos', 7, 0, 'normal'),
(4, 'Acto escolar', 'El próximo viernes se realizará el acto escolar.', '2026-09-29 03:37:35', 'Calendario Escolar', 8, 0, 'normal'),
(5, 'Comunicado de cooperadora', 'La cooperadora informa sobre las próximas actividades.', '2026-09-29 03:37:35', 'Comunidad y Cooperadora', 8, 0, 'normal'),
(57, 'Ausencia Docente: María González (Matemática)', 'Se informa a los alumnos de 5° 1 que el día 2026-10-05 en el horario de 07:45 a 09:00 hs el/la docente no asistirá por motivos personales. Comunicado confirmado por Preceptoría.', '2026-10-25 00:55:40', 'Ausencias y Horarios', 7, 0, 'alta'),
(58, 'Expo automotor', 'Se llevara a cabo la expo automotor el dia xx/xx', '2026-10-25 16:53:52', 'Reuniones y Eventos', 8, 1, 'media'),
(59, 'Ausencia Docente: María González (Matemática)', 'Se informa a los alumnos de 5° 1 que el día 2026-10-26 en el horario de 07:45 a 09:00 hs el/la docente no asistirá por razones particulares / fuerza mayor. Comunicado confirmado por Preceptoría.', '2026-10-25 17:03:32', 'Ausencias y Horarios', 7, 1, 'alta'),
(63, 'Corte de luz', 'Debido a un corte de luz los alumnos se tuvieron que retirar', '2026-10-25 18:34:57', 'Ausencias y Horarios', 7, 1, 'alta'),
(64, 'Corte de luz', 'Debido a la falta de luz en el establecimiento escolar, los alumnos deben faltar el dia de hoy', '2026-10-27 01:45:26', 'Infraestructura y Servicios', 8, 1, 'alta');

DROP TABLE IF EXISTS `avisos_cursos`;
CREATE TABLE `avisos_cursos` (
  `id_aviso` int NOT NULL,
  `id_curso` int NOT NULL,
  PRIMARY KEY (`id_aviso`,`id_curso`),
  KEY `id_curso` (`id_curso`),
  CONSTRAINT `avisos_cursos_ibfk_1` FOREIGN KEY (`id_aviso`) REFERENCES `avisos` (`id_aviso`),
  CONSTRAINT `avisos_cursos_ibfk_2` FOREIGN KEY (`id_curso`) REFERENCES `cursos` (`id_curso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `avisos_cursos` (`id_aviso`, `id_curso`) VALUES
(3, 2),
(4, 4),
(1, 5),
(57, 5),
(59, 5),
(63, 5);

DROP TABLE IF EXISTS `cursos`;
CREATE TABLE `cursos` (
  `id_curso` int NOT NULL AUTO_INCREMENT,
  `año` int NOT NULL,
  `division` varchar(10) NOT NULL,
  `especialidad` varchar(20) DEFAULT NULL,
  `turno` varchar(6) NOT NULL,
  `anio` int GENERATED ALWAYS AS (`año`) VIRTUAL,
  PRIMARY KEY (`id_curso`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `cursos` (`id_curso`, `año`, `division`, `especialidad`, `turno`, `anio`) VALUES
(1, 1, '1', NULL, 'Mañana', 1),
(2, 2, '2', NULL, 'Tarde', 2),
(3, 3, '1', 'Automotores', 'Tarde', 3),
(4, 4, '2', 'Computación', 'Mañana', 4),
(5, 5, '1', 'Automotores', 'Tarde', 5),
(6, 6, '2', 'Computación', 'Mañana', 6);

DROP TABLE IF EXISTS `familia_alumno`;
CREATE TABLE `familia_alumno` (
  `id_familia` int NOT NULL,
  `id_alumno` int NOT NULL,
  PRIMARY KEY (`id_familia`,`id_alumno`),
  KEY `id_alumno` (`id_alumno`),
  CONSTRAINT `familia_alumno_ibfk_1` FOREIGN KEY (`id_familia`) REFERENCES `familias` (`id_familia`) ON DELETE CASCADE,
  CONSTRAINT `familia_alumno_ibfk_2` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id_alumno`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `familia_alumno` (`id_familia`, `id_alumno`) VALUES
(1, 1),
(2, 1),
(3, 2),
(4, 3),
(5, 4);

DROP TABLE IF EXISTS `familias`;
CREATE TABLE `familias` (
  `id_familia` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  `apellido` varchar(20) NOT NULL,
  `email` varchar(50) NOT NULL,
  `id_usuario` int DEFAULT NULL,
  PRIMARY KEY (`id_familia`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `familias` (`id_familia`, `nombre`, `apellido`, `email`, `id_usuario`) VALUES
(1, 'María', 'Pérez', 'zamirathabata@gmail.com', NULL),
(2, 'Carlos', 'Pérez', 'carlos.perez@gmail.com', NULL),
(3, 'Laura', 'Gómez', 'laura.gomez@gmail.com', NULL),
(4, 'Jorge', 'Rodríguez', 'jorge.rodriguez@gmail.com', NULL),
(5, 'Silvia', 'Fernández', 'silvia.fernandez@gmail.com', NULL);

DROP TABLE IF EXISTS `horarios`;
CREATE TABLE `horarios` (
  `id_horario` int NOT NULL AUTO_INCREMENT,
  `id_profesor` int NOT NULL,
  `id_materia` int NOT NULL,
  `id_curso` int NOT NULL,
  `dia_semana` enum('lunes','martes','miercoles','jueves','viernes') NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id_horario`),
  KEY `id_curso` (`id_curso`),
  KEY `horarios_ibfk_1` (`id_profesor`),
  KEY `horarios_ibfk_2` (`id_materia`),
  CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`id_profesor`) REFERENCES `profesores` (`id_profesor`),
  CONSTRAINT `horarios_ibfk_2` FOREIGN KEY (`id_materia`) REFERENCES `materias` (`id_materia`),
  CONSTRAINT `horarios_ibfk_3` FOREIGN KEY (`id_curso`) REFERENCES `cursos` (`id_curso`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `horarios` (`id_horario`, `id_profesor`, `id_materia`, `id_curso`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
(1, 2, 3, 5, 'lunes', '07:45:00', '09:00:00'),
(2, 1, 4, 2, 'miercoles', '10:50:00', '11:30:00'),
(3, 4, 1, 6, 'martes', '13:30:00', '14:50:00'),
(4, 3, 2, 4, 'jueves', '17:20:00', '18:00:00');

DROP TABLE IF EXISTS `materias`;
CREATE TABLE `materias` (
  `id_materia` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_materia`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `materias` (`id_materia`, `nombre`) VALUES
(1, 'Programación'),
(2, 'Base de Datos'),
(3, 'Matemática'),
(4, 'Inglés'),
(5, 'Civica');

DROP TABLE IF EXISTS `notificaciones`;
CREATE TABLE `notificaciones` (
  `id_notificacion` int NOT NULL AUTO_INCREMENT,
  `id_aviso` int NOT NULL,
  `id_usuario` int NOT NULL,
  `leido` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_lectura` datetime DEFAULT NULL,
  PRIMARY KEY (`id_notificacion`),
  KEY `id_aviso` (`id_aviso`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `notificaciones_ibfk_1` FOREIGN KEY (`id_aviso`) REFERENCES `avisos` (`id_aviso`),
  CONSTRAINT `notificaciones_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `notificaciones` (`id_notificacion`, `id_aviso`, `id_usuario`, `leido`, `fecha_lectura`) VALUES
(1, 1, 1, 1, '2026-10-25 19:29:19'),
(2, 3, 2, 0, NULL),
(3, 4, 4, 0, NULL),
(4, 1, 1, 1, '2026-10-25 19:29:19'),
(5, 3, 2, 0, NULL),
(6, 4, 4, 0, NULL),
(12, 5, 1, 1, '2026-10-25 19:29:19'),
(13, 2, 1, 1, '2026-10-25 19:29:19'),
(52, 57, 1, 1, '2026-10-25 19:29:19'),
(53, 58, 1, 1, '2026-10-25 19:29:19'),
(54, 58, 2, 0, NULL),
(55, 58, 3, 0, NULL),
(56, 58, 4, 0, NULL),
(57, 59, 1, 1, '2026-10-25 19:29:19'),
(64, 63, 1, 1, '2026-10-25 19:29:19'),
(65, 64, 1, 0, NULL),
(66, 64, 2, 0, NULL),
(67, 64, 3, 0, NULL),
(68, 64, 4, 0, NULL);

DROP TABLE IF EXISTS `preceptor_cursos`;
CREATE TABLE `preceptor_cursos` (
  `id_preceptor` int NOT NULL,
  `id_curso` int NOT NULL,
  PRIMARY KEY (`id_preceptor`,`id_curso`),
  KEY `id_curso` (`id_curso`),
  CONSTRAINT `preceptor_cursos_ibfk_1` FOREIGN KEY (`id_preceptor`) REFERENCES `preceptores` (`id_preceptor`),
  CONSTRAINT `preceptor_cursos_ibfk_2` FOREIGN KEY (`id_curso`) REFERENCES `cursos` (`id_curso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `preceptor_cursos` (`id_preceptor`, `id_curso`) VALUES
(1, 5),
(1, 6);

DROP TABLE IF EXISTS `preceptores`;
CREATE TABLE `preceptores` (
  `id_preceptor` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  PRIMARY KEY (`id_preceptor`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `preceptores_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `preceptores` (`id_preceptor`, `id_usuario`) VALUES
(1, 7);

DROP TABLE IF EXISTS `profesores`;
CREATE TABLE `profesores` (
  `id_profesor` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_curso` int NOT NULL,
  PRIMARY KEY (`id_profesor`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `profesores_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `profesores` (`id_profesor`, `id_usuario`, `id_curso`) VALUES
(1, 5, 2),
(2, 5, 5),
(3, 6, 4),
(4, 6, 6);

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `contrasena` varchar(10) NOT NULL,
  `rol` varchar(15) NOT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `usuarios` (`id_usuario`, `nombre`, `apellido`, `email`, `contrasena`, `rol`) VALUES
(1, 'Juan', 'Pérez', 'juan.perez@escuela.com', '1234', 'alumno'),
(2, 'Sofía', 'Gómez', 'sofia.gomez@escuela.com', '2341', 'alumno'),
(3, 'Mateo', 'Rodríguez', 'mateo.rodriguez@escuela.com', '3412', 'alumno'),
(4, 'Lucía', 'Fernández', 'lucia.fernandez@escuela.com', '4123', 'alumno'),
(5, 'María', 'González', 'maria.gonzalez@escuela.com', '5678', 'profesor'),
(6, 'Carlos', 'Martínez', 'carlos.martinez@escuela.com', '6785', 'profesor'),
(7, 'Ana', 'López', 'ana.lopez@escuela.com', '7856', 'preceptor'),
(8, 'Laura', 'Sánchez', 'laura.sanchez@escuela.com', '8567', 'regente'),
(9, 'Patricia', 'Díaz', 'patricia.diaz@escuela.com', '9109', 'secretaria');

DROP TABLE IF EXISTS `usuarios_backup_pre_bcrypt`;
CREATE TABLE `usuarios_backup_pre_bcrypt` (
  `id_usuario` int NOT NULL DEFAULT '0',
  `nombre` varchar(50) NOT NULL,
  `apellido` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `contrasena` varchar(10) NOT NULL,
  `rol` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `usuarios_backup_pre_bcrypt` (`id_usuario`, `nombre`, `apellido`, `email`, `contrasena`, `rol`) VALUES
(1, 'Juan', 'Pérez', 'juan.perez@escuela.com', '1234', 'alumno'),
(2, 'Sofía', 'Gómez', 'sofia.gomez@escuela.com', '2341', 'alumno'),
(3, 'Mateo', 'Rodríguez', 'mateo.rodriguez@escuela.com', '3412', 'alumno'),
(4, 'Lucía', 'Fernández', 'lucia.fernandez@escuela.com', '4123', 'alumno'),
(5, 'María', 'González', 'maria.gonzalez@escuela.com', '5678', 'profesor'),
(6, 'Carlos', 'Martínez', 'carlos.martinez@escuela.com', '6785', 'profesor'),
(7, 'Ana', 'López', 'ana.lopez@escuela.com', '7856', 'preceptor'),
(8, 'Laura', 'Sánchez', 'laura.sanchez@escuela.com', '8567', 'regente'),
(9, 'Patricia', 'Díaz', 'patricia.diaz@escuela.com', '9109', 'secretaria');

