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
  unit VARCHAR(50) DEFAULT 'С€С‚',
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
('РћРћРћ "Р›РѕРіРёСЃС‚РёРє РџСЂРѕ"', 'РРІР°РЅРѕРІ РРІР°РЅ РРІР°РЅРѕРІРёС‡', 'info@logisticpro.ru', '+7-495-123-4567', 'РњРѕСЃРєРІР°, СѓР». РўРІРµСЂСЃРєР°СЏ, Рґ. 10', '7701234567', 'active'),
('РђРћ "РўСЂР°РЅСЃРїРѕСЂС‚ РЎРµСЂРІРёСЃ"', 'РџРµС‚СЂРѕРІ РџРµС‚СЂ РџРµС‚СЂРѕРІРёС‡', 'contact@transserv.ru', '+7-812-987-6543', 'РЎР°РЅРєС‚-РџРµС‚РµСЂР±СѓСЂРі, РїСЂ. РќРµРІСЃРєРёР№, Рґ. 25', '7802345678', 'active'),
('РРџ РЎРёРґРѕСЂРѕРІ РЎ.РЎ.', 'РЎРёРґРѕСЂРѕРІ РЎРµСЂРіРµР№ РЎРµСЂРіРµРµРІРёС‡', 'sidorov@mail.ru', '+7-916-555-1234', 'РњРѕСЃРєРѕРІСЃРєР°СЏ РѕР±Р»., Рі. РҐРёРјРєРё', '771234567890', 'active'),
('РћРћРћ "Р“Р»РѕР±Р°Р» Р›РѕРіРёСЃС‚РёРєСЃ"', 'РљСѓР·РЅРµС†РѕРІ РђРЅРґСЂРµР№ РџРµС‚СЂРѕРІРёС‡', 'info@globallog.ru', '+7-495-777-8899', 'РњРѕСЃРєРІР°, СѓР». РђСЂР±Р°С‚, Рґ. 20', '7703456789', 'active'),
('Р—РђРћ "РЎС‚СЂРѕР№РњР°СЂРєРµС‚"', 'Р’РѕР»РєРѕРІ Р”РјРёС‚СЂРёР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡', 'dm.volkov@stroymarket.ru', '+7-495-234-5678', 'РњРѕСЃРєРІР°, СѓР». Р›РµРЅРёРЅР°, Рґ. 45', '7704567890', 'active'),
('РћРћРћ "РўРµС…РЅРѕРўРѕСЂРі"', 'РњРѕСЂРѕР·РѕРІР° Р•Р»РµРЅР° Р’РёРєС‚РѕСЂРѕРІРЅР°', 'info@technotorg.ru', '+7-812-345-6789', 'РЎР°РЅРєС‚-РџРµС‚РµСЂР±СѓСЂРі, СѓР». РЎР°РґРѕРІР°СЏ, Рґ. 12', '7805678901', 'active'),
('РРџ РљРѕР·Р»РѕРІ Рђ.Р’.', 'РљРѕР·Р»РѕРІ РђР»РµРєСЃРµР№ Р’Р»Р°РґРёРјРёСЂРѕРІРёС‡', 'kozlov.av@yandex.ru', '+7-926-777-8888', 'РњРѕСЃРєРІР°, РїСЂ. РњРёСЂР°, Рґ. 88', '772345678901', 'active'),
('РћРћРћ "РњРµРіР°РџРѕСЃС‚Р°РІРєР°"', 'РќРѕРІРёРєРѕРІР° РћР»СЊРіР° РЎРµСЂРіРµРµРІРЅР°', 'sales@megapostavka.com', '+7-495-888-9999', 'РњРѕСЃРєРІР°, РљСѓС‚СѓР·РѕРІСЃРєРёР№ РїСЂ., Рґ. 30', '7706789012', 'active'),
('РђРћ "РџСЂРѕРјРРјРїРѕСЂС‚"', 'РЎРѕРєРѕР»РѕРІ РњРёС…Р°РёР» РџРµС‚СЂРѕРІРёС‡', 'contact@promimport.ru', '+7-812-456-7890', 'РЎР°РЅРєС‚-РџРµС‚РµСЂР±СѓСЂРі, РЅР°Р±. Р¤РѕРЅС‚Р°РЅРєРё, Рґ. 60', '7807890123', 'inactive'),
('РћРћРћ "РђР»СЊС„Р° РўСЂРµР№Рґ"', 'Р›РµР±РµРґРµРІР° РђРЅРЅР° РРІР°РЅРѕРІРЅР°', 'info@alphatrade.ru', '+7-495-999-0000', 'РњРѕСЃРєРІР°, СѓР». Р‘РѕР»СЊС€Р°СЏ Р”РјРёС‚СЂРѕРІРєР°, Рґ. 7', '7708901234', 'active');

