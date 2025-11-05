import React, { useState, useEffect } from 'react';
import './Home.css';
import { CLIENT_PORTAL_URL } from '../config/api';

const Home = () => {
  const [activeCategory, setActiveCategory] = useState(0);

  const categories = [
    {
      title: '🏗️ Строительные материалы',
      items: ['Цемент', 'Кирпич', 'Арматура', 'Бетон', 'Щебень'],
      icon: '🏗️',
      color: '#FF6B6B'
    },
    {
      title: '🔧 Оборудование',
      items: ['Станки токарные', 'Дрели', 'Инструменты', 'Сварочное оборудование'],
      icon: '🔧',
      color: '#4ECDC4'
    },
    {
      title: '🎨 Отделочные материалы',
      items: ['Краска', 'Утеплитель', 'Профлист', 'Гипсокартон', 'Керамогранит'],
      icon: '🎨',
      color: '#95E1D3'
    },
    {
      title: '⚡ Электротовары',
      items: ['Кабель', 'Розетки', 'Выключатели', 'Светильники LED'],
      icon: '⚡',
      color: '#F38181'
    },
    {
      title: '🚰 Сантехника',
      items: ['Трубы ПВХ', 'Смесители', 'Унитазы', 'Душевые кабины'],
      icon: '🚰',
      color: '#AA96DA'
    },
    {
      title: '🏭 Металлопрокат',
      items: ['Швеллер', 'Профильная труба', 'Листовая сталь', 'Арматура'],
      icon: '🏭',
      color: '#FCBAD3'
    },
    {
      title: '🌲 Пиломатериалы',
      items: ['Брус', 'Доска обрезная', 'Фанера', 'OSB плиты'],
      icon: '🌲',
      color: '#FFFFD2'
    },
    {
      title: '🪟 Окна и двери',
      items: ['Окна ПВХ', 'Двери входные', 'Двери межкомнатные'],
      icon: '🪟',
      color: '#A8D8EA'
    },
    {
      title: '🏠 Напольные покрытия',
      items: ['Линолеум', 'Ламинат', 'Плинтус', 'Паркет'],
      icon: '🏠',
      color: '#FFD93D'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCategory((prev) => (prev + 1) % categories.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [categories.length]);

  const handleGetStarted = () => {
    window.location.href = CLIENT_PORTAL_URL;
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="animated-background">
          <div className="shape shape1"></div>
          <div className="shape shape2"></div>
          <div className="shape shape3"></div>
        </div>
        
        <header className="header">
          <div className="logo">
            <img src="/logo.png" alt="BagHunter Logo" className="logo-img" />
          </div>
        </header>

        <div className="hero-content">
          <h1 className="main-title">
            <span className="title-line">Логистика</span>
            <span className="title-line highlight">Полного Цикла</span>
          </h1>
          <p className="subtitle">
            Мы перевозим всё, что нужно для вашего бизнеса
          </p>
          
          <div className="stats">
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Клиентов</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Доставок</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Поддержка</div>
            </div>
          </div>

          <button className="cta-button" onClick={handleGetStarted}>
            <span>Начать работу</span>
            <span className="button-arrow">→</span>
          </button>
        </div>
      </div>

      <section className="products-section">
        <h2 className="section-title">
          <span className="title-decorator">✦</span>
          Что мы перевозим
          <span className="title-decorator">✦</span>
        </h2>
        
        <div className="categories-grid">
          {categories.map((category, index) => (
            <div
              key={index}
              className={`category-card ${activeCategory === index ? 'active' : ''}`}
              onMouseEnter={() => setActiveCategory(index)}
              style={{ '--accent-color': category.color }}
            >
              <div className="category-icon">{category.icon}</div>
              <h3 className="category-title">{category.title}</h3>
              <ul className="category-items">
                {category.items.map((item, i) => (
                  <li key={i} className="category-item">
                    <span className="item-bullet">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚚</div>
            <h3>Быстрая доставка</h3>
            <p>Доставим груз точно в срок</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Надежная упаковка</h3>
            <p>Сохранность груза гарантирована</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Выгодные цены</h3>
            <p>Конкурентные тарифы на перевозки</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Отслеживание</h3>
            <p>Контроль груза в реальном времени</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; 2025 BAGXanter Logistics. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default Home;
