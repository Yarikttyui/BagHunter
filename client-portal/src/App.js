import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');

  useEffect(() => {
    const storedToken = localStorage.getItem('client_token');
    const storedUser = localStorage.getItem('client_user');

    if (storedToken && storedUser) {
      axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Не удалось прочитать данные пользователя из localStorage', error);
        localStorage.removeItem('client_token');
        localStorage.removeItem('client_user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    delete axios.defaults.headers.common.Authorization;
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_user');
  };

  return (
    <div className="App">
      {!user ? (
        <>
          {view === 'login' && (
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => setView('register')}
            />
          )}
          {view === 'register' && (
            <Register
              onSwitchToLogin={() => setView('login')}
            />
          )}
        </>
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
