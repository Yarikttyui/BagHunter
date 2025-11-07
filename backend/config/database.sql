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
('АО "Транспорт Сервис"', 'Петров Петр Петрович', 'contact@transserv.ru', '+7-812-987-6543', 'Санкт-Петербург, пр. Невский, д. 25', '7802345678', 'active'),
('ИП Сидоров С.С.', 'Сидоров Сергей Сергеевич', 'sidorov@mail.ru', '+7-916-555-1234', 'Московская обл., г. Химки', '771234567890', 'active'),
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
('client2', 'TEMP_HASH_CLIENT', 'client2@logistics.com', 'Петров Петр Петрович', '+7-999-000-0005', 'АО "Транспорт Сервис"', 'CLI2-REC-2025', TRUE, 'client', 2),
('client3', 'TEMP_HASH_CLIENT', 'client3@logistics.com', 'Сидоров Сергей Сергеевич', '+7-999-000-0006', 'ИП Сидоров С.С.', 'CLI3-REC-2025', TRUE, 'client', 3),
('client4', 'TEMP_HASH_CLIENT', 'client4@logistics.com', 'Кузнецов Андрей Петрович', '+7-999-000-0007', 'ООО "Глобал Логистикс"', 'CLI4-REC-2025', TRUE, 'client', 4),
('client5', 'TEMP_HASH_CLIENT', 'client5@logistics.com', 'Волков Дмитрий Александрович', '+7-999-000-0008', 'ЗАО "СтройМаркет"', 'CLI5-REC-2025', TRUE, 'client', 5),
('client6', 'TEMP_HASH_CLIENT', 'client6@logistics.com', 'Морозова Елена Викторовна', '+7-999-000-0009', 'ООО "ТехноТорг"', 'CLI6-REC-2025', TRUE, 'client', 6),
('client7', 'TEMP_HASH_CLIENT', 'client7@logistics.com', 'Козлов Алексей Владимирович', '+7-999-000-0010', 'ИП Козлов А.В.', 'CLI7-REC-2025', TRUE, 'client', 7);

INSERT INTO products (name, description, unit, price, stock_quantity, category, is_active) VALUES
('Паллета EUR', 'Европоддон стандартный 1200x800 мм', 'шт', 450.00, 1000, 'Паллеты', TRUE),
('Паллета FIN', 'Финский поддон 1200x1000 мм', 'шт', 520.00, 800, 'Паллеты', TRUE),
('Коробка картонная 60x40x40', 'Гофрокороб трехслойный', 'шт', 85.00, 5000, 'Упаковка', TRUE),
('Стрейч-пленка 50см', 'Пленка для упаковки паллет', 'рул', 380.00, 200, 'Упаковка', TRUE),
('Скотч упаковочный', 'Широкий скотч 50мм x 66м', 'шт', 45.00, 1500, 'Упаковка', TRUE),
('Угловой профиль', 'Защита углов груза при транспортировке', 'шт', 25.00, 3000, 'Упаковка', TRUE),
('Груз стандартный', 'Товар общего назначения', 'кг', 50.00, 0, 'Товары', TRUE),
('Хрупкий груз', 'Товар требующий особой осторожности', 'кг', 75.00, 0, 'Товары', TRUE),
('Металлоизделия', 'Металлические детали и конструкции', 'кг', 65.00, 0, 'Товары', TRUE),
('Стройматериалы', 'Строительные материалы навалом', 'м³', 1200.00, 0, 'Товары', TRUE),
('Мебель офисная', 'Офисные столы, стулья, шкафы', 'шт', 3500.00, 0, 'Товары', TRUE),
('Бытовая техника', 'Холодильники, стиральные машины и т.д.', 'шт', 15000.00, 0, 'Товары', TRUE),
('Текстиль', 'Ткани, одежда, постельное белье', 'кг', 180.00, 0, 'Товары', TRUE),
('Продукты питания', 'Товары с ограниченным сроком годности', 'кг', 120.00, 0, 'Товары', TRUE),
('Химические товары', 'Бытовая химия, моющие средства', 'кг', 95.00, 0, 'Товары', TRUE),
('Автозапчасти', 'Запасные части для автомобилей', 'шт', 850.00, 0, 'Товары', TRUE),
('Электроника', 'Электронные устройства и комплектующие', 'шт', 5500.00, 0, 'Товары', TRUE),
('Спортивные товары', 'Спортинвентарь и оборудование', 'шт', 1200.00, 0, 'Товары', TRUE),
('Книги и канцелярия', 'Печатная продукция и офисные принадлежности', 'кг', 85.00, 0, 'Товары', TRUE),
('Игрушки', 'Детские игрушки и развивающие игры', 'шт', 450.00, 0, 'Товары', TRUE);

