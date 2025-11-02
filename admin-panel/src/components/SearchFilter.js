import React from 'react';
import './SearchFilter.css';

function SearchFilter({
  searchTerm,
  onSearchChange,
  filters = {},
  onFilterChange = () => {},
  filterOptions = {},
  placeholder = 'Поиск…'
}) {
  return (
    <div className="search-filter-container">
      <div className="search-box">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="search-input"
        />
        {searchTerm && (
          <button
            type="button"
            className="clear-search"
            onClick={() => onSearchChange('')}
            title="Очистить поиск"
            aria-label="Очистить поиск"
          >
            ×
          </button>
        )}
      </div>

      {Object.keys(filterOptions).length > 0 && (
        <div className="filters">
          {filterOptions.status && (
            <select
              value={filters.status || ''}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">Все статусы</option>
              <option value="pending">Ожидает подтверждения</option>
              <option value="in_transit">Отправлен клиенту</option>
              <option value="delivered">Доставлен получателю</option>
              <option value="cancelled">Отменён</option>
            </select>
          )}

          {filterOptions.dateFrom && (
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              className="filter-input"
              placeholder="Дата с"
            />
          )}

          {filterOptions.dateTo && (
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              className="filter-input"
              placeholder="Дата до"
            />
          )}

          {filterOptions.minAmount && (
            <input
              type="number"
              value={filters.minAmount || ''}
              onChange={(e) => onFilterChange('minAmount', e.target.value)}
              className="filter-input"
              placeholder="Сумма от"
              min="0"
            />
          )}

          {filterOptions.maxAmount && (
            <input
              type="number"
              value={filters.maxAmount || ''}
              onChange={(e) => onFilterChange('maxAmount', e.target.value)}
              className="filter-input"
              placeholder="Сумма до"
              min="0"
            />
          )}

          {filterOptions.transactionType && (
            <select
              value={filters.transactionType || ''}
              onChange={(e) => onFilterChange('transactionType', e.target.value)}
              className="filter-select"
            >
              <option value="">Все операции</option>
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
            </select>
          )}

          {(filters.status ||
            filters.dateFrom ||
            filters.dateTo ||
            filters.minAmount ||
            filters.maxAmount ||
            filters.transactionType) && (
            <button
              type="button"
              className="clear-filters-btn"
              onClick={() => {
                Object.keys(filters).forEach((key) => {
                  onFilterChange(key, '');
                });
              }}
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchFilter;
