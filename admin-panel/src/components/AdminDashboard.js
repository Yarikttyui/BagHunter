import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ColorBends from './ColorBends';
import NotificationBell from './NotificationBell';
import SearchFilter from './SearchFilter';
import Pagination from './Pagination';
import SortableTable from './SortableTable';
import AdminComments from './AdminComments';
import { API_BASE_URL, ASSET_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [invoiceLogs, setInvoiceLogs] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);

  const [draggedTab, setDraggedTab] = useState(null);
  const [tabOrder, setTabOrder] = useState(() => {
    const saved = localStorage.getItem(`tabOrder_${user.id}`);
    return saved ? JSON.parse(saved) : null;
  });

  const [searchTermClients, setSearchTermClients] = useState('');
  const [searchTermInvoices, setSearchTermInvoices] = useState('');
  const [searchTermTransactions, setSearchTermTransactions] = useState('');
  const [filtersInvoices, setFiltersInvoices] = useState({});
  const [filtersTransactions, setFiltersTransactions] = useState({});

  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const [currentPageClients, setCurrentPageClients] = useState(1);
  const [currentPageInvoices, setCurrentPageInvoices] = useState(1);
  const [currentPageTransactions, setCurrentPageTransactions] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isAdmin = user.role === 'admin';
  const isAccountant = user.role === 'accountant';
  
  const canManageClients = isAdmin;
  const canDeleteInvoices = isAdmin;
  const canDeleteTransactions = isAdmin;
  const canApproveInvoices = isAdmin || isAccountant;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const requests = [
        axios.get(`${API_URL}/reports/stats`),
        axios.get(`${API_URL}/clients`),
        axios.get(`${API_URL}/invoices`),
        axios.get(`${API_URL}/transactions`),
        axios.get(`${API_URL}/profiles/${user.id}`)
      ];
      
      if (isAdmin) {
        requests.push(axios.get(`${API_URL}/users`));
        requests.push(axios.get(`${API_URL}/invoices/logs/all`));
      }
      
      const responses = await Promise.all(requests);

      setStats(responses[0].data);
      setClients(responses[1].data);
      setInvoices(responses[2].data);
      setTransactions(responses[3].data);
      setUserProfile(responses[4].data);
      
      if (isAdmin && responses[5]) {
        setUsers(responses[5].data);
      }
      
      if (isAdmin && responses[6]) {
        setInvoiceLogs(responses[6].data);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type, data = {}) => {
    setModalType(type);
    setFormData(data);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalType === 'client') {
        if (formData.id) {
          await axios.put(`${API_URL}/clients/${formData.id}`, formData);
        } else {
          await axios.post(`${API_URL}/clients`, formData);
        }
      } else if (modalType === 'invoice') {
        if (formData.id) {
          await axios.put(`${API_URL}/invoices/${formData.id}`, {
            ...formData,
            user_id: user.id
          });
        } else {
          await axios.post(`${API_URL}/invoices`, formData);
        }
      } else if (modalType === 'transaction') {
        await axios.post(`${API_URL}/transactions`, formData);
      } else if (modalType === 'user') {
        if (formData.id) {
          await axios.put(`${API_URL}/users/${formData.id}`, formData);
        } else {
          await axios.post(`${API_URL}/users`, formData);
        }
      }
      
      closeModal();
      fetchData();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении данных');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm('Вы уверены?')) return;
    
    try {
      await axios.delete(`${API_URL}/${type}/${id}`);
      fetchData();
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
      await axios.delete(`${API_URL}/users/${userId}`);
      fetchData();
    } catch (error) {
      console.error('Ошибка удаления пользователя:', error);
      alert('Ошибка при удалении пользователя');
    }
  };

  const downloadFileWithToken = async (url, filename, errorMessage) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(url, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const fileURL = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileURL);
    } catch (error) {
      console.error(errorMessage, error);
      alert(errorMessage);
    }
  };

const downloadInvoicePdf = async (invoiceId) => {
    await downloadFileWithToken(
      `${API_URL}/invoices/${invoiceId}/pdf`,
      `invoice-${invoiceId}.pdf`,
      'Не удалось скачать PDF накладную.'
    );
  };
