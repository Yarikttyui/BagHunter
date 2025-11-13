import React from "react";

import { FiSearch, FiX, FiRefreshCcw } from "react-icons/fi";

import "./SearchFilter.css";

function SearchFilter({
  searchTerm,

  onSearchChange,

  filters = {},

  onFilterChange = () => {},

  filterOptions = {},

  placeholder = "Введите поисковый запрос...",
}) {
  const handleClearFilters = () => {
    Object.keys(filters).forEach((key) => {
      onFilterChange(key, "");
    });
  };

  const hasActiveFilters =
    filters.status ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.transactionType;

  return (
    <div className="search-filter-container">
      <div className="search-box">
        <span className="search-icon" aria-hidden="true">
          <FiSearch />
        </span>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="search-input"
          aria-label="Поисковый запрос"
        />

        {searchTerm && (
          <button
            type="button"
            className="clear-search"
            onClick={() => onSearchChange("")}
            title="Очистить поиск"
            aria-label="Очистить поиск"
          >
            <FiX aria-hidden="true" />
          </button>
        )}
      </div>

      {Object.keys(filterOptions).length > 0 && (
        <div className="filters">
          {filterOptions.status && (
            <select
              value={filters.status || ""}
              onChange={(e) => onFilterChange("status", e.target.value)}
              className="filter-select"
              aria-label="Фильтр по статусу"
            >
              <option value="">Все статусы</option>

              <option value="pending">Ожидает обработки</option>

              <option value="in_transit">В пути</option>

              <option value="delivered">Доставлено</option>

              <option value="cancelled">Отменено</option>
            </select>
          )}

          {filterOptions.dateFrom && (
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => onFilterChange("dateFrom", e.target.value)}
              className="filter-input"
              placeholder="Дата с"
              aria-label="Дата с"
            />
          )}

          {filterOptions.dateTo && (
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => onFilterChange("dateTo", e.target.value)}
              className="filter-input"
              placeholder="Дата по"
              aria-label="Дата по"
            />
          )}

          {filterOptions.minAmount && (
            <input
              type="number"
              value={filters.minAmount || ""}
              onChange={(e) => onFilterChange("minAmount", e.target.value)}
              className="filter-input"
              placeholder="Мин. сумма"
              min="0"
              aria-label="Минимальная сумма"
            />
          )}

          {filterOptions.maxAmount && (
            <input
              type="number"
              value={filters.maxAmount || ""}
              onChange={(e) => onFilterChange("maxAmount", e.target.value)}
              className="filter-input"
              placeholder="Макс. сумма"
              min="0"
              aria-label="Максимальная сумма"
            />
          )}

          {filterOptions.transactionType && (
            <select
              value={filters.transactionType || ""}
              onChange={(e) =>
                onFilterChange("transactionType", e.target.value)
              }
              className="filter-select"
              aria-label="Тип транзакции"
            >
              <option value="">Все типы</option>

              <option value="income">Приход</option>

              <option value="expense">Расход</option>
            </select>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              className="clear-filters-btn"
              onClick={handleClearFilters}
            >
              <FiRefreshCcw className="inline-icon" aria-hidden="true" />
              Очистить фильтры
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchFilter;
