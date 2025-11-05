import React from 'react';
import './SortableTable.css';

const DEFAULT_SORT_ICON = '\u2195';
const ASC_ICON = '\u25B4';
const DESC_ICON = '\u25BE';

function SortableTable({
  columns,
  data,
  sortColumn,
  sortDirection,
  onSort
}) {
  const handleSort = (columnKey) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column || !column.sortable) {
      return;
    }

    if (sortColumn === columnKey) {
      onSort(columnKey, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnKey, 'asc');
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) {
      return DEFAULT_SORT_ICON;
    }
    return sortDirection === 'asc' ? ASC_ICON : DESC_ICON;
  };

  return (
    <div className="sortable-table-container">
      <table className="glass-table sortable-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.sortable ? 'sortable' : ''}
                onClick={() => column.sortable && handleSort(column.key)}
                style={{ width: column.width }}
              >
                <div className="th-content">
                  <span>{column.label}</span>
                  {column.sortable && (
                    <span
                      className={`sort-icon ${
                        sortColumn === column.key ? 'active' : ''
                      }`}
                    >
                      {getSortIcon(column.key)}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="no-data">
                <div className="no-data-message">
                  <span className="no-data-icon" aria-hidden="true">
                    :~
                  </span>
                  <p>No data yet - adjust filters or refresh.</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row.id || index}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SortableTable;
