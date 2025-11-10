const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getPagination(query = {}, options = {}) {
  const {
    defaultPage = DEFAULT_PAGE,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    maxPageSize = MAX_PAGE_SIZE
  } = options;

  const page = parsePositiveInt(query.page, defaultPage);
  const pageSize = Math.min(
    parsePositiveInt(query.pageSize, defaultPageSize),
    maxPageSize
  );

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
}

function parseNumberRange(query = {}, minKey, maxKey) {
  const rawMin = query[minKey];
  const rawMax = query[maxKey];

  const min =
    rawMin !== undefined && rawMin !== ''
      ? Number.parseFloat(rawMin)
      : undefined;
  const max =
    rawMax !== undefined && rawMax !== ''
      ? Number.parseFloat(rawMax)
      : undefined;

  return {
    min: Number.isNaN(min) ? undefined : min,
    max: Number.isNaN(max) ? undefined : max
  };
}

function applyDateRange(conditions, params, field, from, to) {
  if (from) {
    conditions.push(`${field} >= ?`);
    params.push(from);
  }

  if (to) {
    conditions.push(`${field} <= ?`);
    params.push(to);
  }
}

function applyNumberRange(conditions, params, field, min, max) {
  if (min !== undefined) {
    conditions.push(`${field} >= ?`);
    params.push(min);
  }

  if (max !== undefined) {
    conditions.push(`${field} <= ?`);
    params.push(max);
  }
}

module.exports = {
  getPagination,
  parseNumberRange,
  applyDateRange,
  applyNumberRange
};
