const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════
// DATABASE — Railway MySQL ou local
// ══════════════════════════════════════
let db = null;

async function initDatabase() {
  try {
    const mysql = require('mysql2/promise');

    // Railway gera: MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
    // Local usa: DB_HOST, DB_USER, DB_PASS, DB_NAME
    const config = {
      host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306'),
      user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASS || '',
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 30000,
      ssl: false,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
    };

    console.log('✦ Tentando conectar MySQL em', config.host + ':' + config.port, 'db:', config.database);

    const pool = mysql.createPool(config);

    // Tentar conexão com retry
    let connected = false;
    for (let i = 0; i < 5; i++) {
      try {
        const conn = await pool.getConnection();
        await conn.query('SELECT 1');
        conn.release();
        connected = true;
        break;
      } catch (err) {
        console.log(`⚠ Tentativa ${i + 1}/5 falhou:`, err.message);
        if (i < 4) await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (connected) {
      db = pool;
      console.log('✦ MySQL conectado com sucesso!');
      await createTables();
    } else {
      console.log('⚠ Não conseguiu conectar ao MySQL após 5 tentativas');
    }

  } catch (e) {
    console.log('⚠ MySQL não disponível — frontend usará localStorage');
    console.log('  Motivo:', e.message);
  }
}

async function createTables() {
  if (!db) return;

  const queries = [
    `CREATE TABLE IF NOT EXISTS mesas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      codigo VARCHAR(10) NOT NULL UNIQUE,
      mestre VARCHAR(100) NOT NULL,
      descricao TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS fichas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mesa_id INT,
      tipo ENUM('player','monstro') DEFAULT 'player',
      nome VARCHAR(100) NOT NULL,
      raca VARCHAR(50),
      classe VARCHAR(50),
      nivel INT DEFAULT 1,
      forca INT DEFAULT 10,
      vitalidade INT DEFAULT 10,
      agilidade INT DEFAULT 10,
      inteligencia INT DEFAULT 10,
      carisma INT DEFAULT 10,
      sabedoria INT DEFAULT 10,
      hp_max INT DEFAULT 10,
      hp_atual INT DEFAULT 10,
      aura_max INT DEFAULT 0,
      aura_atual INT DEFAULT 0,
      mana_max INT DEFAULT 0,
      mana_atual INT DEFAULT 0,
      prana_max INT DEFAULT 0,
      prana_atual INT DEFAULT 0,
      sanidade INT DEFAULT 10,
      yvero_fase INT DEFAULT 0,
      moeda_cobre INT DEFAULT 0,
      moeda_prata INT DEFAULT 0,
      moeda_ouro INT DEFAULT 0,
      moeda_platina INT DEFAULT 0,
      cr VARCHAR(10) DEFAULT NULL,
      drops TEXT DEFAULT NULL,
      descricao TEXT,
      pericias JSON,
      inventario JSON,
      afinidade_magica BOOLEAN DEFAULT FALSE,
      deslocamento_zonas INT DEFAULT 1,
      notas TEXT,
      imagem_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ataques (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ficha_id INT NOT NULL,
      nome VARCHAR(100) NOT NULL,
      tipo VARCHAR(50),
      dano VARCHAR(50),
      alcance VARCHAR(50),
      descricao TEXT,
      custo_energia VARCHAR(100),
      FOREIGN KEY (ficha_id) REFERENCES fichas(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS sessoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mesa_id INT NOT NULL,
      numero INT DEFAULT 1,
      titulo VARCHAR(200),
      data_sessao DATE,
      resumo TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (mesa_id) REFERENCES mesas(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS diario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sessao_id INT NOT NULL,
      tipo ENUM('narrativa','combate','loot','nota') DEFAULT 'narrativa',
      conteudo TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sessao_id) REFERENCES sessoes(id) ON DELETE CASCADE
    )`
  ];

  for (const sql of queries) {
    try { await db.query(sql); } catch (e) { console.log('⚠ Tabela:', e.message); }
  }
  console.log('✦ Tabelas verificadas/criadas');
}

// ── Middleware: checa se DB está online ──
const needsDB = (req, res, next) => {
  if (!db) return res.status(503).json({ error: 'Database offline', offline: true });
  next();
};

// ══════════════════════════════════════
// MESAS
// ══════════════════════════════════════
app.get('/api/mesas', needsDB, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM mesas ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/mesas/:id', needsDB, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM mesas WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Mesa não encontrada' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/mesas', needsDB, async (req, res) => {
  try {
    const { nome, codigo, mestre, descricao } = req.body;
    const [result] = await db.query(
      'INSERT INTO mesas (nome, codigo, mestre, descricao) VALUES (?, ?, ?, ?)',
      [nome, codigo, mestre, descricao || '']
    );
    res.json({ id: result.insertId, nome, codigo, mestre, descricao });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/mesas/:id', needsDB, async (req, res) => {
  try {
    const { nome, mestre, descricao } = req.body;
    await db.query('UPDATE mesas SET nome=?, mestre=?, descricao=? WHERE id=?',
      [nome, mestre, descricao, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/mesas/:id', needsDB, async (req, res) => {
  try {
    await db.query('DELETE FROM mesas WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════
// FICHAS (player + monstro)
// ══════════════════════════════════════
app.get('/api/fichas', needsDB, async (req, res) => {
  try {
    const { mesa_id, tipo } = req.query;
    let sql = 'SELECT * FROM fichas WHERE 1=1';
    const params = [];
    if (mesa_id) { sql += ' AND mesa_id = ?'; params.push(mesa_id); }
    if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/fichas/:id', needsDB, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM fichas WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Ficha não encontrada' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/fichas', needsDB, async (req, res) => {
  try {
    const d = req.body;
    const [result] = await db.query(
      `INSERT INTO fichas (mesa_id, tipo, nome, raca, classe, nivel,
        forca, vitalidade, agilidade, inteligencia, carisma, sabedoria,
        hp_max, hp_atual, aura_max, aura_atual, mana_max, mana_atual, prana_max, prana_atual,
        sanidade, yvero_fase, moeda_cobre, moeda_prata, moeda_ouro, moeda_platina,
        cr, drops, descricao, pericias, inventario, afinidade_magica, deslocamento_zonas, notas, imagem_url)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.mesa_id || null, d.tipo || 'player', d.nome, d.raca, d.classe, d.nivel || 1,
       d.forca || 10, d.vitalidade || 10, d.agilidade || 10, d.inteligencia || 10, d.carisma || 10, d.sabedoria || 10,
       d.hp_max || 10, d.hp_atual || 10, d.aura_max || 0, d.aura_atual || 0, d.mana_max || 0, d.mana_atual || 0,
       d.prana_max || 0, d.prana_atual || 0, d.sanidade ?? 10, d.yvero_fase || 0,
       d.moeda_cobre || 0, d.moeda_prata || 0, d.moeda_ouro || 0, d.moeda_platina || 0,
       d.cr || null, d.drops || null, d.descricao || '',
       JSON.stringify(d.pericias || {}), JSON.stringify(d.inventario || []),
       d.afinidade_magica ? 1 : 0, d.deslocamento_zonas || 1, d.notas || '', d.imagem_url || '']
    );
    res.json({ id: result.insertId, ...d });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/fichas/:id', needsDB, async (req, res) => {
  try {
    const d = req.body;
    const fields = Object.keys(d).map(k => `${k} = ?`).join(', ');
    const values = Object.values(d).map((v, i) => {
      const key = Object.keys(d)[i];
      if (key === 'pericias' || key === 'inventario') return JSON.stringify(v);
      if (key === 'afinidade_magica') return v ? 1 : 0;
      return v;
    });
    values.push(req.params.id);
    await db.query(`UPDATE fichas SET ${fields} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/fichas/:id', needsDB, async (req, res) => {
  try {
    await db.query('DELETE FROM fichas WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════
// ATAQUES
// ══════════════════════════════════════
app.get('/api/ataques/:ficha_id', needsDB, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ataques WHERE ficha_id = ?', [req.params.ficha_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ataques', needsDB, async (req, res) => {
  try {
    const { ficha_id, nome, tipo, dano, alcance, descricao, custo_energia } = req.body;
    const [result] = await db.query(
      'INSERT INTO ataques (ficha_id, nome, tipo, dano, alcance, descricao, custo_energia) VALUES (?,?,?,?,?,?,?)',
      [ficha_id, nome, tipo, dano, alcance, descricao, custo_energia]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/ataques/:id', needsDB, async (req, res) => {
  try {
    await db.query('DELETE FROM ataques WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════
// SESSÕES
// ══════════════════════════════════════
app.get('/api/sessoes/:mesa_id', needsDB, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM sessoes WHERE mesa_id = ? ORDER BY numero DESC', [req.params.mesa_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sessoes', needsDB, async (req, res) => {
  try {
    const { mesa_id, numero, titulo, data_sessao, resumo } = req.body;
    const [result] = await db.query(
      'INSERT INTO sessoes (mesa_id, numero, titulo, data_sessao, resumo) VALUES (?,?,?,?,?)',
      [mesa_id, numero, titulo, data_sessao, resumo]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════
// DIÁRIO
// ══════════════════════════════════════
app.get('/api/diario/:sessao_id', needsDB, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM diario WHERE sessao_id = ? ORDER BY created_at ASC', [req.params.sessao_id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/diario', needsDB, async (req, res) => {
  try {
    const { sessao_id, tipo, conteudo } = req.body;
    const [result] = await db.query(
      'INSERT INTO diario (sessao_id, tipo, conteudo) VALUES (?,?,?)',
      [sessao_id, tipo, conteudo]
    );
    res.json({ id: result.insertId, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Health check ──
app.get('/api/health', async (req, res) => {
  let dbStatus = 'offline';
  if (db) {
    try {
      const conn = await db.getConnection();
      await conn.query('SELECT 1');
      conn.release();
      dbStatus = 'online';
    } catch (e) {
      console.log('Health check DB error:', e.message);
      dbStatus = 'error';
    }
  }
  res.json({ status: 'ok', database: dbStatus });
});

// ── SPA fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ══════════════════════════════════════
// START
// ══════════════════════════════════════
const PORT = process.env.PORT || 3000;

async function start() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✦ Nuvolish RPG rodando na porta ${PORT}`);
    console.log(`✦ Database: ${db ? 'MySQL conectado' : 'Offline (frontend usará localStorage)'}\n`);
  });
}

start();
