-- Nuvolish RPG - Schema MySQL
-- Rode: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS nuvolish_rpg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nuvolish_rpg;

-- Mesas de jogo
CREATE TABLE IF NOT EXISTS mesas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  mestre VARCHAR(100) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fichas (player + monstro)
CREATE TABLE IF NOT EXISTS fichas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id INT,
  tipo ENUM('player','monstro') DEFAULT 'player',
  nome VARCHAR(100) NOT NULL,
  raca VARCHAR(50),
  classe VARCHAR(50),
  nivel INT DEFAULT 1,
  -- Atributos (1-30)
  forca INT DEFAULT 10,
  vitalidade INT DEFAULT 10,
  agilidade INT DEFAULT 10,
  inteligencia INT DEFAULT 10,
  carisma INT DEFAULT 10,
  sabedoria INT DEFAULT 10,
  -- Energias
  hp_max INT DEFAULT 10,
  hp_atual INT DEFAULT 10,
  aura_max INT DEFAULT 0,
  aura_atual INT DEFAULT 0,
  mana_max INT DEFAULT 0,
  mana_atual INT DEFAULT 0,
  prana_max INT DEFAULT 0,
  prana_atual INT DEFAULT 0,
  -- Sanidade (0-10)
  sanidade INT DEFAULT 10,
  -- Contaminação Yvero (0-5)
  yvero_fase INT DEFAULT 0,
  -- Moedas
  moeda_cobre INT DEFAULT 0,
  moeda_prata INT DEFAULT 0,
  moeda_ouro INT DEFAULT 0,
  moeda_platina INT DEFAULT 0,
  -- Monstro extras
  cr VARCHAR(10) DEFAULT NULL,
  drops TEXT DEFAULT NULL,
  descricao TEXT,
  -- Pericias (JSON)
  pericias JSON,
  -- Inventario (JSON)
  inventario JSON,
  -- Extras
  afinidade_magica BOOLEAN DEFAULT FALSE,
  deslocamento_zonas INT DEFAULT 1,
  notas TEXT,
  imagem_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE SET NULL
);

-- Ataques/Habilidades
CREATE TABLE IF NOT EXISTS ataques (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ficha_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50),
  dano VARCHAR(50),
  alcance VARCHAR(50),
  descricao TEXT,
  custo_energia VARCHAR(100),
  FOREIGN KEY (ficha_id) REFERENCES fichas(id) ON DELETE CASCADE
);

-- Sessões
CREATE TABLE IF NOT EXISTS sessoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id INT NOT NULL,
  numero INT DEFAULT 1,
  titulo VARCHAR(200),
  data_sessao DATE,
  resumo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE CASCADE
);

-- Diário de sessão
CREATE TABLE IF NOT EXISTS diario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sessao_id INT NOT NULL,
  tipo ENUM('narrativa','combate','loot','nota') DEFAULT 'narrativa',
  conteudo TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
);
