import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Не удалось считать данные пользователя из localStorage', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    delete axios.defaults.headers.common.Authorization;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <div className="App">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <AdminDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