INSERT INTO user_profiles (user_id, full_name, phone, email, company_name, company_inn, telegram, whatsapp) VALUES
(1, 'Администратор Системы', '+7-999-000-0001', 'admin@logistics.com', 'Логистическая система', NULL, '@admin_log', '+79990000001'),
(2, 'Смирнов Игорь Владимирович', '+7-999-000-0002', 'accountant1@logistics.com', 'Логистическая система', NULL, '@i_smirnov', '+79990000002'),
(3, 'Сидорова Анна Сергеевна', '+7-999-000-0003', 'accountant2@logistics.com', 'Логистическая система', NULL, '@a_sidorova', '+79990000003'),
(4, 'Иванов Иван Иванович', '+7-999-000-0004', 'client1@logistics.com', 'ООО "Логистик Про"', '7701234567', '@ivanov_ii', '+79990000004'),
(5, 'Петров Петр Петрович', '+7-999-000-0005', 'client2@logistics.com', 'АО "Транспорт Сервис"', '7802345678', '@petrov_pp', '+79990000005'),
(6, 'Сидоров Сергей Сергеевич', '+7-999-000-0006', 'client3@logistics.com', 'ИП Сидоров С.С.', '771234567890', '@sidorov_ss', '+79990000006'),
(7, 'Кузнецов Андрей Петрович', '+7-999-000-0007', 'client4@logistics.com', 'ООО "Глобал Логистикс"', '7703456789', '@kuznetsov_ap', '+79990000007'),
(8, 'Волков Дмитрий Александрович', '+7-999-000-0008', 'client5@logistics.com', 'ЗАО "СтройМаркет"', '7704567890', '@volkov_da', '+79990000008'),
(9, 'Морозова Елена Викторовна', '+7-999-000-0009', 'client6@logistics.com', 'ООО "ТехноТорг"', '7805678901', '@morozova_ev', '+79990000009'),
(10, 'Козлов Алексей Владимирович', '+7-999-000-0010', 'client7@logistics.com', 'ИП Козлов А.В.', '772345678901', '@kozlov_av', '+79990000010');

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

INSERT INTO invoice_items (invoice_id, product_name, quantity, unit_price) VALUES
(1, 'Цемент М500', 100, 500.00),
(2, 'Станок токарный', 1, 125000.00),
(3, 'Дрель электрическая', 3, 3500.00),
(4, 'Кирпич красный', 3000, 25.00),
(5, 'Арматура 12мм', 500, 350.00),
(5, 'Бетон М300', 15, 6500.00),
(5, 'Щебень фракция 5-20', 20, 1200.00),
(6, 'Краска фасадная', 50, 850.00),
(6, 'Утеплитель базальтовый', 100, 1250.00),
(6, 'Профлист оцинкованный', 80, 650.00),
(7, 'Электрокабель ВВГ 3х2.5', 200, 85.00),
(7, 'Розетки Schneider', 100, 120.00),
(7, 'Выключатели ABB', 80, 150.00),
(7, 'Светильники LED', 50, 480.00),
(8, 'Труба ПВХ 110мм', 50, 320.00),
(8, 'Сантехника Grohe (смеситель)', 12, 1850.00),
(8, 'Унитаз подвесной', 5, 850.00),
(9, 'Металлопрокат швеллер', 25, 4800.00),
(9, 'Профильная труба 40х40', 150, 280.00),
(9, 'Лист стальной 3мм', 30, 1500.00),
(10, 'Деревянный брус 150х150', 200, 1250.00),
(10, 'Доска обрезная 50х150', 300, 450.00),
(10, 'Фанера ФК 18мм', 100, 980.00),
(10, 'OSB плита 12мм', 80, 620.00),
(11, 'Гипсокартон Knauf', 150, 280.00),
(11, 'Профиль для ГКЛ', 200, 65.00),
(12, 'Керамогранит 60х60', 80, 890.00),
(12, 'Плитка настенная', 120, 450.00),
(12, 'Затирка Mapei', 40, 320.00),
(13, 'Окна ПВХ 1400х1200', 15, 7800.00),
(13, 'Двери входные', 8, 4500.00),
(14, 'Линолеум Tarkett', 200, 650.00),
(14, 'Ламинат 33 класс', 150, 980.00),
(14, 'Плинтус напольный', 300, 85.00),
(15, 'Отменённый товар 1', 50, 1200.00),
(15, 'Отменённый товар 2', 30, 800.00);

