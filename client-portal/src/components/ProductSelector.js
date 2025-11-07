import React, { useMemo, useState, useRef, useEffect } from 'react';
import './ProductSelector.css';

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2
});

function formatPrice(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return currencyFormatter.format(Number(value) || 0);
}

function ProductSelector({ products = [], value, onChange, placeholder = 'Выберите товар' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(value)),
    [products, value]
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return products;
    }
    return products.filter((product) => {
      const haystack = [
        product.name,
        product.category,
        product.unit,
        product.description,
        product.price && String(product.price)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [products, search]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (product) => {
    onChange(product || null);
    setIsOpen(false);
  };

  return (
    <div className={`product-selector ${isOpen ? 'open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="selector-control"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {selectedProduct ? (
          <div className="selector-value">
            <span className="selector-name">{selectedProduct.name}</span>
            <span className="selector-meta">
              {formatPrice(selectedProduct.price)} · {selectedProduct.unit || 'ед.'}
            </span>
          </div>
        ) : (
          <span className="selector-placeholder">{placeholder}</span>
        )}
        <span className="selector-arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="selector-dropdown">
          <div className="selector-search">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, категории или цене"
            />
            {selectedProduct && (
              <button
                type="button"
                className="selector-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch('');
                  handleSelect(null);
                }}
              >
                Очистить
              </button>
            )}
          </div>
          <div className="selector-list">
            {filteredProducts.length === 0 ? (
              <div className="selector-empty">Ничего не найдено</div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  className={`selector-item ${
                    String(product.id) === String(value) ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(product)}
                >
                  <div className="selector-item-name">{product.name}</div>
                  <div className="selector-item-meta">
                    <span>{formatPrice(product.price)} · {product.unit || 'ед.'}</span>
                    <span className="selector-item-category">
                      {product.category || 'Без категории'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductSelector;
