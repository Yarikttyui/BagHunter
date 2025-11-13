import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import './Analytics.css';
import { API_BASE_URL } from '../config/api';
import {
  FiBarChart2,
  FiDollarSign,
  FiCalendar,
  FiActivity,
  FiClipboard,
  FiCreditCard,
  FiTrendingUp,
  FiAward
} from 'react-icons/fi';

const API_URL = API_BASE_URL;

const COLORS = {
  income: '#28a745',
  expense: '#dc3545',
  profit: '#667eea',
  pending: '#ffc107',
  in_transit: '#17a2b8',
  delivered: '#28a745',
  cancelled: '#6c757d'
};

const PIE_COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a'];

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [incomeExpenseData, setIncomeExpenseData] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [invoiceStatusStats, setInvoiceStatusStats] = useState([]);
  const [invoicesTrend, setInvoicesTrend] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [quarterlyStats, setQuarterlyStats] = useState([]);
  const [timeRange, setTimeRange] = useState('12');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [
        incomeExpenseRes,
        topClientsRes,
        statusStatsRes,
        trendRes,
        forecastRes,
        paymentsRes,
        quarterlyRes
      ] = await Promise.all([
        axios.get(`${API_URL}/analytics/income-expense-chart?months=${timeRange}`),
        axios.get(`${API_URL}/analytics/top-clients?limit=10`),
        axios.get(`${API_URL}/analytics/invoice-status-stats`),
        axios.get(`${API_URL}/analytics/invoices-trend?months=${timeRange}`),
        axios.get(`${API_URL}/analytics/revenue-forecast`),
        axios.get(`${API_URL}/analytics/payment-methods`),
        axios.get(`${API_URL}/analytics/quarterly-stats`)
      ]);

      setIncomeExpenseData(incomeExpenseRes.data);
      setTopClients(topClientsRes.data);
      setInvoiceStatusStats(statusStatsRes.data);
      setInvoicesTrend(trendRes.data);
      setForecast(forecastRes.data);
      setPaymentMethods(paymentsRes.data);
      setQuarterlyStats(quarterlyRes.data);
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return format(date, 'LLL yyyy', { locale: ru });
  };

  const renderRankCell = (index) => {
    if (index < 3) {
      return (
        <span className={`rank-icon rank-${index}`} aria-hidden="true">
          <FiAward />
        </span>
      );
    }
    return index + 1;
  };

  const getStatusName = (status) => {
    const names = {
      pending: 'Ожидает',
      in_transit: 'В пути',
      delivered: 'Доставлено',
      cancelled: 'Отменено'
    };
    return names[status] || status;
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Загрузка аналитики...</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1><FiBarChart2 className="inline-icon" aria-hidden="true" />Расширенная аналитика</h1>
        <div className="time-range-selector">
          <button 
            className={timeRange === '3' ? 'active' : ''} 
            onClick={() => setTimeRange('3')}
          >
            3 месяца
          </button>
          <button 
            className={timeRange === '6' ? 'active' : ''} 
            onClick={() => setTimeRange('6')}
          >
            6 месяцев
          </button>
          <button 
            className={timeRange === '12' ? 'active' : ''} 
            onClick={() => setTimeRange('12')}
          >
            12 месяцев
          </button>
          <button 
            className={timeRange === '24' ? 'active' : ''} 
            onClick={() => setTimeRange('24')}
          >
            2 года
          </button>
        </div>
      </div>

      <div className="chart-card">
        <h2><FiDollarSign className="inline-icon" aria-hidden="true" />Динамика доходов и расходов</h2>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={incomeExpenseData}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.income} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.income} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.expense} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.expense} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatMonth}
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              formatter={(value) => formatCurrency(value)}
              labelFormatter={formatMonth}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="income" 
              stroke={COLORS.income} 
              fillOpacity={1} 
              fill="url(#colorIncome)" 
              name="Доходы"
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              stroke={COLORS.expense} 
              fillOpacity={1} 
              fill="url(#colorExpense)" 
              name="Расходы"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h2><FiCalendar className="inline-icon" aria-hidden="true" />Квартальная статистика</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={quarterlyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter" style={{ fontSize: '12px' }} />
            <YAxis 
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              style={{ fontSize: '12px' }}
            />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="income" fill={COLORS.income} name="Доходы" />
            <Bar dataKey="expense" fill={COLORS.expense} name="Расходы" />
            <Bar dataKey="profit" fill={COLORS.profit} name="Прибыль" />
          </BarChart>
        </ResponsiveContainer>
      </div>


      {forecast && forecast.forecast && forecast.forecast.length > 0 && (
        <div className="chart-card forecast-card">
          <h2><FiActivity className="inline-icon" aria-hidden="true" />Прогноз доходов</h2>
          <div className="forecast-info">
            <div className="forecast-stat">
              <span className="label">Средний доход:</span>
              <span className="value">{formatCurrency(forecast.avg_income)}</span>
            </div>
            <div className="forecast-stat">
              <span className="label">Темп роста:</span>
              <span className="value" style={{
                color: forecast.growth_rate > 0 ? COLORS.income : COLORS.expense
              }}>
                {forecast.growth_rate > 0 ? '+' : ''}{forecast.growth_rate}%
              </span>
            </div>
          </div>
          <div className="forecast-predictions">
            {forecast.forecast.map((item, index) => (
              <div key={index} className="forecast-item">
                <div className="forecast-month">{item.month}</div>
                <div className="forecast-amount">{formatCurrency(item.forecast_income)}</div>
                <div className="forecast-confidence">
                  <div className="confidence-bar">
                    <div 
                      className="confidence-fill" 
                      style={{width: `${item.confidence}%`}}
                    ></div>
                  </div>
                  <span>{item.confidence}% уверенность</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="charts-row">
        <div className="chart-card half">
          <h2><FiClipboard className="inline-icon" aria-hidden="true" />Распределение по статусам</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={invoiceStatusStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${getStatusName(name)} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="status"
              >
                {invoiceStatusStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.status] || PIE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} накладных`} />
            </PieChart>
          </ResponsiveContainer>
        </div>


        <div className="chart-card half">
          <h2><FiCreditCard className="inline-icon" aria-hidden="true" />Методы оплаты</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ payment_method, percent }) => `${payment_method} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_amount"
                nameKey="payment_method"
              >
                {paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <h2><FiTrendingUp className="inline-icon" aria-hidden="true" />Динамика накладных по месяцам</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={invoicesTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              tickFormatter={formatMonth}
              style={{ fontSize: '12px' }}
            />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip labelFormatter={formatMonth} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="total_invoices" 
              stroke="#667eea" 
              strokeWidth={2}
              name="Всего накладных"
            />
            <Line 
              type="monotone" 
              dataKey="delivered" 
              stroke={COLORS.delivered} 
              strokeWidth={2}
              name="Доставлено"
            />
            <Line 
              type="monotone" 
              dataKey="in_transit" 
              stroke={COLORS.in_transit} 
              strokeWidth={2}
              name="В пути"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <h2><FiAward className="inline-icon" aria-hidden="true" />ТОП-10 клиентов по выручке</h2>
        <div className="top-clients-table">
          <table className="glass-table glass-table--compact">
            <thead>
              <tr>
                <th>#</th>
                <th>Клиент</th>
                <th>Накладных</th>
                <th>Общая выручка</th>
                <th>Средний чек</th>
                <th>Последняя накладная</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((client, index) => (
                <tr key={client.id}>
                  <td className="rank">{renderRankCell(index)}</td>
                  <td className="client-name">
                    <div>{client.name}</div>
                    <div className="client-email">{client.email}</div>
                  </td>
                  <td>{client.invoice_count}</td>
                  <td className="revenue">{formatCurrency(client.total_revenue)}</td>
                  <td>{formatCurrency(client.avg_invoice)}</td>
                  <td>{new Date(client.last_invoice_date).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
