# BagHunter

Система бухгалтерского учета для логистической компании.

## Описание

BagHunter - это полнофункциональная платформа для управления логистическими операциями, включающая учет накладных, клиентов, товаров и финансовых транзакций. Система состоит из трех основных компонентов: административной панели, клиентской панели и приветственного сайта.

## Структура проекта

- `backend/` - Node.js API сервер (Express, MySQL)
- `admin-panel/` - Административная панель
- `client-portal/` - Клиентская панель
- `landing-site/` - Посадочная страница

## Основные возможности

- Управление накладными и транзакциями
- Учет клиентов и товаров
- Генерация отчетов в PDF и Excel
- Аналитика и статистика
- Система комментариев и уведомлений
- Real-time обновления через WebSocket
- Управление профилями пользователей
- Поиск и фильтрация данных

## Технологический стек

### Backend
- Node.js + Express
- MySQL
- JWT аутентификация
- Socket.IO для real-time коммуникации
- PDFKit и ExcelJS для генерации отчетов

### Frontend
- React 18
- Axios для HTTP запросов
- Three.js для 3D визуализации
- Recharts для графиков и аналитики
- Socket.IO Client для real-time обновлений

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/Yarikttyui/BagHunter.git
cd BagHunter
```

2. Установите зависимости для backend:
```bash
cd backend
npm install
4. Создайте файл `.env` в папке backend:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=logistics_accounting
JWT_SECRET=your_jwt_secret
```

5. Установите зависимости для фронтенд приложений:
```bash
cd /admin-panel
npm install

cd /client-portal
npm install

cd /landing-site
npm install
```

## Запуск

Backend:
```bash
cd backend
npm run dev
```

Admin Panel:
```bash
cd admin-panel
npm start
```

Client Portal:
```bash
cd client-portal
npm start
```

Landing Site:
```bash
cd landing-site
npm start
```

## API Endpoints

- `/api/auth` - Аутентификация и регистрация
- `/api/clients` - Управление клиентами
- `/api/invoices` - Управление накладными
- `/api/products` - Управление товарами
- `/api/transactions` - Финансовые транзакции
- `/api/reports` - Генерация отчетов
- `/api/analytics` - Аналитика и статистика
- `/api/notifications` - Уведомления
- `/api/comments` - Комментарии
