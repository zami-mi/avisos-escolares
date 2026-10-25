export default function Header({ onLogout }) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <img src="/src/images/logo35.png" alt="Logo RED35" />
        </div>
        <div className="brand-titles">
          <h2>RED35</h2>
        </div>
      </div>

      <div className="header-user-actions">
        <button className="btn-logout" onClick={onLogout} title="Cerrar sesión">
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