INSERT INTO transactions (invoice_id, transaction_type, amount, transaction_date, payment_method, description) VALUES
(3, 'income', 10500.00, '2024-10-30', 'bank_transfer', 'Оплата накладной INV-170583485936'),
(4, 'income', 75000.00, '2024-10-25', 'bank_transfer', 'Оплата накладной INV-170584736251'),
(7, 'income', 67800.00, '2024-10-27', 'bank_transfer', 'Оплата накладной INV-170588765432'),
(8, 'income', 32100.00, '2024-10-29', 'cash', 'Оплата накладной INV-170589123654'),
(9, 'income', 156000.00, '2024-10-23', 'bank_transfer', 'Оплата накладной INV-170590234567'),
(11, 'income', 23400.00, '2024-10-26', 'card', 'Оплата накладной INV-170592456789'),
(13, 'income', 134500.00, '2024-10-24', 'bank_transfer', 'Оплата накладной INV-170594678901'),
(1, 'income', 25000.00, '2024-10-29', 'bank_transfer', 'Частичная предоплата 50%'),
(5, 'income', 122500.00, '2024-10-28', 'bank_transfer', 'Аванс 50%'),
(6, 'income', 94750.00, '2024-10-26', 'bank_transfer', 'Предоплата'),
(NULL, 'expense', 15000.00, '2024-10-10', 'cash', 'Зарплата сотрудникам'),
(NULL, 'expense', 8500.00, '2024-10-15', 'card', 'Офисные расходы'),
(NULL, 'expense', 25000.00, '2024-10-20', 'bank_transfer', 'Аренда склада'),
(NULL, 'expense', 12300.00, '2024-10-22', 'cash', 'Транспортные расходы'),
(NULL, 'expense', 5600.00, '2024-10-24', 'card', 'Канцтовары и расходники'),
(NULL, 'expense', 18000.00, '2024-10-26', 'bank_transfer', 'Коммунальные платежи'),
(NULL, 'expense', 7800.00, '2024-10-28', 'cash', 'Закупка упаковочных материалов'),
(NULL, 'expense', 32000.00, '2024-10-30', 'bank_transfer', 'Налоговые платежи');

INSERT INTO comments (invoice_id, user_id, comment_text, is_internal) VALUES
(1, 1, 'Накладная создана, ожидает подтверждения клиента', TRUE),
(1, 4, 'Подтверждаем заказ, когда ожидать доставку?', FALSE),
(1, 2, 'Доставка планируется 5 ноября', FALSE),
(2, 2, 'Оплата получена, готовим к отправке', FALSE),
(2, 5, 'Спасибо! Ожидаем товар', FALSE),
(3, 6, 'Товар получен в полном объеме, спасибо!', FALSE),
(4, 1, 'Доставка выполнена успешно', TRUE),
(5, 2, 'Требуется согласование сроков с клиентом', TRUE),
(5, 7, 'Согласны на доставку 2 ноября', FALSE),
(6, 3, 'Отгрузка выполнена, товар в пути', TRUE),
(7, 9, 'Все получено, качество отличное!', FALSE),
(8, 10, 'Доставка вовремя, претензий нет', FALSE),
(9, 5, 'Благодарим за оперативность!', FALSE),
(10, 1, 'Новый клиент, требуется особое внимание', TRUE),
(10, 2, 'Клиент связался, все детали уточнены', TRUE),
(11, 6, 'Повторный заказ, все понравилось', FALSE),
(12, 1, 'Доставка задерживается на 1 день из-за погоды', TRUE),
(12, 4, 'Понимаем, не проблема', FALSE),
(13, 7, 'Товар соответствует описанию', FALSE),
(14, 2, 'Ожидаем подтверждение от клиента', TRUE),
(15, 3, 'Клиент отказался от заказа', TRUE),
(15, 8, 'Извините, изменились планы', FALSE);

