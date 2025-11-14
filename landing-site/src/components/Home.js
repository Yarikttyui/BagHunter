import React, { useState, useEffect } from "react";

import "./Home.css";

import { CLIENT_PORTAL_URL } from "../config/api";

import {
  FiLayers,
  FiTool,
  FiFeather,
  FiDroplet,
  FiBox,
  FiPackage,
  FiHome,
  FiShield,
  FiArchive,
} from "react-icons/fi";

const CATEGORY_ROTATION_DELAY = 3500;

const cargoCategories = [
  {
    title: "Строительные материалы",

    items: [
      "Сухие смеси и цемент",
      "Отделочные материалы",
      "Крепёж и профили",
      "Гидроизоляция",
    ],

    icon: FiLayers,

    color: "#FF6B6B",
  },

  {
    title: "Промышленное оборудование",

    items: [
      "Генераторы и компрессоры",
      "Строительная техника",
      "Складские системы",
      "IoT-датчики",
    ],

    icon: FiTool,

    color: "#4ECDC4",
  },

  {
    title: "Текстиль и интерьер",

    items: [
      "Ткани и обивка",
      "Мягкая мебель",
      "Фурнитура",
      "Готовые комплекты",
    ],

    icon: FiFeather,

    color: "#95E1D3",
  },

  {
    title: "Химия и краски",

    items: [
      "Отвердители и лаки",
      "Краски для фасада",
      "Растворители",
      "LED-продукция",
    ],

    icon: FiDroplet,

    color: "#F38181",
  },

  {
    title: "Металлоконструкции",

    items: ["Арматура", "Перекрытия", "Сварные элементы", "Модульные блоки"],

    icon: FiBox,

    color: "#AA96DA",
  },

      {
    title: "Безопасность и контроль",

    items: [
      "Системы контроля доступа",
      "Сейфы и хранилища",
      "Видеонаблюдение",
      "IoT-мониторинг",
    ],

    icon: FiShield,

    color: "#A8D8EA",
  },

  ];

const stats = [
  { value: "500+", label: "выполненных проектов" },

  { value: "10K+", label: "паллет в обороте" },

  { value: "24/7", label: "оперативная поддержка" },
];

const Home = () => {
  const [activeCategory, setActiveCategory] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setActiveCategory((prev) => (prev + 1) % cargoCategories.length),

      CATEGORY_ROTATION_DELAY,
    );

    return () => clearInterval(interval);
  }, []);

  const handleGetStarted = () => {
    window.location.href = CLIENT_PORTAL_URL;
  };

  return (
    <main className="home-container">
      <section className="hero-section">
        <div className="animated-background">
          <div className="shape shape1" />

          <div className="shape shape2" />

          <div className="shape shape3" />
        </div>

        <header className="header">
          <div className="logo">
            <img src="/logo.png" alt="BagHunter Logo" className="logo-img" />
          </div>
        </header>

        <div className="hero-content">
          <h1 className="main-title">
            <span className="title-line">Логистика нового уровня</span>

            <span className="title-line highlight">
              Под ключ для девелоперов и производства
            </span>
          </h1>

          <p className="subtitle">
            Берём на себя перевозку материалов, упаковку, кросс-докинг и
            контроль документов, чтобы ваши объекты сдавались вовремя.
          </p>

          <div className="stats">
            {stats.map((item) => (
              <div className="stat-item" key={item.label}>
                <div className="stat-number">{item.value}</div>

                <div className="stat-label">{item.label}</div>
              </div>
            ))}
          </div>

          <button
            className="cta-button"
            type="button"
            onClick={handleGetStarted}
          >
            <span>Перейти в клиентский портал</span>

            <span className="button-arrow">→</span>
          </button>
        </div>
      </section>

      <section className="products-section">
        <h2 className="section-title">
          <span className="title-decorator">*</span>
          Что мы перевозим и сопровождаем
          <span className="title-decorator">*</span>
        </h2>

        <div className="categories-grid">
          {cargoCategories.map((category, index) => {
            const Icon = category.icon;

            return (
              <div
                key={category.title}
                className={`category-card ${activeCategory === index ? "active" : ""}`}
                onMouseEnter={() => setActiveCategory(index)}
                style={{ "--accent-color": category.color }}
              >
                <div className="category-icon" aria-hidden="true">
                  <Icon />
                </div>

                <h3 className="category-title">{category.title}</h3>

                <ul className="category-items">
                  {category.items.map((item) => (
                    <li key={item} className="category-item">
                      <span className="item-bullet">•</span>

                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      
      
      <footer className="footer">
        <p>
          &copy; {new Date().getFullYear()} BagHunter Logistics. Все права
          защищены.
        </p>
      </footer>
    </main>
  );
};

export default Home;
