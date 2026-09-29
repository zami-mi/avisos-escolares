import React from "react";
import RoleBadge from "./RoleBadge";
import { getCategoryBadgeClass } from "../../data/mockData";

export default function NoticeDetailModal({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className={`notice-category-badge ${getCategoryBadgeClass(notice.categoria)}`}>
              {notice.categoria}
            </span>
            <h3 style={{ marginTop: "8px" }}>{notice.titulo}</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-meta-box">
          <p>
            <strong>Publicado por:</strong> {notice.autor}{" "}
            {notice.rolAutor && <RoleBadge rol={notice.rolAutor} />}
          </p>
          <p>
            <strong>Destinatarios:</strong> {notice.destinatario || "Comunidad Educativa"}
          </p>
          <p>
            <strong>Fecha de publicación:</strong> {notice.fecha}
          </p>
          <p>
            <strong>Prioridad:</strong>{" "}
            <span style={{ textTransform: "capitalize" }}>{notice.prioridad || "Normal"}</span>
          </p>
        </div>

        <div className="modal-body">
          <p className="modal-full-text">{notice.contenido}</p>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