INSERT INTO notifications (user_id, title, message, type, invoice_id, is_read) VALUES
(4, 'Новая накладная', 'Создана накладная INV-170584168125 на сумму 50000.00₽', 'invoice_created', 1, TRUE),
(5, 'Товар в пути', 'Накладная INV-170585816894 отправлена на доставку', 'invoice_shipped', 2, FALSE),
(6, 'Доставка завершена', 'Накладная INV-170583485936 успешно доставлена', 'invoice_delivered', 3, TRUE),
(4, 'Доставка завершена', 'Накладная INV-170584736251 успешно доставлена', 'invoice_delivered', 4, TRUE),
(7, 'Новая накладная', 'Создана накладная INV-170586234789 на сумму 245000.00₽', 'invoice_created', 5, FALSE),
(8, 'Требуется подтверждение', 'Накладная INV-170587456123 ожидает подтверждения', 'invoice_pending', 6, FALSE),
(9, 'Доставка завершена', 'Накладная INV-170588765432 успешно доставлена', 'invoice_delivered', 7, TRUE),
(10, 'Доставка завершена', 'Накладная INV-170589123654 успешно доставлена', 'invoice_delivered', 8, TRUE),
(5, 'Доставка завершена', 'Накладная INV-170590234567 успешно доставлена', 'invoice_delivered', 9, TRUE),
(4, 'Товар в пути', 'Накладная INV-170593567890 отправлена на доставку', 'invoice_shipped', 12, FALSE),
(1, 'Системное уведомление', 'Плановое обслуживание системы 5 ноября', 'system', NULL, FALSE),
(2, 'Новый платеж', 'Получена оплата по накладной INV-170583485936', 'payment_received', 3, TRUE),
(2, 'Новый платеж', 'Получена оплата по накладной INV-170594678901', 'payment_received', 13, TRUE),
(3, 'Напоминание', 'Требуется обновить контактные данные', 'reminder', NULL, FALSE),
(7, 'Новый комментарий', 'Добавлен комментарий к накладной INV-170586234789', 'comment', 5, FALSE),
(9, 'Акт подписан', 'Акт приемки по накладной INV-170588765432 подписан', 'document_signed', 7, TRUE);

INSERT INTO invoice_logs (invoice_id, user_id, action, old_status, new_status, description) VALUES
(1, 1, 'created', NULL, 'pending', 'Накладная создана'),
(2, 1, 'created', NULL, 'pending', 'Накладная создана'),
(2, 2, 'status_changed', 'pending', 'in_transit', 'Товар отгружен со склада'),
(3, 1, 'created', NULL, 'pending', 'Накладная создана'),
(3, 2, 'status_changed', 'pending', 'in_transit', 'Товар в пути'),
(3, 2, 'status_changed', 'in_transit', 'delivered', 'Товар доставлен клиенту'),
(4, 1, 'created', NULL, 'pending', 'Накладная создана'),
(4, 2, 'status_changed', 'pending', 'in_transit', 'Отправлено на доставку'),
(4, 2, 'status_changed', 'in_transit', 'delivered', 'Доставлено успешно'),
(5, 1, 'created', NULL, 'pending', 'Накладная создана'),
(5, 2, 'status_changed', 'pending', 'in_transit', 'Товар отправлен'),
(6, 1, 'created', NULL, 'pending', 'Накладная создана'),
(7, 1, 'created', NULL, 'pending', 'Накладная создана'),
(7, 2, 'status_changed', 'pending', 'in_transit', 'Товар в пути'),
(7, 2, 'status_changed', 'in_transit', 'delivered', 'Доставлено, акт подписан'),
(8, 1, 'created', NULL, 'pending', 'Накладная создана'),
(8, 2, 'status_changed', 'pending', 'in_transit', 'Отправлено'),
(8, 2, 'status_changed', 'in_transit', 'delivered', 'Получено клиентом'),
(9, 1, 'created', NULL, 'pending', 'Накладная создана'),
(9, 2, 'status_changed', 'pending', 'in_transit', 'В доставке'),
(9, 2, 'status_changed', 'in_transit', 'delivered', 'Успешно доставлено'),
(10, 1, 'created', NULL, 'pending', 'Накладная создана (новый клиент)'),
(11, 1, 'created', NULL, 'pending', 'Накладная создана'),
(11, 2, 'status_changed', 'pending', 'in_transit', 'Отгружено'),
(11, 2, 'status_changed', 'in_transit', 'delivered', 'Доставлено'),
(12, 1, 'created', NULL, 'pending', 'Накладная создана'),
(12, 2, 'status_changed', 'pending', 'in_transit', 'Отправлено на доставку'),
(13, 1, 'created', NULL, 'pending', 'Накладная создана'),
(13, 2, 'status_changed', 'pending', 'in_transit', 'В пути'),
(13, 2, 'status_changed', 'in_transit', 'delivered', 'Доставлено'),
(14, 1, 'created', NULL, 'pending', 'Накладная создана'),
(15, 1, 'created', NULL, 'pending', 'Накладная создана'),
(15, 3, 'status_changed', 'pending', 'cancelled', 'Отменено по просьбе клиента');

SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'logistics_accounting';
