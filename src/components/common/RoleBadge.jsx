import React from "react";

export default function RoleBadge({ rol }) {
  const getLabel = (role) => {
    switch (role) {
      case "alumno":
        return "Alumno";
      case "profesor":
        return "Profesor";
      case "preceptor":
        return "Preceptor";
      case "regente":
        return "Regente";
      case "secretaria":
        return "Secretaría";
      default:
        return role;
    }
  };

  return (
    <span className={`role-badge ${rol}`}>
      {getLabel(rol)}
    </span>
  );
}
