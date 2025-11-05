CREATE DATABASE IF NOT EXISTS logistics_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE logistics_accounting;

CREATE TABLE IF NOT EXISTS clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  address TEXT,
  inn VARCHAR(50),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  recovery_code VARCHAR(20) UNIQUE,
  is_verified BOOLEAN DEFAULT TRUE,
  avatar VARCHAR(255),
  role ENUM('admin', 'accountant', 'client') DEFAULT 'client',
  client_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  client_id INT NOT NULL,
  invoice_date DATE NOT NULL,
  delivery_date DATE,
  status ENUM('pending', 'in_transit', 'delivered', 'cancelled') DEFAULT 'pending',
  total_amount DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_client (client_id),
  INDEX idx_status (status),
  INDEX idx_date (invoice_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) DEFAULT 'шт',
  price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  stock_quantity DECIMAL(10, 2) DEFAULT 0,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_category (category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT,
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_invoice (invoice_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT,
  transaction_type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  payment_method ENUM('cash', 'card', 'bank_transfer', 'other') DEFAULT 'cash',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  INDEX idx_type (transaction_type),
  INDEX idx_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  user_id INT NOT NULL,
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_invoice (invoice_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  invoice_id INT DEFAULT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  avatar VARCHAR(255),
  company_name VARCHAR(255),
  company_inn VARCHAR(50),
  company_address TEXT,
  telegram VARCHAR(100),
  whatsapp VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  user_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_invoice (invoice_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO clients (company_name, contact_person, email, phone, address, inn, status) VALUES
('ООО "Логистик Про"', 'Иванов Иван Иванович', 'info@logisticpro.ru', '+7-495-123-4567', 'Москва, ул. Тверская, д. 10', '7701234567', 'active'),
('АО "Транспорт Сервис"', 'Петров Пётр Петрович', 'contact@transserv.ru', '+7-812-987-6543', 'Санкт-Петербург, пр. Невский, д. 25', '7802345678', 'active'),
('ИП Сидоров С.С.', 'Сидоров Сергей Сергеевич', 'sidorov@mail.ru', '+7-916-555-1234', 'Московская обл., г. Химки', '77YarikTop1290', 'active'),
('ООО "Глобал Логистикс"', 'Кузнецов Андрей Петрович', 'info@globallog.ru', '+7-495-777-8899', 'Москва, ул. Арбат, д. 20', '7703456789', 'active'),
('ЗАО "СтройМаркет"', 'Волков Дмитрий Александрович', 'dm.volkov@stroymarket.ru', '+7-495-234-5678', 'Москва, ул. Ленина, д. 45', '7704567890', 'active'),
('ООО "ТехноТорг"', 'Морозова Елена Викторовна', 'info@technotorg.ru', '+7-812-345-6789', 'Санкт-Петербург, ул. Садовая, д. 12', '7805678901', 'active'),
('ИП Козлов А.В.', 'Козлов Алексей Владимирович', 'kozlov.av@yandex.ru', '+7-926-777-8888', 'Москва, пр. Мира, д. 88', '772345678901', 'active'),
('ООО "МегаПоставка"', 'Новикова Ольга Сергеевна', 'sales@megapostavka.com', '+7-495-888-9999', 'Москва, Кутузовский пр., д. 30', '7706789012', 'active'),
('АО "ПромИмпорт"', 'Соколов Михаил Петрович', 'contact@promimport.ru', '+7-812-456-7890', 'Санкт-Петербург, наб. Фонтанки, д. 60', '7807890123', 'inactive'),
('ООО "Альфа Трейд"', 'Лебедева Анна Ивановна', 'info@alphatrade.ru', '+7-495-999-0000', 'Москва, ул. Большая Дмитровка, д. 7', '7708901234', 'active');

INSERT INTO users (username, password, email, full_name, phone, company_name, recovery_code, is_verified, role, client_id) VALUES
('admin', 'TEMP_HASH_ADMIN', 'admin@logistics.com', 'Администратор Системы', '+7-999-000-0001', 'Логистическая система', 'ADMIN-REC-2025', TRUE, 'admin', NULL),
('accountant1', 'TEMP_HASH_ACCOUNTANT1', 'accountant1@logistics.com', 'Смирнов Игорь Владимирович', '+7-999-000-0002', 'Логистическая система', 'ACCT1-REC-2025', TRUE, 'accountant', NULL),
('accountant2', 'TEMP_HASH_ACCOUNTANT2', 'accountant2@logistics.com', 'Сидорова Анна Сергеевна', '+7-999-000-0003', 'Логистическая система', 'ACCT2-REC-2025', TRUE, 'accountant', NULL),
('client1', 'TEMP_HASH_CLIENT', 'client1@logistics.com', 'Иванов Иван Иванович', '+7-999-000-0004', 'ООО "Логистик Про"', 'CLI1-REC-2025', TRUE, 'client', 1),
('client2', 'TEMP_HASH_CLIENT', 'client2@logistics.com', 'Петров Пётр Петрович', '+7-999-000-0005', 'АО "Транспорт Сервис"', 'CLI2-REC-2025', TRUE, 'client', 2),
('client3', 'TEMP_HASH_CLIENT', 'client3@logistics.com', 'Сидоров Сергей Сергеевич', '+7-999-000-0006', 'ИП Сидоров С.С.', 'CLI3-REC-2025', TRUE, 'client', 3),
('client4', 'TEMP_HASH_CLIENT', 'client4@logistics.com', 'Кузнецов Андрей Петрович', '+7-999-000-0007', 'ООО "Глобал Логистикс"', 'CLI4-REC-2025', TRUE, 'client', 4),
('client5', 'TEMP_HASH_CLIENT', 'client5@logistics.com', 'Волков Дмитрий Александрович', '+7-999-000-0008', 'ЗАО "СтройМаркет"', 'CLI5-REC-2025', TRUE, 'client', 5),
('client6', 'TEMP_HASH_CLIENT', 'client6@logistics.com', 'Морозова Елена Викторовна', '+7-999-000-0009', 'ООО "ТехноТорг"', 'CLI6-REC-2025', TRUE, 'client', 6),
('client7', 'TEMP_HASH_CLIENT', 'client7@logistics.com', 'Козлов Алексей Владимирович', '+7-999-000-0010', 'ИП Козлов А.В.', 'CLI7-REC-2025', TRUE, 'client', 7);

INSERT INTO products (name, description, unit, price, stock_quantity, category, is_active) VALUES
('Паллета EUR', 'Европоддон стандартный 1200x800 мм', 'шт', 450.00, 1000, 'Паллеты', TRUE),
('Паллета FIN', 'Финский поддон 1200x1000 мм', 'шт', 520.00, 800, 'Паллеты', TRUE),
('Коробка картонная 60x40x40', 'Гофрокороб трёхслойный', 'шт', 85.00, 5000, 'Упаковка', TRUE),
('Стрейч-пленка 50 см', 'Пленка для упаковки паллет', 'рул', 380.00, 200, 'Упаковка', TRUE),
('Скотч упаковочный', 'Широкий скотч 50 мм x 66 м', 'шт', 45.00, 1500, 'Упаковка', TRUE);

INSERT INTO invoices (invoice_number, client_id, invoice_date, delivery_date, status, total_amount, notes) VALUES
('INV-170584168125', 1, '2024-10-29', '2024-11-05', 'pending', 50000.00, 'Новая накладная требует проверки'),
('INV-170585816894', 2, '2024-10-15', '2024-10-20', 'in_transit', 125000.00, 'В процессе доставки'),
('INV-170583485936', 3, '2024-10-25', '2024-10-30', 'delivered', 10500.00, 'Доставлено успешно'),
('INV-170584736251', 1, '2024-10-20', '2024-10-25', 'delivered', 75000.00, NULL),
('INV-170586234789', 4, '2024-10-28', '2024-11-02', 'in_transit', 245000.00, 'Крупный заказ строительных материалов'),
('INV-170587456123', 5, '2024-10-26', '2024-11-01', 'pending', 189500.00, 'Требуется подтверждение клиента'),
('INV-170588765432', 6, '2024-10-22', '2024-10-27', 'delivered', 67800.00, 'Товар получен, акт подписан'),
('INV-170589123654', 7, '2024-10-24', '2024-10-29', 'delivered', 32100.00, 'Доставлено в срок'),
('INV-170590234567', 2, '2024-10-18', '2024-10-23', 'delivered', 156000.00, 'Повторный заказ'),
('INV-170591345678', 8, '2024-10-30', '2024-11-04', 'pending', 412000.00, 'Новый клиент, первый заказ'),
('INV-170592456789', 3, '2024-10-21', '2024-10-26', 'delivered', 23400.00, NULL),
('INV-170593567890', 1, '2024-10-27', '2024-11-01', 'in_transit', 98700.00, 'Ожидается доставка'),
('INV-170594678901', 4, '2024-10-19', '2024-10-24', 'delivered', 134500.00, 'Успешно доставлено'),
('INV-170595789012', 6, '2024-10-31', '2024-11-05', 'pending', 276300.00, 'Ожидает обработки'),
('INV-170596890123', 5, '2024-10-16', '2024-10-21', 'cancelled', 87000.00, 'Отменено по просьбе клиента');

INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price) VALUES
(1, NULL, 'Цемент М500', 100, 500.00),
(2, NULL, 'Станок токарный', 1, 125000.00),
(3, NULL, 'Дрель электрическая', 3, 3500.00),
(4, NULL, 'Кирпич красный', 3000, 25.00),
(5, NULL, 'Арматура 12 мм', 500, 350.00),
(5, NULL, 'Бетон М300', 15, 6500.00),
(5, NULL, 'Щебень фракция 5–20', 20, 1200.00),
(6, NULL, 'Краска фасадная', 50, 850.00),
(6, NULL, 'Утеплитель базальтовый', 100, 1250.00),
(6, NULL, 'Профлист оцинкованный', 80, 650.00),
(7, NULL, 'Электрокабель ВВГ 3×2.5', 200, 85.00),
(7, NULL, 'Розетка Schneider', 100, 120.00),
(7, NULL, 'Выключатель ABB', 80, 150.00),
(7, NULL, 'Светильник LED', 50, 480.00);

INSERT INTO transactions (invoice_id, transaction_type, amount, transaction_date, payment_method, description) VALUES
(1, 'income', 50000.00, '2024-11-06', 'bank_transfer', 'Оплата накладной INV-170584168125'),
(2, 'expense', 18000.00, '2024-10-14', 'bank_transfer', 'Топливо и сборы за доставку INV-170585816894'),
(2, 'income', 60000.00, '2024-10-16', 'bank_transfer', 'Аванс по накладной INV-170585816894'),
(2, 'income', 65000.00, '2024-10-21', 'bank_transfer', 'Окончательная оплата по накладной INV-170585816894'),
(3, 'expense', 15000.00, '2024-10-26', 'cash', 'Упаковочные материалы по накладной INV-170583485936'),
(4, 'income', 75000.00, '2024-10-26', 'bank_transfer', 'Оплата накладной INV-170584736251'),
(6, 'income', 120000.00, '2024-11-02', 'bank_transfer', 'Частичная оплата накладной INV-170587456123'),
(7, 'income', 32100.00, '2024-10-30', 'cash', 'Оплата накладной INV-170589123654'),
(8, 'income', 220000.00, '2024-11-05', 'card', 'Оплата накладной INV-170591345678');

INSERT INTO comments (invoice_id, user_id, comment_text, is_internal) VALUES
(1, 2, 'Доставка завершена, документы загружены.', TRUE),
(1, 4, 'Спасибо, груз получен.', FALSE),
(2, 2, 'Автомобиль выехал со склада в 08:00.', TRUE),
(2, 5, 'Отправьте, пожалуйста, ссылку для отслеживания.', FALSE),
(3, 3, 'Ожидаем подтверждение оплаты от клиента.', TRUE),
(4, 2, 'Экспресс-курьер назначен на маршрут D15.', TRUE),
(4, 7, 'Оплату проведём сегодня.', FALSE);

-- INSERT INTO notifications (user_id, title, message, type, invoice_id, is_read) VALUES
/*(4, 'РќРѕРІР°СЏ РЅР°РєР»Р°РґРЅР°СЏ', 'РЎРѕР·РґР°РЅР° РЅР°РєР»Р°РґРЅР°СЏ INV-170584168125 РЅР° СЃСѓРјРјСѓ 50000.00в‚Ѕ', 'invoice_created', 1, TRUE),
(5, 'РўРѕРІР°СЂ РІ РїСѓС‚Рё', 'РќР°РєР»Р°РґРЅР°СЏ INV-170585816894 РѕС‚РїСЂР°РІР»РµРЅР° РЅР° РґРѕСЃС‚Р°РІРєСѓ', 'invoice_shipped', 2, FALSE),
(6, 'Р”РѕСЃС‚Р°РІРєР° Р·Р°РІРµСЂС€РµРЅР°', 'РќР°РєР»Р°РґРЅР°СЏ INV-170583485936 СѓСЃРїРµС€РЅРѕ РґРѕСЃС‚Р°РІР»РµРЅР°', 'invoice_delivered', 3, TRUE),
(4, 'Р”РѕСЃС‚Р°РІРєР° Р·Р°РІРµСЂС€РµРЅР°', 'РќР°РєР»Р°РґРЅР°СЏ INV-170584736251 СѓСЃРїРµС€РЅРѕ РґРѕСЃС‚Р°РІР»РµРЅР°', 'invoice_delivered', 4, TRUE),
(7, 'РќРѕРІР°СЏ РЅР°РєР»Р°РґРЅР°СЏ', 'РЎРѕР·РґР°РЅР° РЅР°РєР»Р°РґРЅР°СЏ INV-170586234789 РЅР° СЃСѓРјРјСѓ 245000.00в‚Ѕ', 'invoice_created', 5, FALSE),
(8, 'РўСЂРµР±СѓРµС‚СЃСЏ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ', 'РќР°РєР»Р°РґРЅР°СЏ INV-170587456123 РѕР¶РёРґР°РµС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ', 'invoice_pending', 6, FALSE),
(9, 'Р”РѕСЃС‚Р°РІРєР° Р·Р°РІРµСЂС€РµРЅР°', 'РќР°РєР»Р°РґРЅР°СЏ INV-170588765432 СѓСЃРїРµС€РЅРѕ РґРѕСЃС‚Р°РІР»РµРЅР°', 'invoice_delivered', 7, TRUE),
(10, 'Р”РѕСЃС‚Р°РІРєР° Р·Р°РІРµСЂС€РµРЅР°', 'РќР°РєР»Р°РґРЅР°СЏ INV-170589123654 СѓСЃРїРµС€РЅРѕ РґРѕСЃС‚Р°РІР»РµРЅР°', 'invoice_delivered', 8, TRUE),
(5, 'Р”РѕСЃС‚Р°РІРєР° Р·Р°РІРµСЂС€РµРЅР°', 'РќР°РєР»Р°РґРЅР°СЏ INV-170590234567 СѓСЃРїРµС€РЅРѕ РґРѕСЃС‚Р°РІР»РµРЅР°', 'invoice_delivered', 9, TRUE),
(4, 'РўРѕРІР°СЂ РІ РїСѓС‚Рё', 'РќР°РєР»Р°РґРЅР°СЏ INV-170593567890 РѕС‚РїСЂР°РІР»РµРЅР° РЅР° РґРѕСЃС‚Р°РІРєСѓ', 'invoice_shipped', 12, FALSE),
(1, 'РЎРёСЃС‚РµРјРЅРѕРµ СѓРІРµРґРѕРјР»РµРЅРёРµ', 'РџР»Р°РЅРѕРІРѕРµ РѕР±СЃР»СѓР¶РёРІР°РЅРёРµ СЃРёСЃС‚РµРјС‹ 5 РЅРѕСЏР±СЂСЏ', 'system', NULL, FALSE),
(2, 'РќРѕРІС‹Р№ РїР»Р°С‚РµР¶', 'РџРѕР»СѓС‡РµРЅР° РѕРїР»Р°С‚Р° РїРѕ РЅР°РєР»Р°РґРЅРѕР№ INV-170583485936', 'payment_received', 3, TRUE),
(2, 'РќРѕРІС‹Р№ РїР»Р°С‚РµР¶', 'РџРѕР»СѓС‡РµРЅР° РѕРїР»Р°С‚Р° РїРѕ РЅР°РєР»Р°РґРЅРѕР№ INV-170594678901', 'payment_received', 13, TRUE),
(3, 'РќР°РїРѕРјРёРЅР°РЅРёРµ', 'РўСЂРµР±СѓРµС‚СЃСЏ РѕР±РЅРѕРІРёС‚СЊ РєРѕРЅС‚Р°РєС‚РЅС‹Рµ РґР°РЅРЅС‹Рµ', 'reminder', NULL, FALSE),
(7, 'РќРѕРІС‹Р№ РєРѕРјРјРµРЅС‚Р°СЂРёР№', 'Р”РѕР±Р°РІР»РµРЅ РєРѕРјРјРµРЅС‚Р°СЂРёР№ Рє РЅР°РєР»Р°РґРЅРѕР№ INV-170586234789', 'comment', 5, FALSE),
(9, 'РђРєС‚ РїРѕРґРїРёСЃР°РЅ', 'РђРєС‚ РїСЂРёРµРјРєРё РїРѕ РЅР°РєР»Р°РґРЅРѕР№ INV-170588765432 РїРѕРґРїРёСЃР°РЅ', 'document_signed', 7, TRUE);*/

-- INSERT INTO invoice_logs (invoice_id, user_id, action, old_status, new_status, description) VALUES
/*(1, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(2, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(2, 2, 'status_changed', 'pending', 'in_transit', 'РўРѕРІР°СЂ РѕС‚РіСЂСѓР¶РµРЅ СЃРѕ СЃРєР»Р°РґР°'),
(3, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(3, 2, 'status_changed', 'pending', 'in_transit', 'РўРѕРІР°СЂ РІ РїСѓС‚Рё'),
(3, 2, 'status_changed', 'in_transit', 'delivered', 'РўРѕРІР°СЂ РґРѕСЃС‚Р°РІР»РµРЅ РєР»РёРµРЅС‚Сѓ'),
(4, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(4, 2, 'status_changed', 'pending', 'in_transit', 'РћС‚РїСЂР°РІР»РµРЅРѕ РЅР° РґРѕСЃС‚Р°РІРєСѓ'),
(4, 2, 'status_changed', 'in_transit', 'delivered', 'Р”РѕСЃС‚Р°РІР»РµРЅРѕ СѓСЃРїРµС€РЅРѕ'),
(5, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(5, 2, 'status_changed', 'pending', 'in_transit', 'РўРѕРІР°СЂ РѕС‚РїСЂР°РІР»РµРЅ'),
(6, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(7, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(7, 2, 'status_changed', 'pending', 'in_transit', 'РўРѕРІР°СЂ РІ РїСѓС‚Рё'),
(7, 2, 'status_changed', 'in_transit', 'delivered', 'Р”РѕСЃС‚Р°РІР»РµРЅРѕ, Р°РєС‚ РїРѕРґРїРёСЃР°РЅ'),
(8, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(8, 2, 'status_changed', 'pending', 'in_transit', 'РћС‚РїСЂР°РІР»РµРЅРѕ'),
(8, 2, 'status_changed', 'in_transit', 'delivered', 'РџРѕР»СѓС‡РµРЅРѕ РєР»РёРµРЅС‚РѕРј'),
(9, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(9, 2, 'status_changed', 'pending', 'in_transit', 'Р’ РґРѕСЃС‚Р°РІРєРµ'),
(9, 2, 'status_changed', 'in_transit', 'delivered', 'РЈСЃРїРµС€РЅРѕ РґРѕСЃС‚Р°РІР»РµРЅРѕ'),
(10, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР° (РЅРѕРІС‹Р№ РєР»РёРµРЅС‚)'),
(11, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(11, 2, 'status_changed', 'pending', 'in_transit', 'РћС‚РіСЂСѓР¶РµРЅРѕ'),
(11, 2, 'status_changed', 'in_transit', 'delivered', 'Р”РѕСЃС‚Р°РІР»РµРЅРѕ'),
(12, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(12, 2, 'status_changed', 'pending', 'in_transit', 'РћС‚РїСЂР°РІР»РµРЅРѕ РЅР° РґРѕСЃС‚Р°РІРєСѓ'),
(13, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(13, 2, 'status_changed', 'pending', 'in_transit', 'Р’ РїСѓС‚Рё'),
(13, 2, 'status_changed', 'in_transit', 'delivered', 'Р”РѕСЃС‚Р°РІР»РµРЅРѕ'),
(14, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(15, 1, 'created', NULL, 'pending', 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°'),
(15, 3, 'status_changed', 'pending', 'cancelled', 'РћС‚РјРµРЅРµРЅРѕ РїРѕ РїСЂРѕСЃСЊР±Рµ РєР»РёРµРЅС‚Р°');

*/
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'logistics_accounting';
