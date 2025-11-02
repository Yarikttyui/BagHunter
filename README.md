Логистическая Система Учета
Полнофункциональная система учета для логистических компаний с административной панелью, клиентским порталом и REST API.

Шаг 2: Установка зависимостей
Backend:

cd backend
npm install
node recreate-db.js
node server.js
![тут свой пороль](image.png)
![вот](image-1.png)
Административная панель:

cd admin-panel
npm install
npm start  
Клиентский портал:

cd client-portal
npm install
npm install react-scripts@5.0.1
npm start