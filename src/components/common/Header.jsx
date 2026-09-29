import React from "react";
import RoleBadge from "./RoleBadge";

export default function Header({ currentUser, onLogout }) {
  return (
    <>
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">AE</div>
          <div className="brand-titles">
            <h2>Avisos Escolares</h2>
          </div>
        </div>

        <div className="header-user-actions">
          <button className="btn-logout" onClick={onLogout} title="Cerrar sesión">
            Cerrar Sesión
          </button>
        </div>
      </header>
    </>
  );
}