INSERT INTO users (username, password, email, full_name, phone, company_name, recovery_code, is_verified, role, client_id) VALUES
('admin', 'TEMP_HASH_ADMIN', 'admin@logistics.com', 'РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РЎРёСЃС‚РµРјС‹', '+7-999-000-0001', 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєР°СЏ СЃРёСЃС‚РµРјР°', 'ADMIN-REC-2025', TRUE, 'admin', NULL),
('accountant1', 'TEMP_HASH_ACCOUNTANT1', 'accountant1@logistics.com', 'РЎРјРёСЂРЅРѕРІ РРіРѕСЂСЊ Р’Р»Р°РґРёРјРёСЂРѕРІРёС‡', '+7-999-000-0002', 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєР°СЏ СЃРёСЃС‚РµРјР°', 'ACCT1-REC-2025', TRUE, 'accountant', NULL),
('accountant2', 'TEMP_HASH_ACCOUNTANT2', 'accountant2@logistics.com', 'РЎРёРґРѕСЂРѕРІР° РђРЅРЅР° РЎРµСЂРіРµРµРІРЅР°', '+7-999-000-0003', 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєР°СЏ СЃРёСЃС‚РµРјР°', 'ACCT2-REC-2025', TRUE, 'accountant', NULL),
('client1', 'TEMP_HASH_CLIENT', 'client1@logistics.com', 'РРІР°РЅРѕРІ РРІР°РЅ РРІР°РЅРѕРІРёС‡', '+7-999-000-0004', 'РћРћРћ "Р›РѕРіРёСЃС‚РёРє РџСЂРѕ"', 'CLI1-REC-2025', TRUE, 'client', 1),
('client2', 'TEMP_HASH_CLIENT', 'client2@logistics.com', 'РџРµС‚СЂРѕРІ РџРµС‚СЂ РџРµС‚СЂРѕРІРёС‡', '+7-999-000-0005', 'РђРћ "РўСЂР°РЅСЃРїРѕСЂС‚ РЎРµСЂРІРёСЃ"', 'CLI2-REC-2025', TRUE, 'client', 2),
('client3', 'TEMP_HASH_CLIENT', 'client3@logistics.com', 'РЎРёРґРѕСЂРѕРІ РЎРµСЂРіРµР№ РЎРµСЂРіРµРµРІРёС‡', '+7-999-000-0006', 'РРџ РЎРёРґРѕСЂРѕРІ РЎ.РЎ.', 'CLI3-REC-2025', TRUE, 'client', 3),
('client4', 'TEMP_HASH_CLIENT', 'client4@logistics.com', 'РљСѓР·РЅРµС†РѕРІ РђРЅРґСЂРµР№ РџРµС‚СЂРѕРІРёС‡', '+7-999-000-0007', 'РћРћРћ "Р“Р»РѕР±Р°Р» Р›РѕРіРёСЃС‚РёРєСЃ"', 'CLI4-REC-2025', TRUE, 'client', 4),
('client5', 'TEMP_HASH_CLIENT', 'client5@logistics.com', 'Р’РѕР»РєРѕРІ Р”РјРёС‚СЂРёР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡', '+7-999-000-0008', 'Р—РђРћ "РЎС‚СЂРѕР№РњР°СЂРєРµС‚"', 'CLI5-REC-2025', TRUE, 'client', 5),
('client6', 'TEMP_HASH_CLIENT', 'client6@logistics.com', 'РњРѕСЂРѕР·РѕРІР° Р•Р»РµРЅР° Р’РёРєС‚РѕСЂРѕРІРЅР°', '+7-999-000-0009', 'РћРћРћ "РўРµС…РЅРѕРўРѕСЂРі"', 'CLI6-REC-2025', TRUE, 'client', 6),
('client7', 'TEMP_HASH_CLIENT', 'client7@logistics.com', 'РљРѕР·Р»РѕРІ РђР»РµРєСЃРµР№ Р’Р»Р°РґРёРјРёСЂРѕРІРёС‡', '+7-999-000-0010', 'РРџ РљРѕР·Р»РѕРІ Рђ.Р’.', 'CLI7-REC-2025', TRUE, 'client', 7);

-- INSERT INTO products (name, description, unit, price, stock_quantity, category, is_active) VALUES
('РџР°Р»Р»РµС‚Р° EUR', 'Р•РІСЂРѕРїРѕРґРґРѕРЅ СЃС‚Р°РЅРґР°СЂС‚РЅС‹Р№ 1200x800 РјРј', 'С€С‚', 450.00, 1000, 'РџР°Р»Р»РµС‚С‹', TRUE),
('РџР°Р»Р»РµС‚Р° FIN', 'Р¤РёРЅСЃРєРёР№ РїРѕРґРґРѕРЅ 1200x1000 РјРј', 'С€С‚', 520.00, 800, 'РџР°Р»Р»РµС‚С‹', TRUE),
('РљРѕСЂРѕР±РєР° РєР°СЂС‚РѕРЅРЅР°СЏ 60x40x40', 'Р“РѕС„СЂРѕРєРѕСЂРѕР± С‚СЂРµС…СЃР»РѕР№РЅС‹Р№', 'С€С‚', 85.00, 5000, 'РЈРїР°РєРѕРІРєР°', TRUE),
('РЎС‚СЂРµР№С‡-РїР»РµРЅРєР° 50СЃРј', 'РџР»РµРЅРєР° РґР»СЏ СѓРїР°РєРѕРІРєРё РїР°Р»Р»РµС‚', 'СЂСѓР»', 380.00, 200, 'РЈРїР°РєРѕРІРєР°', TRUE),
('РЎРєРѕС‚С‡ СѓРїР°РєРѕРІРѕС‡РЅС‹Р№', 'РЁРёСЂРѕРєРёР№ СЃРєРѕС‚С‡ 50РјРј x 66Рј', 'С€С‚', 45.00, 1500, 'РЈРїР°РєРѕРІРєР°', TRUE),
('РЈРіР»РѕРІРѕР№ РїСЂРѕС„РёР»СЊ', 'Р—Р°С‰РёС‚Р° СѓРіР»РѕРІ РіСЂСѓР·Р° РїСЂРё С‚СЂР°РЅСЃРїРѕСЂС‚РёСЂРѕРІРєРµ', 'С€С‚', 25.00, 3000, 'РЈРїР°РєРѕРІРєР°', TRUE),
('Р“СЂСѓР· СЃС‚Р°РЅРґР°СЂС‚РЅС‹Р№', 'РўРѕРІР°СЂ РѕР±С‰РµРіРѕ РЅР°Р·РЅР°С‡РµРЅРёСЏ', 'РєРі', 50.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РҐСЂСѓРїРєРёР№ РіСЂСѓР·', 'РўРѕРІР°СЂ С‚СЂРµР±СѓСЋС‰РёР№ РѕСЃРѕР±РѕР№ РѕСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚Рё', 'РєРі', 75.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РњРµС‚Р°Р»Р»РѕРёР·РґРµР»РёСЏ', 'РњРµС‚Р°Р»Р»РёС‡РµСЃРєРёРµ РґРµС‚Р°Р»Рё Рё РєРѕРЅСЃС‚СЂСѓРєС†РёРё', 'РєРі', 65.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РЎС‚СЂРѕР№РјР°С‚РµСЂРёР°Р»С‹', 'РЎС‚СЂРѕРёС‚РµР»СЊРЅС‹Рµ РјР°С‚РµСЂРёР°Р»С‹ РЅР°РІР°Р»РѕРј', 'РјВі', 1200.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РњРµР±РµР»СЊ РѕС„РёСЃРЅР°СЏ', 'РћС„РёСЃРЅС‹Рµ СЃС‚РѕР»С‹, СЃС‚СѓР»СЊСЏ, С€РєР°С„С‹', 'С€С‚', 3500.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('Р‘С‹С‚РѕРІР°СЏ С‚РµС…РЅРёРєР°', 'РҐРѕР»РѕРґРёР»СЊРЅРёРєРё, СЃС‚РёСЂР°Р»СЊРЅС‹Рµ РјР°С€РёРЅС‹ Рё С‚.Рґ.', 'С€С‚', 15000.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РўРµРєСЃС‚РёР»СЊ', 'РўРєР°РЅРё, РѕРґРµР¶РґР°, РїРѕСЃС‚РµР»СЊРЅРѕРµ Р±РµР»СЊРµ', 'РєРі', 180.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РџСЂРѕРґСѓРєС‚С‹ РїРёС‚Р°РЅРёСЏ', 'РўРѕРІР°СЂС‹ СЃ РѕРіСЂР°РЅРёС‡РµРЅРЅС‹Рј СЃСЂРѕРєРѕРј РіРѕРґРЅРѕСЃС‚Рё', 'РєРі', 120.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РҐРёРјРёС‡РµСЃРєРёРµ С‚РѕРІР°СЂС‹', 'Р‘С‹С‚РѕРІР°СЏ С…РёРјРёСЏ, РјРѕСЋС‰РёРµ СЃСЂРµРґСЃС‚РІР°', 'РєРі', 95.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РђРІС‚РѕР·Р°РїС‡Р°СЃС‚Рё', 'Р—Р°РїР°СЃРЅС‹Рµ С‡Р°СЃС‚Рё РґР»СЏ Р°РІС‚РѕРјРѕР±РёР»РµР№', 'С€С‚', 850.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('Р­Р»РµРєС‚СЂРѕРЅРёРєР°', 'Р­Р»РµРєС‚СЂРѕРЅРЅС‹Рµ СѓСЃС‚СЂРѕР№СЃС‚РІР° Рё РєРѕРјРїР»РµРєС‚СѓСЋС‰РёРµ', 'С€С‚', 5500.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РЎРїРѕСЂС‚РёРІРЅС‹Рµ С‚РѕРІР°СЂС‹', 'РЎРїРѕСЂС‚РёРЅРІРµРЅС‚Р°СЂСЊ Рё РѕР±РѕСЂСѓРґРѕРІР°РЅРёРµ', 'С€С‚', 1200.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РљРЅРёРіРё Рё РєР°РЅС†РµР»СЏСЂРёСЏ', 'РџРµС‡Р°С‚РЅР°СЏ РїСЂРѕРґСѓРєС†РёСЏ Рё РѕС„РёСЃРЅС‹Рµ РїСЂРёРЅР°РґР»РµР¶РЅРѕСЃС‚Рё', 'РєРі', 85.00, 0, 'РўРѕРІР°СЂС‹', TRUE),
('РРіСЂСѓС€РєРё', 'Р”РµС‚СЃРєРёРµ РёРіСЂСѓС€РєРё Рё СЂР°Р·РІРёРІР°СЋС‰РёРµ РёРіСЂС‹', 'С€С‚', 450.00, 0, 'РўРѕРІР°СЂС‹', TRUE);
*/
*/*/
INSERT INTO user_profiles (user_id, full_name, phone, email, company_name, company_inn, telegram, whatsapp) VALUES
(1, 'РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РЎРёСЃС‚РµРјС‹', '+7-999-000-0001', 'admin@logistics.com', 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєР°СЏ СЃРёСЃС‚РµРјР°', NULL, '@admin_log', '+79990000001'),
(2, 'РЎРјРёСЂРЅРѕРІ РРіРѕСЂСЊ Р’Р»Р°РґРёРјРёСЂРѕРІРёС‡', '+7-999-000-0002', 'accountant1@logistics.com', 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєР°СЏ СЃРёСЃС‚РµРјР°', NULL, '@i_smirnov', '+79990000002'),
(3, 'РЎРёРґРѕСЂРѕРІР° РђРЅРЅР° РЎРµСЂРіРµРµРІРЅР°', '+7-999-000-0003', 'accountant2@logistics.com', 'Р›РѕРіРёСЃС‚РёС‡РµСЃРєР°СЏ СЃРёСЃС‚РµРјР°', NULL, '@a_sidorova', '+79990000003'),
(4, 'РРІР°РЅРѕРІ РРІР°РЅ РРІР°РЅРѕРІРёС‡', '+7-999-000-0004', 'client1@logistics.com', 'РћРћРћ "Р›РѕРіРёСЃС‚РёРє РџСЂРѕ"', '7701234567', '@ivanov_ii', '+79990000004'),
(5, 'РџРµС‚СЂРѕРІ РџРµС‚СЂ РџРµС‚СЂРѕРІРёС‡', '+7-999-000-0005', 'client2@logistics.com', 'РђРћ "РўСЂР°РЅСЃРїРѕСЂС‚ РЎРµСЂРІРёСЃ"', '7802345678', '@petrov_pp', '+79990000005'),
(6, 'РЎРёРґРѕСЂРѕРІ РЎРµСЂРіРµР№ РЎРµСЂРіРµРµРІРёС‡', '+7-999-000-0006', 'client3@logistics.com', 'РРџ РЎРёРґРѕСЂРѕРІ РЎ.РЎ.', '771234567890', '@sidorov_ss', '+79990000006'),
(7, 'РљСѓР·РЅРµС†РѕРІ РђРЅРґСЂРµР№ РџРµС‚СЂРѕРІРёС‡', '+7-999-000-0007', 'client4@logistics.com', 'РћРћРћ "Р“Р»РѕР±Р°Р» Р›РѕРіРёСЃС‚РёРєСЃ"', '7703456789', '@kuznetsov_ap', '+79990000007'),
(8, 'Р’РѕР»РєРѕРІ Р”РјРёС‚СЂРёР№ РђР»РµРєСЃР°РЅРґСЂРѕРІРёС‡', '+7-999-000-0008', 'client5@logistics.com', 'Р—РђРћ "РЎС‚СЂРѕР№РњР°СЂРєРµС‚"', '7704567890', '@volkov_da', '+79990000008'),
(9, 'РњРѕСЂРѕР·РѕРІР° Р•Р»РµРЅР° Р’РёРєС‚РѕСЂРѕРІРЅР°', '+7-999-000-0009', 'client6@logistics.com', 'РћРћРћ "РўРµС…РЅРѕРўРѕСЂРі"', '7805678901', '@morozova_ev', '+79990000009'),
(10, 'РљРѕР·Р»РѕРІ РђР»РµРєСЃРµР№ Р’Р»Р°РґРёРјРёСЂРѕРІРёС‡', '+7-999-000-0010', 'client7@logistics.com', 'РРџ РљРѕР·Р»РѕРІ Рђ.Р’.', '772345678901', '@kozlov_av', '+79990000010');

-- INSERT INTO invoices (invoice_number, client_id, invoice_date, delivery_date, status, total_amount, notes) VALUES
/*('INV-170584168125', 1, '2024-10-29', '2024-11-05', 'pending', 50000.00, 'РќРѕРІР°СЏ РЅР°РєР»Р°РґРЅР°СЏ С‚СЂРµР±СѓРµС‚ РїСЂРѕРІРµСЂРєРё'),
('INV-170585816894', 2, '2024-10-15', '2024-10-20', 'in_transit', 125000.00, 'Р’ РїСЂРѕС†РµСЃСЃРµ РґРѕСЃС‚Р°РІРєРё'),
('INV-170583485936', 3, '2024-10-25', '2024-10-30', 'delivered', 10500.00, 'Р”РѕСЃС‚Р°РІР»РµРЅРѕ СѓСЃРїРµС€РЅРѕ'),
('INV-170584736251', 1, '2024-10-20', '2024-10-25', 'delivered', 75000.00, NULL),
('INV-170586234789', 4, '2024-10-28', '2024-11-02', 'in_transit', 245000.00, 'РљСЂСѓРїРЅС‹Р№ Р·Р°РєР°Р· СЃС‚СЂРѕРёС‚РµР»СЊРЅС‹С… РјР°С‚РµСЂРёР°Р»РѕРІ'),
('INV-170587456123', 5, '2024-10-26', '2024-11-01', 'pending', 189500.00, 'РўСЂРµР±СѓРµС‚СЃСЏ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РєР»РёРµРЅС‚Р°'),
('INV-170588765432', 6, '2024-10-22', '2024-10-27', 'delivered', 67800.00, 'РўРѕРІР°СЂ РїРѕР»СѓС‡РµРЅ, Р°РєС‚ РїРѕРґРїРёСЃР°РЅ'),
('INV-170589123654', 7, '2024-10-24', '2024-10-29', 'delivered', 32100.00, 'Р”РѕСЃС‚Р°РІР»РµРЅРѕ РІ СЃСЂРѕРє'),
('INV-170590234567', 2, '2024-10-18', '2024-10-23', 'delivered', 156000.00, 'РџРѕРІС‚РѕСЂРЅС‹Р№ Р·Р°РєР°Р·'),
('INV-170591345678', 8, '2024-10-30', '2024-11-04', 'pending', 412000.00, 'РќРѕРІС‹Р№ РєР»РёРµРЅС‚, РїРµСЂРІС‹Р№ Р·Р°РєР°Р·'),
('INV-170592456789', 3, '2024-10-21', '2024-10-26', 'delivered', 23400.00, NULL),
('INV-170593567890', 1, '2024-10-27', '2024-11-01', 'in_transit', 98700.00, 'РћР¶РёРґР°РµС‚СЃСЏ РґРѕСЃС‚Р°РІРєР°'),
('INV-170594678901', 4, '2024-10-19', '2024-10-24', 'delivered', 134500.00, 'РЈСЃРїРµС€РЅРѕ РґРѕСЃС‚Р°РІР»РµРЅРѕ'),
('INV-170595789012', 6, '2024-10-31', '2024-11-05', 'pending', 276300.00, 'РћР¶РёРґР°РµС‚ РѕР±СЂР°Р±РѕС‚РєРё'),
('INV-170596890123', 5, '2024-10-16', '2024-10-21', 'cancelled', 87000.00, 'РћС‚РјРµРЅРµРЅРѕ РїРѕ РїСЂРѕСЃСЊР±Рµ РєР»РёРµРЅС‚Р°');*/*/

*/
-- INSERT INTO invoice_items (invoice_id, product_name, quantity, unit_price) VALUES
/*(1, 'Р¦РµРјРµРЅС‚ Рњ500', 100, 500.00),
(2, 'РЎС‚Р°РЅРѕРє С‚РѕРєР°СЂРЅС‹Р№', 1, 125000.00),
(3, 'Р”СЂРµР»СЊ СЌР»РµРєС‚СЂРёС‡РµСЃРєР°СЏ', 3, 3500.00),
(4, 'РљРёСЂРїРёС‡ РєСЂР°СЃРЅС‹Р№', 3000, 25.00),
(5, 'РђСЂРјР°С‚СѓСЂР° 12РјРј', 500, 350.00),
(5, 'Р‘РµС‚РѕРЅ Рњ300', 15, 6500.00),
(5, 'Р©РµР±РµРЅСЊ С„СЂР°РєС†РёСЏ 5-20', 20, 1200.00),
(6, 'РљСЂР°СЃРєР° С„Р°СЃР°РґРЅР°СЏ', 50, 850.00),
(6, 'РЈС‚РµРїР»РёС‚РµР»СЊ Р±Р°Р·Р°Р»СЊС‚РѕРІС‹Р№', 100, 1250.00),
(6, 'РџСЂРѕС„Р»РёСЃС‚ РѕС†РёРЅРєРѕРІР°РЅРЅС‹Р№', 80, 650.00),
(7, 'Р­Р»РµРєС‚СЂРѕРєР°Р±РµР»СЊ Р’Р’Р“ 3С…2.5', 200, 85.00),
(7, 'Р РѕР·РµС‚РєРё Schneider', 100, 120.00),
(7, 'Р’С‹РєР»СЋС‡Р°С‚РµР»Рё ABB', 80, 150.00),
(7, 'РЎРІРµС‚РёР»СЊРЅРёРєРё LED', 50, 480.00),
(8, 'РўСЂСѓР±Р° РџР’РҐ 110РјРј', 50, 320.00),
(8, 'РЎР°РЅС‚РµС…РЅРёРєР° Grohe (СЃРјРµСЃРёС‚РµР»СЊ)', 12, 1850.00),
(8, 'РЈРЅРёС‚Р°Р· РїРѕРґРІРµСЃРЅРѕР№', 5, 850.00),
(9, 'РњРµС‚Р°Р»Р»РѕРїСЂРѕРєР°С‚ С€РІРµР»Р»РµСЂ', 25, 4800.00),
(9, 'РџСЂРѕС„РёР»СЊРЅР°СЏ С‚СЂСѓР±Р° 40С…40', 150, 280.00),
(9, 'Р›РёСЃС‚ СЃС‚Р°Р»СЊРЅРѕР№ 3РјРј', 30, 1500.00),
(10, 'Р”РµСЂРµРІСЏРЅРЅС‹Р№ Р±СЂСѓСЃ 150С…150', 200, 1250.00),
(10, 'Р”РѕСЃРєР° РѕР±СЂРµР·РЅР°СЏ 50С…150', 300, 450.00),
(10, 'Р¤Р°РЅРµСЂР° Р¤Рљ 18РјРј', 100, 980.00),
(10, 'OSB РїР»РёС‚Р° 12РјРј', 80, 620.00),
(11, 'Р“РёРїСЃРѕРєР°СЂС‚РѕРЅ Knauf', 150, 280.00),
(11, 'РџСЂРѕС„РёР»СЊ РґР»СЏ Р“РљР›', 200, 65.00),
(12, 'РљРµСЂР°РјРѕРіСЂР°РЅРёС‚ 60С…60', 80, 890.00),
(12, 'РџР»РёС‚РєР° РЅР°СЃС‚РµРЅРЅР°СЏ', 120, 450.00),
(12, 'Р—Р°С‚РёСЂРєР° Mapei', 40, 320.00),
(13, 'РћРєРЅР° РџР’РҐ 1400С…1200', 15, 7800.00),
(13, 'Р”РІРµСЂРё РІС…РѕРґРЅС‹Рµ', 8, 4500.00),
(14, 'Р›РёРЅРѕР»РµСѓРј Tarkett', 200, 650.00),
(14, 'Р›Р°РјРёРЅР°С‚ 33 РєР»Р°СЃСЃ', 150, 980.00),
(14, 'РџР»РёРЅС‚СѓСЃ РЅР°РїРѕР»СЊРЅС‹Р№', 300, 85.00),
(15, 'РћС‚РјРµРЅС‘РЅРЅС‹Р№ С‚РѕРІР°СЂ 1', 50, 1200.00),
(15, 'РћС‚РјРµРЅС‘РЅРЅС‹Р№ С‚РѕРІР°СЂ 2', 30, 800.00);
*/
-- INSERT INTO transactions (invoice_id, transaction_type, amount, transaction_date, payment_method, description) VALUES
/*(3, 'income', 10500.00, '2024-10-30', 'bank_transfer', 'РћРїР»Р°С‚Р° РЅР°РєР»Р°РґРЅРѕР№ INV-170583485936'),
(4, 'income', 75000.00, '2024-10-25', 'bank_transfer', 'РћРїР»Р°С‚Р° РЅР°РєР»Р°РґРЅРѕР№ INV-170584736251'),
(7, 'income', 67800.00, '2024-10-27', 'bank_transfer', 'РћРїР»Р°С‚Р° РЅР°РєР»Р°РґРЅРѕР№ INV-170588765432'),
(8, 'income', 32100.00, '2024-10-29', 'cash', 'РћРїР»Р°С‚Р° РЅР°РєР»Р°РґРЅРѕР№ INV-170589123654'),
(9, 'income', 156000.00, '2024-10-23', 'bank_transfer', 'РћРїР»Р°С‚Р° РЅР°РєР»Р°РґРЅРѕР№ INV-170590234567'),
(11, 'income', 23400.00, '2024-10-26', 'card', 'РћРїР»Р°С‚Р° РЅР°РєР»Р°РґРЅРѕР№ INV-170592456789'),
(13, 'income', 134500.00, '2024-10-24', 'bank_transfer', 'РћРїР»Р°С‚Р° РЅР°РєР»Р°РґРЅРѕР№ INV-170594678901'),
(1, 'income', 25000.00, '2024-10-29', 'bank_transfer', 'Р§Р°СЃС‚РёС‡РЅР°СЏ РїСЂРµРґРѕРїР»Р°С‚Р° 50%'),
(5, 'income', 122500.00, '2024-10-28', 'bank_transfer', 'РђРІР°РЅСЃ 50%'),
(6, 'income', 94750.00, '2024-10-26', 'bank_transfer', 'РџСЂРµРґРѕРїР»Р°С‚Р°'),
(NULL, 'expense', 15000.00, '2024-10-10', 'cash', 'Р—Р°СЂРїР»Р°С‚Р° СЃРѕС‚СЂСѓРґРЅРёРєР°Рј'),
(NULL, 'expense', 8500.00, '2024-10-15', 'card', 'РћС„РёСЃРЅС‹Рµ СЂР°СЃС…РѕРґС‹'),
(NULL, 'expense', 25000.00, '2024-10-20', 'bank_transfer', 'РђСЂРµРЅРґР° СЃРєР»Р°РґР°'),
(NULL, 'expense', 12300.00, '2024-10-22', 'cash', 'РўСЂР°РЅСЃРїРѕСЂС‚РЅС‹Рµ СЂР°СЃС…РѕРґС‹'),
(NULL, 'expense', 5600.00, '2024-10-24', 'card', 'РљР°РЅС†С‚РѕРІР°СЂС‹ Рё СЂР°СЃС…РѕРґРЅРёРєРё'),
(NULL, 'expense', 18000.00, '2024-10-26', 'bank_transfer', 'РљРѕРјРјСѓРЅР°Р»СЊРЅС‹Рµ РїР»Р°С‚РµР¶Рё'),
(NULL, 'expense', 7800.00, '2024-10-28', 'cash', 'Р—Р°РєСѓРїРєР° СѓРїР°РєРѕРІРѕС‡РЅС‹С… РјР°С‚РµСЂРёР°Р»РѕРІ'),
(NULL, 'expense', 32000.00, '2024-10-30', 'bank_transfer', 'РќР°Р»РѕРіРѕРІС‹Рµ РїР»Р°С‚РµР¶Рё');
*/
-- INSERT INTO comments (invoice_id, user_id, comment_text, is_internal) VALUES
/*(1, 1, 'РќР°РєР»Р°РґРЅР°СЏ СЃРѕР·РґР°РЅР°, РѕР¶РёРґР°РµС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ РєР»РёРµРЅС‚Р°', TRUE),
(1, 4, 'РџРѕРґС‚РІРµСЂР¶РґР°РµРј Р·Р°РєР°Р·, РєРѕРіРґР° РѕР¶РёРґР°С‚СЊ РґРѕСЃС‚Р°РІРєСѓ?', FALSE),
(1, 2, 'Р”РѕСЃС‚Р°РІРєР° РїР»Р°РЅРёСЂСѓРµС‚СЃСЏ 5 РЅРѕСЏР±СЂСЏ', FALSE),
(2, 2, 'РћРїР»Р°С‚Р° РїРѕР»СѓС‡РµРЅР°, РіРѕС‚РѕРІРёРј Рє РѕС‚РїСЂР°РІРєРµ', FALSE),
(2, 5, 'РЎРїР°СЃРёР±Рѕ! РћР¶РёРґР°РµРј С‚РѕРІР°СЂ', FALSE),
(3, 6, 'РўРѕРІР°СЂ РїРѕР»СѓС‡РµРЅ РІ РїРѕР»РЅРѕРј РѕР±СЉРµРјРµ, СЃРїР°СЃРёР±Рѕ!', FALSE),
(4, 1, 'Р”РѕСЃС‚Р°РІРєР° РІС‹РїРѕР»РЅРµРЅР° СѓСЃРїРµС€РЅРѕ', TRUE),
(5, 2, 'РўСЂРµР±СѓРµС‚СЃСЏ СЃРѕРіР»Р°СЃРѕРІР°РЅРёРµ СЃСЂРѕРєРѕРІ СЃ РєР»РёРµРЅС‚РѕРј', TRUE),
(5, 7, 'РЎРѕРіР»Р°СЃРЅС‹ РЅР° РґРѕСЃС‚Р°РІРєСѓ 2 РЅРѕСЏР±СЂСЏ', FALSE),
(6, 3, 'РћС‚РіСЂСѓР·РєР° РІС‹РїРѕР»РЅРµРЅР°, С‚РѕРІР°СЂ РІ РїСѓС‚Рё', TRUE),
(7, 9, 'Р’СЃРµ РїРѕР»СѓС‡РµРЅРѕ, РєР°С‡РµСЃС‚РІРѕ РѕС‚Р»РёС‡РЅРѕРµ!', FALSE),
(8, 10, 'Р”РѕСЃС‚Р°РІРєР° РІРѕРІСЂРµРјСЏ, РїСЂРµС‚РµРЅР·РёР№ РЅРµС‚', FALSE),
(9, 5, 'Р‘Р»Р°РіРѕРґР°СЂРёРј Р·Р° РѕРїРµСЂР°С‚РёРІРЅРѕСЃС‚СЊ!', FALSE),
(10, 1, 'РќРѕРІС‹Р№ РєР»РёРµРЅС‚, С‚СЂРµР±СѓРµС‚СЃСЏ РѕСЃРѕР±РѕРµ РІРЅРёРјР°РЅРёРµ', TRUE),
(10, 2, 'РљР»РёРµРЅС‚ СЃРІСЏР·Р°Р»СЃСЏ, РІСЃРµ РґРµС‚Р°Р»Рё СѓС‚РѕС‡РЅРµРЅС‹', TRUE),
(11, 6, 'РџРѕРІС‚РѕСЂРЅС‹Р№ Р·Р°РєР°Р·, РІСЃРµ РїРѕРЅСЂР°РІРёР»РѕСЃСЊ', FALSE),
(12, 1, 'Р”РѕСЃС‚Р°РІРєР° Р·Р°РґРµСЂР¶РёРІР°РµС‚СЃСЏ РЅР° 1 РґРµРЅСЊ РёР·-Р·Р° РїРѕРіРѕРґС‹', TRUE),
(12, 4, 'РџРѕРЅРёРјР°РµРј, РЅРµ РїСЂРѕР±Р»РµРјР°', FALSE),
(13, 7, 'РўРѕРІР°СЂ СЃРѕРѕС‚РІРµС‚СЃС‚РІСѓРµС‚ РѕРїРёСЃР°РЅРёСЋ', FALSE),
(14, 2, 'РћР¶РёРґР°РµРј РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РѕС‚ РєР»РёРµРЅС‚Р°', TRUE),
(15, 3, 'РљР»РёРµРЅС‚ РѕС‚РєР°Р·Р°Р»СЃСЏ РѕС‚ Р·Р°РєР°Р·Р°', TRUE),
(15, 8, 'РР·РІРёРЅРёС‚Рµ, РёР·РјРµРЅРёР»РёСЃСЊ РїР»Р°РЅС‹', FALSE);
*/
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
