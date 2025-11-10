import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NotificationBell from './NotificationBell';
import UserProfile from './UserProfile';
import Comments from './Comments';
import ColorBends from './ColorBends';
import ProductSelector from './ProductSelector';
import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

const normalizeListResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
};

function Dashboard({ user, onLogout }) {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([{ product_id: '', quantity: 1, unit_price: 0 }]);
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: today,
    delivery_date: today,
    notes: '',
    items: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, statsRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/invoices`),
        axios.get(`${API_URL}/reports/stats`),
        axios.get(`${API_URL}/products?includeInactive=true`)
      ]);

      setInvoices(normalizeListResponse(invoicesRes.data));
      setStats(statsRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceDetails = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/invoices/${id}`);
      setSelectedInvoice(response.data);
    } catch (error) {
      console.error('Ошибка загрузки накладной:', error);
    }
  };

  const getStatusText = (status) => {
    const statuses = {
      pending: 'Ожидает',
      in_transit: 'В пути',
      delivered: 'Доставлено',
      cancelled: 'Отменено'
    };
    return statuses[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  };

  const handleCreateInvoice = () => {
    const invoiceNumber = `INV-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      invoice_number: invoiceNumber,
      invoice_date: today,
      delivery_date: today,
      notes: '',
      items: []
    });
    setInvoiceItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setShowCreateModal(true);
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const removeInvoiceItem = (index) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const updateInvoiceItem = (index, field, value) => {
    const updated = [...invoiceItems];
    if (field === 'quantity') {
      updated[index].quantity = value;
    } else if (field === 'unit_price') {
      updated[index].unit_price = value;
    } else {
      updated[index][field] = value;
    }
    setInvoiceItems(updated);
  };

  const handleProductSelect = (index, product) => {
    const updated = [...invoiceItems];
    if (product) {
      updated[index].product_id = product.id;
      updated[index].unit_price = Number(product.price) || 0;
    } else {
      updated[index].product_id = '';
      updated[index].unit_price = 0;
    }
    setInvoiceItems(updated);
  };

  const calculateTotal = () => {
    return invoiceItems.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0));
    }, 0);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_name: '', quantity: '', unit_price: '' }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const submitInvoice = async (e) => {
    e.preventDefault();
    
    if (!user.client_id) {
      alert('Ошибка: client_id не найден. Пожалуйста, обратитесь к администратору.');
      console.error('User object:', user);
      return;
    }

    const validItems = invoiceItems.filter(item => 
      item.product_id && item.quantity > 0 && item.unit_price > 0
    );

    if (validItems.length === 0) {
      alert('Пожалуйста, добавьте хотя бы один товар');
      return;
    }
    
    try {
      const invoiceData = {
        ...formData,
        invoice_date: today,
        client_id: user.client_id,
        status: 'pending',
        items: validItems
      };
      
      console.log('Отправка накладной:', invoiceData);
      
      await axios.post(`${API_URL}/invoices`, invoiceData);
      
      setShowCreateModal(false);
      fetchData();
      alert('Накладная успешно создана! Ожидает проверки бухгалтера.');
    } catch (error) {
      console.error('Ошибка создания накладной:', error);
      console.error('Response:', error.response?.data);
      alert(`Ошибка при создании накладной: ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) {
    return <div className="container"><h2>Загрузка...</h2></div>;
  }

  if (showProfile) {
    return (
      <div className="App">
        <div className="admin-header">
          <div className="admin-header-content">
            <h1>Клиентская панель - Профиль</h1>
            <div className="header-right">
              <NotificationBell user={user} />
              <span className="user-info active" style={{cursor: 'default'}}>
                👤 {user.username}
              </span>
              <button onClick={onLogout} className="logout-btn">Выйти</button>
            </div>
          </div>
        </div>

        <div className="container">
          <button onClick={() => setShowProfile(false)} className="back-btn">
            Назад
          </button>
          <UserProfile user={user} onUpdate={() => {}} />
        </div>
      </div>
    );
  }

  if (selectedInvoice) {
    return (
      <div>
        <div className="header">
          <h1>Клиентская панель</h1>
          <div className="header-right">
            <span className="user-info" onClick={() => { setSelectedInvoice(null); setShowProfile(true); }} style={{cursor: 'pointer'}}>
              👤 {user.username}
            </span>
            <button onClick={onLogout} className="logout-btn">Выйти</button>
          </div>
        </div>

        <div className="container">
          <button onClick={() => setSelectedInvoice(null)} className="back-btn">
            ← Назад к списку
          </button>

          <div className="invoice-details">
            <div className="invoice-header">
              <h2>Накладная № {selectedInvoice.invoice_number}</h2>
              <span className={`status-badge status-${selectedInvoice.status}`}>
                {getStatusText(selectedInvoice.status)}
              </span>
            </div>

            <div className="invoice-info-grid">
              <div className="info-item">
                <div className="info-label">Клиент</div>
                <div className="info-value">{selectedInvoice.client_name}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Email</div>
                <div className="info-value">{selectedInvoice.email || '-'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Телефон</div>
                <div className="info-value">{selectedInvoice.phone || '-'}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Дата накладной</div>
                <div className="info-value">{formatDate(selectedInvoice.invoice_date)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Дата доставки</div>
                <div className="info-value">{formatDate(selectedInvoice.delivery_date)}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Общая сумма</div>
                <div className="info-value">{formatCurrency(selectedInvoice.total_amount)}</div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div style={{marginTop: '20px'}}>
                <div className="info-label">Примечания</div>
                <div className="info-value">{selectedInvoice.notes}</div>
              </div>
            )}

            <h3 style={{marginTop: '30px', marginBottom: '15px', color: '#ffffff'}}>Товары</h3>
            <div className="card table-card">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Наименование</th>
                    <th>Количество</th>
                    <th>Цена за единицу</th>
                    <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items && selectedInvoice.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>

            <h3 style={{marginTop: '40px', marginBottom: '15px', color: '#ffffff'}}>Комментарии</h3>
            <Comments invoiceId={selectedInvoice.id} user={user} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <ColorBends
        colors={["#00ffd1", "#667eea", "#f093fb", "#43e97b"]}
        rotation={60}
        speed={0.2}
        scale={1.4}
        frequency={1.3}
        warpStrength={1.0}
        mouseInfluence={0.6}
        parallax={0.4}
        noise={0.05}
        transparent
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      />
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Клиентская панель</h1>
          <div className="header-right">
            <NotificationBell user={user} />
            <span className="user-info" onClick={() => setShowProfile(true)} style={{cursor: 'pointer'}} title="Перейти в профиль">
              👤 {user.username}
            </span>
            <button onClick={onLogout} className="logout-btn">Выйти</button>
          </div>
        </div>
      </div>

      <div className="container">
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Всего накладных</h3>
              <div className="stat-value">{invoices.length}</div>
            </div>
            <div className="stat-card">
              <h3>В обработке</h3>
              <div className="stat-value">
                {invoices.filter(inv => inv.status === 'pending' || inv.status === 'in_transit').length}
              </div>
            </div>
            <div className="stat-card">
              <h3>Доставлено</h3>
              <div className="stat-value">
                {invoices.filter(inv => inv.status === 'delivered').length}
              </div>
            </div>
            <div className="stat-card">
              <h3>Общая сумма</h3>
              <div className="stat-value">
                {formatCurrency(invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0))}
              </div>
            </div>
          </div>
        )}

        <div className="section-header">
          <h2 className="section-title">Мои накладные</h2>
          <button onClick={handleCreateInvoice} className="btn-primary">
            Создать накладную
          </button>
        </div>
        
        <div className="table-wrapper">
          <table className="glass-table glass-table--compact">
            <thead>
              <tr>
                <th>№ Накладной</th>
                <th>Клиент</th>
                <th>Дата</th>
                <th>Доставка</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{textAlign: 'center', padding: '30px'}}>
                    Нет накладных
                  </td>
                </tr>
              ) : (
                invoices.map(invoice => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoice_number}</td>
                    <td>{invoice.client_name}</td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>{formatDate(invoice.delivery_date)}</td>
                    <td>{formatCurrency(invoice.total_amount)}</td>
                    <td>
                      <span className={`status-badge status-${invoice.status}`}>
                        {getStatusText(invoice.status)}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => fetchInvoiceDetails(invoice.id)}
                        style={{background: '#667eea', color: 'white', padding: '6px 12px'}}
                      >
                        Подробнее
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-invoice-create" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-invoice">
              <h2>Создать новую накладную</h2>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setShowCreateModal(false)}
                title="Закрыть"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={submitInvoice} className="invoice-form">
              <div className="invoice-form-section">
                <h3 className="section-subtitle">📋 Основная информация</h3>
                <div className="form-grid-3col">
                  <div className="form-group">
                    <label>Номер накладной</label>
                    <input
                      type="text"
                      value={formData.invoice_number}
                      readOnly
                      className="readonly-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Дата накладной <span className="required">*</span></label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={() => {}}
                      readOnly
                      min={today}
                      max={today}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Желаемая дата доставки <span className="required">*</span></label>
                    <input
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Примечания</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="2"
                    placeholder="Дополнительная информация о заказе"
                  />
                </div>
              </div>

              <div className="invoice-form-section">
                <h3 className="section-subtitle">📦 Товары <span className="required">*</span></h3>
                
                <div className="invoice-items-table">
                  <div className="items-table-header">
                    <div className="item-col-product">Товар</div>
                    <div className="item-col-qty">Количество</div>
                    <div className="item-col-price">Цена за ед.</div>
                    <div className="item-col-total">Сумма</div>
                    <div className="item-col-actions">Действия</div>
                  </div>
                  
                  {invoiceItems.map((item, index) => (
                    <div key={index} className="item-table-row">
                      <div className="item-col-product">
                        <ProductSelector
                          products={products}
                          value={item.product_id}
                          onChange={(product) => handleProductSelect(index, product)}
                          placeholder="Выберите товар"
                        />
                      </div>
                      
                      <div className="item-col-qty">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, 'quantity', e.target.value)}
                          placeholder="1"
                          min="1"
                          step="1"
                          required
                        />
                      </div>
                      
                      <div className="item-col-price">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateInvoiceItem(index, 'unit_price', e.target.value)}
                          placeholder="0"
                          min="0"
                          required
                        />
                      </div>
                      
                      <div className="item-col-total">
                        <span className="item-total-display">
                          {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                        </span>
                      </div>
                      
                      <div className="item-col-actions">
                        {invoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInvoiceItem(index)}
                            className="btn-icon-danger"
                            title="Удалить товар"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={addInvoiceItem}
                  className="btn-add-item"
                >
                  ➕ Добавить товар
                </button>
              </div>

              <div className="invoice-total-section">
                <div className="invoice-total-label">Итого:</div>
                <div className="invoice-total-value">{formatCurrency(calculateTotal())}</div>
              </div>

              <div className="modal-footer-actions">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="btn-cancel"
                >
                  Отмена
                </button>
                <button type="submit" className="btn-submit">
                  Отправить на проверку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

