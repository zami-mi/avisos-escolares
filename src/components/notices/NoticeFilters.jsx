import { CATEGORIAS_AVISOS } from "../../data/mockData";

export default function NoticeFilters({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories = ["Todos", ...CATEGORIAS_AVISOS],
}) {
  return (
    <div className="filters-bar">
      <div className="search-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar avisos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="category-chips">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`chip-btn ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
