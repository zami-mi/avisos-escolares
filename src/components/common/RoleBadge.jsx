import { formatRoleLabel } from "../../data/mockData";

export default function RoleBadge({ rol }) {
  return (
    <span className={`role-badge ${(rol || "").replace(/\s+/g, "_")}`}>
      {formatRoleLabel(rol)}
    </span>
  );
}
