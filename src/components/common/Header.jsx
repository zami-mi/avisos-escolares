import logo35 from "../../images/logo35.png";

export default function Header({ currentUser, onLogout, onOpenChangePassword }) {
  const isRolActivo = currentUser && ["alumno", "preceptor", "regente"].includes(currentUser.rol);

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <img src={logo35} alt="Logo RED35" />
        </div>
        <div className="brand-titles">
          <h2>RED35</h2>
        </div>
      </div>

      <div className="header-user-actions">
        {isRolActivo && (
          <button
            className="btn-change-password"
            onClick={onOpenChangePassword}
            title="Cambiar contraseña"
          >
            <i className="fa-solid fa-key" style={{ marginRight: "6px" }}></i>
            Cambiar contraseña
          </button>
        )}

        <button className="btn-logout" onClick={onLogout} title="Cerrar sesión">
          <i className="fa-solid fa-arrow-right-from-bracket" style={{ marginRight: "6px" }}></i>
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