;


  const handleApproveInvoice = async (invoiceId, newStatus) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) {
        alert('Накладная не найдена');
        return;
      }
      
      const formatDate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };
      
      await axios.put(`${API_URL}/invoices/${invoiceId}`, {
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id,
        invoice_date: formatDate(invoice.invoice_date),
        delivery_date: formatDate(invoice.delivery_date),
        status: newStatus,
        notes: invoice.notes || '',
        user_id: user.id
      });
      
      fetchData();
      alert(`Накладная ${newStatus === 'in_transit' ? 'одобрена и отправлена' : newStatus === 'delivered' ? 'помечена как доставленная' : 'отклонена'}`);
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      alert('Ошибка при обновлении статуса: ' + (error.response?.data?.error || error.message));
    }
  };

  const viewInvoiceDetails = async (invoiceId) => {
    try {
      const response = await axios.get(`${API_URL}/invoices/${invoiceId}`);
      setSelectedInvoiceDetails(response.data);
      setShowInvoiceDetails(true);
    } catch (error) {
      console.error('Ошибка загрузки деталей накладной:', error);
      alert('Ошибка при загрузке деталей');
    }
  };

  const handleNotificationClick = (invoiceId) => {
    setActiveTab('invoices');
    viewInvoiceDetails(invoiceId);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
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

  const getPaymentMethodText = (method) => {
    const methods = {
      cash: 'Наличные',
      card: 'Карта',
      bank_transfer: 'Банковский перевод',
      other: 'Другое'
    };
    return methods[method] || method;
  };

  
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const searchLower = searchTermClients.toLowerCase();
      return (
        client.company_name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.phone?.includes(searchTermClients) ||
        client.inn?.includes(searchTermClients) ||
        client.address?.toLowerCase().includes(searchLower)
      );
    });
  }, [clients, searchTermClients]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const searchLower = searchTermInvoices.toLowerCase();
      const matchesSearch = 
        invoice.invoice_number?.toLowerCase().includes(searchLower) ||
        invoice.client_name?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (filtersInvoices.status && invoice.status !== filtersInvoices.status) return false;
      
      if (filtersInvoices.dateFrom) {
        const invoiceDate = new Date(invoice.invoice_date);
        const filterDate = new Date(filtersInvoices.dateFrom);
        if (invoiceDate < filterDate) return false;
      }

      if (filtersInvoices.dateTo) {
        const invoiceDate = new Date(invoice.invoice_date);
        const filterDate = new Date(filtersInvoices.dateTo);
        if (invoiceDate > filterDate) return false;
      }

      if (filtersInvoices.minAmount && invoice.total_amount < Number(filtersInvoices.minAmount)) return false;
      if (filtersInvoices.maxAmount && invoice.total_amount > Number(filtersInvoices.maxAmount)) return false;

      return true;
    });
  }, [invoices, searchTermInvoices, filtersInvoices]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const searchLower = searchTermTransactions.toLowerCase();
      const matchesSearch = 
        transaction.description?.toLowerCase().includes(searchLower) ||
        transaction.payment_method?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      if (filtersTransactions.transactionType && transaction.transaction_type !== filtersTransactions.transactionType) return false;
      
      if (filtersTransactions.dateFrom) {
        const transDate = new Date(transaction.transaction_date);
        const filterDate = new Date(filtersTransactions.dateFrom);
        if (transDate < filterDate) return false;
      }

      if (filtersTransactions.dateTo) {
        const transDate = new Date(transaction.transaction_date);
        const filterDate = new Date(filtersTransactions.dateTo);
        if (transDate > filterDate) return false;
      }

      if (filtersTransactions.minAmount && transaction.amount < Number(filtersTransactions.minAmount)) return false;
      if (filtersTransactions.maxAmount && transaction.amount > Number(filtersTransactions.maxAmount)) return false;

      return true;
    });
  }, [transactions, searchTermTransactions, filtersTransactions]);

  
  const sortData = (data, column, direction) => {
    if (!column) return data;

    return [...data].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      if (column.includes('date')) {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }


      if (typeof aVal === 'number' || typeof bVal === 'number') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }


      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  
  const paginateData = (data, currentPage, perPage) => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return data.slice(startIndex, endIndex);
  };

  const defaultTabs = [
    { id: 'dashboard', label: '📊 Дашборд', visible: true },
    { id: 'users', label: '👤 Пользователи', visible: isAdmin },
    { id: 'logs', label: '📋 Логи накладных', visible: isAdmin },
    { id: 'clients', label: '👥 Клиенты', visible: true },
    { id: 'invoices', label: '📋 Накладные', visible: true },
    { id: 'transactions', label: '💰 Транзакции', visible: true },
    { id: 'reports', label: '📈 Отчеты', visible: true },
    { id: 'profile', label: '👤 Мой профиль', visible: true }
  ];

  const tabs = tabOrder 
    ? tabOrder.filter(tab => {
        const defaultTab = defaultTabs.find(dt => dt.id === tab.id);
        return defaultTab && defaultTab.visible;
      })
    : defaultTabs.filter(tab => tab.visible);

  const handleDragStart = (e, tabId) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTabId) => {
    e.preventDefault();
    
    if (!draggedTab || draggedTab === targetTabId) return;

    const currentTabs = tabOrder || defaultTabs.filter(tab => tab.visible);
    const draggedIndex = currentTabs.findIndex(tab => tab.id === draggedTab);
    const targetIndex = currentTabs.findIndex(tab => tab.id === targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newTabs = [...currentTabs];
    const [removed] = newTabs.splice(draggedIndex, 1);
    newTabs.splice(targetIndex, 0, removed);

    setTabOrder(newTabs);
    localStorage.setItem(`tabOrder_${user.id}`, JSON.stringify(newTabs));
    setDraggedTab(null);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
  };

  const sortedClients = sortData(filteredClients, sortColumn, sortDirection);
  const sortedInvoices = sortData(filteredInvoices, sortColumn, sortDirection);
  const sortedTransactions = sortData(filteredTransactions, sortColumn, sortDirection);

  const paginatedClients = paginateData(sortedClients, currentPageClients, itemsPerPage);
  const paginatedInvoices = paginateData(sortedInvoices, currentPageInvoices, itemsPerPage);
  const paginatedTransactions = paginateData(sortedTransactions, currentPageTransactions, itemsPerPage);

  const handleSort = (column, direction) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleFilterChange = (filterType, filterName, value) => {
    if (filterType === 'invoices') {
      setFiltersInvoices(prev => ({ ...prev, [filterName]: value }));
      setCurrentPageInvoices(1);
    } else if (filterType === 'transactions') {
      setFiltersTransactions(prev => ({ ...prev, [filterName]: value }));
      setCurrentPageTransactions(1);
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="admin-layout">
      <ColorBends
        colors={["#667eea", "#764ba2", "#f093fb", "#4facfe"]}
        rotation={45}
        speed={0.2}
        scale={1.5}
        frequency={1.2}
        warpStrength={1.0}
        mouseInfluence={0.5}
        parallax={0.3}
        noise={0.05}
        transparent
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      />
      

      <div className="admin-sidebar">
        <div className="sidebar-header">
          <div className="user-avatar">
            {userProfile?.avatar ? (
              <img src={`${ASSET_BASE_URL}${userProfile.avatar}`} alt="Avatar" />
            ) : (
              <div className="sidebar-avatar-placeholder">
                {user.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-name">{user.username}</div>
          <div className={`user-role-text role-badge role-${user.role}`}>
            {user.role === 'admin' ? 'Администратор' : user.role === 'accountant' ? 'Бухгалтер' : 'Клиент'}
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={handleDragEnd}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button onClick={onLogout} className="sidebar-logout">
          Выйти
        </button>
      </div>


      <div className="admin-main">
        <div className="admin-header">
          <div className="header-search">
            <input type="text" placeholder="Поиск..." />
          </div>
          <div className="header-right">
            <NotificationBell user={user} onNotificationClick={handleNotificationClick} />
          </div>
        </div>

        <div className="admin-content">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="section-title">Общая статистика</h2>
            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Всего клиентов</h3>
                  <div className="value">{clients.length}</div>
                  <div className="label">Активных клиентов</div>
                </div>
                <div className="stat-card">
                  <h3>Накладные</h3>
                  <div className="value">{stats.invoices?.total_invoices || 0}</div>
                  <div className="label">
                    Доставлено: {stats.invoices?.delivered || 0} | В пути: {stats.invoices?.in_transit || 0}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>Доходы</h3>
                  <div className="value" style={{color: '#28a745'}}>{formatCurrency(stats.income)}</div>
                  <div className="label">Общий доход</div>
                </div>
                <div className="stat-card">
                  <h3>Расходы</h3>
                  <div className="value" style={{color: '#dc3545'}}>{formatCurrency(stats.expense)}</div>
                  <div className="label">Общие расходы</div>
                </div>
                <div className="stat-card" style={{borderLeftColor: stats.profit >= 0 ? '#28a745' : '#dc3545'}}>
                  <h3>Прибыль</h3>
                  <div className="value" style={{color: stats.profit >= 0 ? '#28a745' : '#dc3545'}}>
                    {formatCurrency(stats.profit)}
                  </div>
                  <div className="label">Чистая прибыль</div>
                </div>
                <div className="stat-card">
                  <h3>Транзакции</h3>
                  <div className="value">{transactions.length}</div>
                  <div className="label">Всего операций</div>
                </div>
              </div>
            )}

            <h2 className="section-title" style={{marginTop: '40px'}}>Последние накладные</h2>
            <div className="table-wrapper table-wrapper--dashboard">
              <table className="glass-table glass-table--compact">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Клиент</th>
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 5).map(invoice => (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number}</td>
                      <td>{invoice.client_name}</td>
                      <td>{formatDate(invoice.invoice_date)}</td>
                      <td>{formatCurrency(invoice.total_amount)}</td>
                      <td>
                        <span className={`status-badge status-${invoice.status}`}>
                          {getStatusText(invoice.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div>
            <div className="section-header">
              <h2 className="section-title">Управление клиентами</h2>
              {canManageClients && (
                <button onClick={() => openModal('client')} className="btn-primary">
                  + Добавить клиента
                </button>
              )}
            </div>

            <SearchFilter
              searchTerm={searchTermClients}
              onSearchChange={(value) => {
                setSearchTermClients(value);
                setCurrentPageClients(1);
              }}
              placeholder="Поиск по имени, email, телефону, ИНН..."
            />

            <SortableTable
              columns={[
                { key: 'id', label: 'ID', sortable: true, width: '80px' },
                { key: 'company_name', label: 'Название', sortable: true },
                { key: 'email', label: 'Email', sortable: true },
                { key: 'phone', label: 'Телефон', sortable: false },
                { key: 'inn', label: 'ИНН', sortable: true },
                { 
                  key: 'actions', 
                  label: 'Действия', 
                  sortable: false,
                  render: (client) => (
                    <div className="action-buttons">
                      {canManageClients && (
                        <>
                          <button onClick={() => openModal('client', client)} className="btn-info">
                            ✏️ Изменить
                          </button>
                          <button onClick={() => handleDelete('clients', client.id)} className="btn-danger">
                            🗑️ Удалить
                          </button>
                        </>
                      )}
                      {!canManageClients && (
                        <span style={{color: '#999', fontSize: '12px'}}>Только просмотр</span>
                      )}
                    </div>
                  )
                }
              ]}
              data={paginatedClients}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />

            <Pagination
              currentPage={currentPageClients}
              totalPages={Math.ceil(sortedClients.length / itemsPerPage)}
              totalItems={sortedClients.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPageClients}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPageClients(1);
              }}
            />
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="section-header">
              <h2 className="section-title">Управление накладными</h2>
              <div style={{display: 'flex', gap: '10px'}}>
                <button 
                  onClick={() => downloadFileWithToken(`${API_URL}/invoices/export/excel`, 'invoices.xlsx', 'Не удалось скачать Excel с накладными.')} 
                  className="btn-success"
                  title="Экспортировать все накладные в Excel"
                >
                  📊 Экспорт Excel
                </button>
                <button onClick={() => openModal('invoice')} className="btn-primary">
                  + Создать накладную
                </button>
              </div>
            </div>

            <SearchFilter
              searchTerm={searchTermInvoices}
              onSearchChange={(value) => {
                setSearchTermInvoices(value);
                setCurrentPageInvoices(1);
              }}
              filters={filtersInvoices}
              onFilterChange={(name, value) => handleFilterChange('invoices', name, value)}
              filterOptions={{
                status: true,
                dateFrom: true,
                dateTo: true,
                minAmount: true,
                maxAmount: true
              }}
              placeholder="Поиск по номеру накладной или клиенту..."
            />

            <SortableTable
              columns={[
                { key: 'invoice_number', label: '№ Накладной', sortable: true },
                { key: 'client_name', label: 'Клиент', sortable: true },
                { key: 'invoice_date', label: 'Дата', sortable: true, render: (invoice) => formatDate(invoice.invoice_date) },
                { key: 'delivery_date', label: 'Доставка', sortable: true, render: (invoice) => formatDate(invoice.delivery_date) },
                { key: 'total_amount', label: 'Сумма', sortable: true, render: (invoice) => formatCurrency(invoice.total_amount) },
                { 
                  key: 'status', 
                  label: 'Статус', 
                  sortable: true,
                  render: (invoice) => (
                    <span className={`status-badge status-${invoice.status}`}>
                      {getStatusText(invoice.status)}
                    </span>
                  )
                },
                { 
                  key: 'actions', 
                  label: 'Действия', 
                  sortable: false,
                  render: (invoice) => (
                    <div className="action-buttons">
                      <button 
                        onClick={() => viewInvoiceDetails(invoice.id)}
                        className="btn-info"
                        title="Просмотр деталей"
                      >
                        Просмотр
                      </button>
                      <button 
                        onClick={() => downloadInvoicePdf(invoice.id)}
                        className="btn-info"
                        title="Скачать PDF"
                      >
                        PDF
                      </button>
                      {invoice.status === 'pending' && canApproveInvoices && (
                        <>
                          <button 
                            onClick={() => handleApproveInvoice(invoice.id, 'in_transit')} 
                            className="btn-success"
                            title="Одобрить и отправить"
                          >
                            Одобрить
                          </button>
                          <button 
                            onClick={() => handleApproveInvoice(invoice.id, 'cancelled')} 
                            className="btn-danger"
                            title="Отклонить"
                          >
                            Отклонить
                          </button>
                        </>
                      )}
                      {invoice.status !== 'pending' && (
                        <button onClick={() => openModal('invoice', invoice)} className="btn-info">
                          Изменить
                        </button>
                      )}
                      {canDeleteInvoices && (
                        <button onClick={() => handleDelete('invoices', invoice.id)} className="btn-danger">
                          Удалить
                        </button>
                      )}
                    </div>
                  )
                }
              ]}
              data={paginatedInvoices}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />

            <Pagination
              currentPage={currentPageInvoices}
              totalPages={Math.ceil(sortedInvoices.length / itemsPerPage)}
              totalItems={sortedInvoices.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPageInvoices}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPageInvoices(1);
              }}
            />
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <div className="section-header">
              <h2 className="section-title">Финансовые транзакции</h2>
              <button onClick={() => openModal('transaction')} className="btn-primary">
                + Добавить транзакцию
              </button>
            </div>

            <SearchFilter
              searchTerm={searchTermTransactions}
              onSearchChange={(value) => {
                setSearchTermTransactions(value);
                setCurrentPageTransactions(1);
              }}
              filters={filtersTransactions}
              onFilterChange={(name, value) => handleFilterChange('transactions', name, value)}
              filterOptions={{
                transactionType: true,
                dateFrom: true,
                dateTo: true,
                minAmount: true,
                maxAmount: true
              }}
              placeholder="Поиск по описанию или методу оплаты..."
            />

            <SortableTable
              columns={[
                { key: 'id', label: 'ID', sortable: true, width: '80px' },
                { 
                  key: 'transaction_type', 
                  label: 'Тип', 
                  sortable: true,
                  render: (transaction) => (
                    <span style={{
                      color: transaction.transaction_type === 'income' ? '#28a745' : '#dc3545',
                      fontWeight: 'bold'
                    }}>
                      {transaction.transaction_type === 'income' ? '📈 Доход' : '📉 Расход'}
                    </span>
                  )
                },
                { 
                  key: 'amount', 
                  label: 'Сумма', 
                  sortable: true,
                  render: (transaction) => (
                    <span style={{
                      color: transaction.transaction_type === 'income' ? '#28a745' : '#dc3545',
                      fontWeight: 'bold'
                    }}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  )
                },
                { key: 'transaction_date', label: 'Дата', sortable: true, render: (transaction) => formatDate(transaction.transaction_date) },
                { key: 'payment_method', label: 'Метод оплаты', sortable: true, render: (transaction) => getPaymentMethodText(transaction.payment_method) },
                { key: 'description', label: 'Описание', sortable: false, render: (transaction) => transaction.description || '-' },
                { 
                  key: 'actions', 
                  label: 'Действия', 
                  sortable: false,
                  render: (transaction) => (
                    <>
                      {canDeleteTransactions && (
                        <button onClick={() => handleDelete('transactions', transaction.id)} className="btn-danger">
                          Удалить
                        </button>
                      )}
                      {!canDeleteTransactions && (
                        <span style={{color: '#999', fontSize: '12px'}}>-</span>
                      )}
                    </>
                  )
                }
              ]}
              data={paginatedTransactions}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
            />

            <Pagination
              currentPage={currentPageTransactions}
              totalPages={Math.ceil(sortedTransactions.length / itemsPerPage)}
              totalItems={sortedTransactions.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPageTransactions}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPageTransactions(1);
              }}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <div className="section-header">
              <h2 className="section-title">Финансовые отчеты</h2>
            </div>

            <div className="card" style={{marginBottom: '20px'}}>
              <h3 style={{marginBottom: '15px'}}>📊 Экспорт данных</h3>
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button 
                  onClick={() => {
                    const params = new URLSearchParams();
                    
                    downloadFileWithToken(`${API_URL}/reports/export/excel?${params}`, 'report.xlsx', 'Не удалось скачать Excel отчёт.');
                  }} 
                  className="btn-success"
                  title="Экспортировать финансовый отчет в Excel"
                >
                  📊 Экспорт полного отчета (Excel)
                </button>
                <button 
                  onClick={() => downloadFileWithToken(`${API_URL}/invoices/export/excel`, 'invoices.xlsx', 'Не удалось скачать Excel с накладными.')} 
                  className="btn-info"
                  title="Экспортировать все накладные в Excel"
                >
                  📋 Экспорт накладных (Excel)
                </button>
              </div>
            </div>

            <div className="card" style={{marginBottom: '20px'}}>
              <h3 style={{marginBottom: '15px'}}>💼 Текущая статистика</h3>
              {stats && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Общий доход</h3>
                    <div className="value" style={{color: '#28a745'}}>{formatCurrency(stats.income)}</div>
                  </div>
                  <div className="stat-card">
                    <h3>Общие расходы</h3>
                    <div className="value" style={{color: '#dc3545'}}>{formatCurrency(stats.expense)}</div>
                  </div>
                  <div className="stat-card">
                    <h3>Чистая прибыль</h3>
                    <div className="value" style={{color: stats.profit >= 0 ? '#28a745' : '#dc3545'}}>
                      {formatCurrency(stats.profit)}
                    </div>
                  </div>
                  <div className="stat-card">
                    <h3>Всего накладных</h3>
                    <div className="value">{stats.invoices?.total_invoices || 0}</div>
                    <div className="label">
                      ✅ {stats.invoices?.delivered || 0} | 
                      🚚 {stats.invoices?.in_transit || 0} | 
                      ⏳ {stats.invoices?.pending || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="table-wrapper table-wrapper--dashboard">
              <h3 className="table-wrapper__title">📈 Последние транзакции</h3>
              <table className="glass-table glass-table--compact">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Сумма</th>
                    <th>Дата</th>
                    <th>Метод оплаты</th>
                    <th>Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map(transaction => (
                    <tr key={transaction.id}>
                      <td style={{
                        color: transaction.transaction_type === 'income' ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {transaction.transaction_type === 'income' ? '📈 Доход' : '📉 Расход'}
                      </td>
                      <td style={{
                        color: transaction.transaction_type === 'income' ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                      }}>
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td>{formatDate(transaction.transaction_date)}</td>
                      <td>{getPaymentMethodText(transaction.payment_method)}</td>
                      <td>{transaction.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && isAdmin && (
          <div className="users-container">
            <div className="section-header">
              <h2 className="section-title">Управление пользователями</h2>
              <button onClick={() => openModal('user')} className="btn-primary">
                Добавить пользователя
              </button>
            </div>

            <div className="users-grid">
              {users.map(u => (
                <div key={u.id} className="user-card">
                  <div className="user-card-header">
                    <div className="user-avatar-wrapper">
                      {u.avatar ? (
                        <img 
                          src={`${ASSET_BASE_URL}${u.avatar}`} 
                          alt={u.full_name || u.username}
                          className="user-card-avatar"
                        />
                      ) : (
                        <div className="user-card-avatar-placeholder">
                          {(u.full_name || u.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-card-info">
                      <h3>{u.full_name || u.username}</h3>
                      <span className={`role-badge role-${u.role}`}>
                        {u.role === 'admin' ? 'Администратор' :
                         u.role === 'accountant' ? 'Бухгалтер' :
                         'Клиент'}
                      </span>
                      <p className="username-small">@{u.username}</p>
                    </div>
                  </div>

                  <div className="user-card-details">
                    <div className="detail-row">
                      <span className="detail-icon">📧</span>
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{u.email || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-icon">📱</span>
                      <span className="detail-label">Телефон:</span>
                      <span className="detail-value">{u.phone || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-icon">{u.is_verified ? '✅' : '❌'}</span>
                      <span className="detail-label">Статус:</span>
                      <span className="detail-value">{u.is_verified ? 'Проверен' : 'Не проверен'}</span>
                    </div>
                  </div>

                  <div className="user-card-actions">
                    <button
                      onClick={() => openModal('user', u)}
                      className="btn-edit"
                    >
                      Редактировать
                    </button>
                    {u.id !== user.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="btn-delete"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && isAdmin && (
          <div className="logs-container">
            <div className="section-header">
              <h2 className="section-title">Логи действий с накладными</h2>
            </div>

            <div className="logs-list">
              {invoiceLogs.map(log => (
                <div key={log.id} className="log-card">
                  <div className="log-card-header">
                    <div className="log-main-info">
                      <div className="log-invoice-number">
                        Накладная #{log.invoice_id}
                      </div>
                      <div className="log-timestamp">
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                    <div className="log-action-badge">
                      {log.action === 'created' ? 'Создание' :
                       log.action === 'updated' ? 'Обновление' :
                       log.action === 'deleted' ? 'Удаление' :
                       log.action === 'status_changed' ? 'Изменение статуса' :
                       log.action}
                    </div>
                  </div>

                  <div className="log-card-body">
                    <div className="log-user-info">
                      {log.avatar ? (
                        <img 
                          src={`${ASSET_BASE_URL}${log.avatar}`} 
                          alt={log.full_name || log.username}
                          className="log-user-avatar"
                        />
                      ) : (
                        <div className="log-avatar-placeholder">
                          {(log.full_name || log.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="log-user-details">
                        <div className="log-user-name">{log.full_name || log.username}</div>
                        <span className={`role-badge role-${log.user_role}`}>
                          {log.user_role === 'admin' ? 'Администратор' :
                           log.user_role === 'accountant' ? 'Бухгалтер' :
                           'Клиент'}
                        </span>
                      </div>
                    </div>

                    <div className="log-status-change">
                      {log.old_status && (
                        <div className="status-item">
                          <span className="status-label">Старый статус:</span>
                          <span className={`status-badge status-${log.old_status}`}>
                            {log.old_status === 'pending' ? 'Ожидает' :
                             log.old_status === 'in_transit' ? 'В пути' :
                             log.old_status === 'delivered' ? 'Доставлено' :
                             log.old_status === 'cancelled' ? 'Отменено' :
                             log.old_status}
                          </span>
                        </div>
                      )}
                      
                      {log.new_status && (
                        <div className="status-item">
                          <span className="status-label">Новый статус:</span>
                          <span className={`status-badge status-${log.new_status}`}>
                            {log.new_status === 'pending' ? 'Ожидает' :
                             log.new_status === 'in_transit' ? 'В пути' :
                             log.new_status === 'delivered' ? 'Доставлено' :
                             log.new_status === 'cancelled' ? 'Отменено' :
                             log.new_status}
                          </span>
                        </div>
                      )}
                    </div>

                    {log.description && (
                      <div className="log-description">
                        {log.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="profile-page">
            <h2 className="section-title">Мой профиль</h2>

            <div className="profile-card">
              <div className="profile-header">
                <div className="avatar-section">
                  {userProfile?.avatar ? (
                    <img 
                      src={`${ASSET_BASE_URL}${userProfile.avatar}`} 
                      alt={userProfile.full_name || user.username}
                      className="avatar"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {(userProfile?.full_name || user.username).charAt(0).toUpperCase()}
                    </div>
                  )}

                  <input 
                    type="file" 
                    id="avatar-upload" 
                    accept="image/*"
                    style={{display: 'none'}}
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const formData = new FormData();
                        formData.append('avatar', file);
                        try {
                          await axios.post(`${API_URL}/profiles/${user.id}/avatar`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                          });
                          fetchData();
                        } catch (error) {
                          alert('Ошибка загрузки аватара');
                        }
                      }
                    }}
                  />
                  <button 
                    onClick={() => document.getElementById('avatar-upload').click()}
                    className="avatar-upload-btn"
                  >
                    Загрузить фото
                  </button>
                </div>

                <div className="profile-info">
                  <h2>{userProfile?.full_name || user.username}</h2>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role === 'admin' ? 'Администратор' :
                     user.role === 'accountant' ? 'Бухгалтер' :
                     'Клиент'}
                  </span>
                  <p className="username">@{user.username}</p>
                </div>
              </div>

              <div className="profile-body">
                <div className="profile-section">
                  <h3>Контактная информация</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="label">Email</span>
                      <span className="value">{userProfile?.email || user.email || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Телефон</span>
                      <span className="value">{userProfile?.phone || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Компания</span>
                      <span className="value">{userProfile?.company_name || user.company_name || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Дата регистрации</span>
                      <span className="value">{formatDate(userProfile?.created_at || user.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>
              {modalType === 'client' && (formData.id ? 'Редактировать клиента' : 'Новый клиент')}
              {modalType === 'invoice' && (formData.id ? 'Редактировать накладную' : 'Новая накладная')}
              {modalType === 'transaction' && 'Новая транзакция'}
              {modalType === 'user' && (formData.id ? 'Редактировать пользователя' : 'Новый пользователь')}
            </h2>

            <form onSubmit={handleSubmit}>
              {modalType === 'client' && (
                <>
                  <label>Название *</label>
                  <input
                    type="text"
                    value={formData.company_name || ''}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    required
                  />

                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />

                  <label>Телефон</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />

                  <label>Адрес</label>
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows="3"
                  />

                  <label>ИНН</label>
                  <input
                    type="text"
                    value={formData.inn || ''}
                    onChange={(e) => setFormData({...formData, inn: e.target.value})}
                  />
                </>
              )}

              {modalType === 'invoice' && (
                <>
                  <label>Номер накладной *</label>
                  <input
                    type="text"
                    value={formData.invoice_number || ''}
                    onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                    required
                  />

                  <label>Клиент *</label>
                  <select
                    value={formData.client_id || ''}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    required
                  >
                    <option value="">Выберите клиента</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.company_name}</option>
                    ))}
                  </select>

                  <label>Дата накладной *</label>
                  <input
                    type="date"
                    value={formData.invoice_date || ''}
                    onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                    required
                  />

                  <label>Дата доставки</label>
                  <input
                    type="date"
                    value={formData.delivery_date || ''}
                    onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                  />

                  <label>Статус *</label>
                  <select
                    value={formData.status || 'pending'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    required
                  >
                    <option value="pending">Ожидает</option>
                    <option value="in_transit">В пути</option>
                    <option value="delivered">Доставлено</option>
                    <option value="cancelled">Отменено</option>
                  </select>

                  <label>Примечания</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="3"
                  />
                </>
              )}

              {modalType === 'transaction' && (
                <>
                  <label>Тип транзакции *</label>
                  <select
                    value={formData.transaction_type || 'income'}
                    onChange={(e) => setFormData({...formData, transaction_type: e.target.value})}
                    required
                  >
                    <option value="income">Доход</option>
                    <option value="expense">Расход</option>
                  </select>

                  <label>Сумма *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />

                  <label>Дата *</label>
                  <input
                    type="date"
                    value={formData.transaction_date || ''}
                    onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                    required
                  />

                  <label>Метод оплаты *</label>
                  <select
                    value={formData.payment_method || 'cash'}
                    onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                    required
                  >
                    <option value="cash">Наличные</option>
                    <option value="card">Карта</option>
                    <option value="bank_transfer">Банковский перевод</option>
                    <option value="other">Другое</option>
                  </select>

                  <label>Описание</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                  />
                </>
              )}

              {modalType === 'user' && (
                <>
                  <label>Логин *</label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                    disabled={formData.id ? true : false}
                  />

                  {!formData.id && (
                    <>
                      <label>Пароль *</label>
                      <input
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                      />
                    </>
                  )}

                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />

                  <label>Полное имя *</label>
                  <input
                    type="text"
                    value={formData.full_name || ''}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    required
                  />

                  <label>Телефон</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />

                  <label>Роль *</label>
                  <select
                    value={formData.role || 'client'}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required
                  >
                    <option value="admin">Администратор</option>
                    <option value="accountant">Бухгалтер</option>
                    <option value="client">Клиент</option>
                  </select>

                  {formData.role === 'client' && (
                    <>
                      <label>Привязка к клиенту</label>
                      <select
                        value={formData.client_id || ''}
                        onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                      >
                        <option value="">Не привязан</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.company_name}</option>
                        ))}
                      </select>
                    </>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Отмена
                </button>
                <button type="submit" className="btn-success">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInvoiceDetails && selectedInvoiceDetails && (
        <div className="modal-overlay" onClick={() => setShowInvoiceDetails(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInvoiceDetails(false)}>×</button>
            
            <div className="invoice-details">
              <div className="invoice-header">
                <h2>Накладная № {selectedInvoiceDetails.invoice_number}</h2>
                <span className={`status-badge status-${selectedInvoiceDetails.status}`}>
                  {getStatusText(selectedInvoiceDetails.status)}
                </span>
              </div>

              <div className="invoice-info-grid">
                <div className="info-item">
                  <div className="info-label">Клиент</div>
                  <div className="info-value">{selectedInvoiceDetails.client_name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Email</div>
                  <div className="info-value">{selectedInvoiceDetails.email || '-'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Телефон</div>
                  <div className="info-value">{selectedInvoiceDetails.phone || '-'}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Дата накладной</div>
                  <div className="info-value">{formatDate(selectedInvoiceDetails.invoice_date)}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Дата доставки</div>
                  <div className="info-value">{formatDate(selectedInvoiceDetails.delivery_date)}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Общая сумма</div>
                  <div className="info-value">{formatCurrency(selectedInvoiceDetails.total_amount)}</div>
                </div>
              </div>

              {selectedInvoiceDetails.notes && (
                <div className="notes-section">
                  <div className="info-label">Примечания</div>
                  <div className="info-value">{selectedInvoiceDetails.notes}</div>
                </div>
              )}

              <h3 className="section-title">Товары</h3>
              <div className="table-wrapper">
                <table className="glass-table glass-table--compact">
                  <thead>
                    <tr>
                      <th>Наименование</th>
                      <th>Количество</th>
                      <th>Цена за единицу</th>
                      <th>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceDetails.items && selectedInvoiceDetails.items.map(item => (
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

              <h3 className="section-title comments-title">💬 Комментарии</h3>
              <AdminComments invoiceId={selectedInvoiceDetails.id} user={user} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

