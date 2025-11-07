import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(
      base64.length + (4 - (base64.length % 4 || 4)) % 4,
      '='
    );

    const decodeBase64 = () => {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        return window.atob(normalized);
      }
      if (typeof atob === 'function') {
        return atob(normalized);
      }
      if (typeof Buffer === 'function') {
        return Buffer.from(normalized, 'base64').toString('binary');
      }
      return '';
    };

    const decoded = decodeBase64();

    return decoded ? JSON.parse(decoded) : null;
  } catch (error) {
    console.error('Failed to decode token', error);
    return null;
  }
}

function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
}

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = useCallback(() => {
    setUser(null);
    delete axios.defaults.headers.common.Authorization;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }, [setUser]);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, [setUser]);

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    const storedUser = localStorage.getItem('admin_user');

    if (storedToken && storedUser) {
      if (isTokenExpired(storedToken)) {
        handleLogout();
        return;
      }

      axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === 'admin' || parsedUser.role === 'accountant') {
          setUser(parsedUser);
        } else {
          handleLogout();
        }
      } catch (err) {
        console.error('Failed to read user data from localStorage', err);
        handleLogout();
      }
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [handleLogout]);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, [handleLogout]);

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
