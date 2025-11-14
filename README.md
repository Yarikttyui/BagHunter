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
```
3. Создайте файл `.env` в папке backend:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=logistics_accounting
JWT_SECRET=your_jwt_secret
```

4. Установите зависимости для фронтенд приложений:
```bash
cd admin-panel
npm install

cd client-portal
npm install

cd landing-site
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


<img width="1280" height="451" alt="Вход в личный кабинет клиента" src="https://github.com/user-attachments/assets/58aa0b59-3917-442a-b8eb-7fd428821039" />
<img width="1280" height="450" alt="Вход в админ панель" src="https://github.com/user-attachments/assets/052b43a3-b118-46e7-9b5a-ae2c0148a595" />
<img width="1280" height="453" alt="Админ панель" src="https://github.com/user-attachments/assets/e22c5dda-eb93-4e19-97c0-f3101a5b8cbd" />
<img width="1280" height="449" alt="Клиентская панель" src="https://github.com/user-attachments/assets/666df3e9-ef19-4152-99b0-0970c14a7c2a" />
<img width="1002" height="1142" alt="Накладная" src="https://github.com/user-attachments/assets/4eb761bc-f9bf-4c30-9d27-a3bf1fd66210" />
<img width="1280" height="452" alt="Лендинг" src="https://github.com/user-attachments/assets/7659bb4e-d74d-4f50-8ebf-683daa528715" />

