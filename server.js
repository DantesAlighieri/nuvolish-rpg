const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Tentar conectar MySQL (funciona sem DB — fallback no frontend) ──
let db = null;
try {
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'nuvolish_rpg',
    waitForConnections: true,
    connectionLimit: 10
  });
  db = pool;
  console.log('✦ MySQL pool criado');
} catch (e) {
  console.log('⚠ MySQL não disponível — frontend usará localStorage');
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
      [d.mesa_id, d.tipo||'player', d.nome, d.raca, d.classe, d.nivel||1,
       d.forca||10, d.vitalidade||10, d.agilidade||10, d.inteligencia||10, d.carisma||10, d.sabedoria||10,
       d.hp_max||10, d.hp_atual||10, d.aura_max||0, d.aura_atual||0, d.mana_max||0, d.mana_atual||0,
       d.prana_max||0, d.prana_atual||0, d.sanidade||10, d.yvero_fase||0,
       d.moeda_cobre||0, d.moeda_prata||0, d.moeda_ouro||0, d.moeda_platina||0,
       d.cr||null, d.drops||null, d.descricao||'',
       JSON.stringify(d.pericias||{}), JSON.stringify(d.inventario||[]),
       d.afinidade_magica||false, d.deslocamento_zonas||1, d.notas||'', d.imagem_url||'']
    );
    res.json({ id: result.insertId, ...d });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/fichas/:id', needsDB, async (req, res) => {
  try {
    const d = req.body;
    const fields = Object.keys(d).map(k => {
      if (k === 'pericias' || k === 'inventario') return `${k} = ?`;
      return `${k} = ?`;
    }).join(', ');
    const values = Object.values(d).map((v, i) => {
      const key = Object.keys(d)[i];
      if (key === 'pericias' || key === 'inventario') return JSON.stringify(v);
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
    try { await db.query('SELECT 1'); dbStatus = 'online'; } catch (e) { dbStatus = 'error'; }
  }
  res.json({ status: 'ok', database: dbStatus });
});

// ── SPA fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✦ Nuvolish RPG rodando em http://localhost:${PORT}`);
  console.log(`✦ Database: ${db ? 'MySQL conectado' : 'Offline (usando localStorage)'}\n`);
});
