/* ══════════════════════════════════════════════
   NUVOLISH RPG — App.js
   Sistema completo: SPA + API + localStorage fallback
   ══════════════════════════════════════════════ */

const App = (() => {
  // ── Estado global ──
  let dbOnline = false;
  let currentSection = 'hero';
  let currentMesa = null;
  let currentFicha = null;
  let currentFichaData = null;
  let diceHistory = [];
  let isMaster = false;
  let currentUser = JSON.parse(localStorage.getItem('nuvolish_user') || 'null');
  let playerName = currentUser ? currentUser.nome : '';

  // ══════════════════════════════════════
  // AUTH (Login / Registro)
  // ══════════════════════════════════════
  const auth = {
    showLogin() {
      modal.open('Entrar', `
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="auth-email" placeholder="seu@email.com">
        </div>
        <div class="form-group">
          <label>Senha</label>
          <input type="password" id="auth-senha" placeholder="Sua senha">
        </div>
        <p style="font-size:13px;color:var(--text-dim);margin-top:8px">Não tem conta? <a href="#" onclick="App.auth.showRegister();return false" style="color:var(--gold);text-decoration:underline">Criar conta</a></p>
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.auth.login()">Entrar</button>
      `);
    },

    showRegister() {
      modal.open('Criar Conta', `
        <div class="form-group">
          <label>Nome</label>
          <input type="text" id="auth-nome" placeholder="Seu nome (min. 2 caracteres)" minlength="2">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="auth-email" placeholder="seu@gmail.com" autocomplete="email">
          <span style="font-size:11px;color:var(--text-dim);margin-top:4px;display:block">Use um email válido (ex: nome@gmail.com)</span>
        </div>
        <div class="form-group">
          <label>Senha</label>
          <input type="password" id="auth-senha" placeholder="Mínimo 8 caracteres" minlength="8">
          <span style="font-size:11px;color:var(--text-dim);margin-top:4px;display:block">Mínimo 8 caracteres, com letras e números</span>
        </div>
        <p style="font-size:13px;color:var(--text-dim);margin-top:8px">Já tem conta? <a href="#" onclick="App.auth.showLogin();return false" style="color:var(--gold);text-decoration:underline">Entrar</a></p>
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.auth.register()">Criar Conta</button>
      `);
    },

    async login() {
      const email = document.getElementById('auth-email').value.trim();
      const senha = document.getElementById('auth-senha').value;
      if (!email || !senha) return toast('Preencha email e senha!', 'error');

      try {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha })
        });
        const data = await r.json();
        if (r.ok) {
          currentUser = data;
          playerName = data.nome;
          localStorage.setItem('nuvolish_user', JSON.stringify(data));
          modal.close();
          toast('Bem-vindo, ' + data.nome + '!', 'success');
          this.updateUI();
        } else {
          toast(data.error || 'Erro no login', 'error');
        }
      } catch {
        toast('Erro de conexão', 'error');
      }
    },

    async register() {
      const nome = document.getElementById('auth-nome').value.trim();
      const email = document.getElementById('auth-email').value.trim();
      const senha = document.getElementById('auth-senha').value;
      
      // Validações
      if (!nome || !email || !senha) return toast('Preencha todos os campos!', 'error');
      if (nome.length < 2) return toast('Nome precisa ter pelo menos 2 caracteres', 'error');
      
      // Validar email completo
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) return toast('Digite um email válido! Ex: nome@gmail.com', 'error');
      
      // Validar senha
      if (senha.length < 8) return toast('Senha precisa ter pelo menos 8 caracteres', 'error');
      if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) return toast('Senha precisa ter letras e números', 'error');

      try {
        const r = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, senha })
        });
        const data = await r.json();
        if (r.ok) {
          currentUser = data;
          playerName = data.nome;
          localStorage.setItem('nuvolish_user', JSON.stringify(data));
          modal.close();
          toast('Conta criada! Bem-vindo, ' + data.nome + '!', 'success');
          this.updateUI();
        } else {
          toast(data.error || 'Erro ao criar conta', 'error');
        }
      } catch {
        toast('Erro de conexão', 'error');
      }
    },

    logout() {
      currentUser = null;
      playerName = '';
      localStorage.removeItem('nuvolish_user');
      toast('Deslogado!', 'info');
      this.updateUI();
      navigate('hero');
    },

    updateUI() {
      const authArea = document.getElementById('navAuth');
      if (currentUser) {
        authArea.innerHTML = `
          <span style="font-family:var(--font-mono);font-size:11px;color:var(--gold)">${esc(currentUser.nome)}</span>
          <a style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);cursor:pointer;text-decoration:underline" onclick="App.auth.logout()">Sair</a>
        `;
      } else {
        authArea.innerHTML = `
          <a class="btn btn-sm btn-outline" style="font-size:10px;padding:6px 12px" onclick="App.auth.showLogin()">Entrar</a>
          <a class="btn btn-sm btn-gold" style="font-size:10px;padding:6px 12px" onclick="App.auth.showRegister()">Criar Conta</a>
        `;
      }
    },

    requireLogin(callback) {
      if (!currentUser) {
        toast('Faça login primeiro!', 'warning');
        this.showLogin();
        return false;
      }
      return true;
    }
  };

  // ══════════════════════════════════════
  // CONSTANTES DO SISTEMA NUVOLISH
  // ══════════════════════════════════════
  const ATRIBUTOS = ['Força', 'Vitalidade', 'Agilidade', 'Inteligência', 'Carisma', 'Sabedoria'];
  const ATRIBUTOS_KEY = ['forca', 'vitalidade', 'agilidade', 'inteligencia', 'carisma', 'sabedoria'];

  const PERICIAS = [
    { nome: 'Investigação', attr: 'inteligencia' },
    { nome: 'Linguagem', attr: 'inteligencia' },
    { nome: 'Intuição', attr: 'sabedoria' },
    { nome: 'Percepção', attr: 'sabedoria' },
    { nome: 'Sobrevivência', attr: 'sabedoria' },
    { nome: 'Inovação', attr: 'inteligencia' },
    { nome: 'Acrobacia', attr: 'agilidade' },
    { nome: 'Atletismo', attr: 'forca' },
    { nome: 'Furtividade', attr: 'agilidade' },
    { nome: 'Prestidigitação', attr: 'agilidade' },
    { nome: 'Medicina', attr: 'sabedoria' },
    { nome: 'Geografia', attr: 'inteligencia' },
    { nome: 'História', attr: 'inteligencia' },
    { nome: 'Natureza', attr: 'inteligencia' },
    { nome: 'Religião', attr: 'sabedoria' },
    { nome: 'Atuação', attr: 'carisma' },
    { nome: 'Enganação', attr: 'carisma' },
    { nome: 'Persuasão', attr: 'carisma' },
    { nome: 'Domar Animais', attr: 'sabedoria' }
  ];

  const SANIDADE_ESTAGIOS = [
    { nome: 'Quebra Mental', min: 0, max: 0, css: 'quebra', desc: 'Ponto sem retorno — a mente se despedaçou.' },
    { nome: 'Colapso', min: 1, max: 2, css: 'colapso', desc: 'À beira do abismo. Alucinações constantes, paranoia extrema.' },
    { nome: 'Ruptura', min: 3, max: 4, css: 'ruptura', desc: 'Fissuras profundas na mente. Tremores, vozes, visões.' },
    { nome: 'Abalo', min: 5, max: 7, css: 'abalo', desc: 'Marcas visíveis do trauma. Pesadelos, ansiedade, sustos.' },
    { nome: 'Estável', min: 8, max: 10, css: 'estavel', desc: 'Mente sã e firme. Nenhum sintoma.' }
  ];

  const YVERO_FASES = [
    { nome: 'Limpo', desc: 'Nenhuma contaminação. O corpo está puro.' },
    { nome: 'Cansaço', desc: 'Fadiga inexplicável. Sonhos perturbadores com os Poços de Maldição. Os Flinos parecem te seguir.' },
    { nome: 'Deterioração', desc: 'Marcas escuras na pele. Perda de peso. Sensibilidade à luz. Proximidade com Poços intensifica a dor.' },
    { nome: 'Mutação', desc: 'Alterações visíveis no corpo. Membros podem se deformar. A Fase Pulpa pode ocorrer — dissolução parcial temporária.' },
    { nome: 'Dominação', desc: 'A mente começa a obedecer ao Yvero. Impulsos violentos, perda de memória. Os Flinos se comunicam com você.' },
    { nome: 'Transformação', desc: 'Transformação total. O ser original deixa de existir. O corpo se recompõe da Fase Pulpa em uma forma completamente nova e monstruosa.' }
  ];

  const RACE_THEMES = {
    'Nuvolian': 'theme-nuvolian',
    'Eldryd da Floresta': 'theme-eldryd-floresta',
    'Eldryd do Caos': 'theme-eldryd-caos',
    'Kragnir': 'theme-kragnir'
  };

  const MAP_REGIONS = {
    hysteria: {
      nome: 'Cidades Flutuantes de Hystéria',
      desc: 'Fortalezas aéreas sustentadas por Aura cristalizada. Lar dos Nuvolians. Conectadas por pontes de luz e rotas de vento. Principal refúgio contra a Contaminação Yvero.',
      cor: '#c9a84c'
    },
    lilin: {
      nome: 'Floresta de Lilin',
      desc: 'A grande floresta viva que cobre Core. Lar dos Eldryds da Floresta, seres que se comunicam com árvores ancestrais. Cuidado com os Flinos que espreitam nas sombras.',
      cor: '#2ecc71'
    },
    kragnir: {
      nome: 'Montanhas Kragnir',
      desc: 'Reinos subterrâneos escavados na pedra. Os Kragnir são forjadores natos e mineradores de cristais de Aura. Fogo e martelo contra a Contaminação.',
      cor: '#e67e22'
    },
    pocos: {
      nome: 'Poços de Maldição',
      desc: 'Fissuras na realidade onde energia corrompida do Yvero vaza para Core. Quem se aproxima demais sente o Cansaço — primeiro sinal da Contaminação.',
      cor: '#8e44ad'
    },
    caos: {
      nome: 'Floresta do Caos',
      desc: 'Coração sombrio de Lilin onde vivem os Eldryds do Caos — corrompidos pelo Yvero. As árvores aqui são retorcidas e a escuridão é quase tangível.',
      cor: '#e74c3c'
    },
    planicies: {
      nome: 'Planícies de Core',
      desc: 'Vastas terras abertas entre as florestas e montanhas. Rotas comerciais, caravanas e perigos à espreita. Caminho obrigatório entre as grandes regiões.',
      cor: '#3498db'
    }
  };

  // ══════════════════════════════════════
  // CÁLCULOS DO SISTEMA
  // ══════════════════════════════════════
  function calcMod(valor) {
    if (valor <= 1) return -5;
    if (valor <= 3) return -4;
    if (valor <= 5) return -3;
    if (valor <= 7) return -2;
    if (valor <= 9) return -1;
    if (valor <= 11) return 0;
    if (valor <= 13) return 1;
    if (valor <= 15) return 2;
    if (valor <= 17) return 3;
    if (valor <= 19) return 4;
    if (valor <= 21) return 5;
    if (valor <= 23) return 6;
    if (valor <= 25) return 7;
    if (valor <= 27) return 8;
    if (valor <= 29) return 9;
    return 10; // 30
  }

  function calcAura(carisma, inteligencia) {
    return 8 + calcMod(carisma) + calcMod(inteligencia);
  }

  function getSanidadeEstagio(val) {
    return SANIDADE_ESTAGIOS.find(e => val >= e.min && val <= e.max) || SANIDADE_ESTAGIOS[4];
  }

  function rollDice(sides, qty = 1) {
    const results = [];
    for (let i = 0; i < qty; i++) {
      results.push(Math.floor(Math.random() * sides) + 1);
    }
    return results;
  }

  // ══════════════════════════════════════
  // API COM FALLBACK LOCALSTORAGE
  // ══════════════════════════════════════
  const api = {
    async checkHealth() {
      try {
        const r = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
        const data = await r.json();
        dbOnline = data.database === 'online';
      } catch {
        dbOnline = false;
      }
      const dot = document.getElementById('dbDot');
      const status = document.getElementById('dbStatus');
      if (dbOnline) {
        dot.classList.remove('offline');
        status.textContent = 'MySQL Online';
      } else {
        dot.classList.add('offline');
        status.textContent = 'Local Mode';
      }
    },

    // Wrapper genérico
    async request(method, url, body = null) {
      if (!dbOnline) return { offline: true };
      try {
        const opts = { method, headers: { 'Content-Type': 'application/json' } };
        if (body) opts.body = JSON.stringify(body);
        const r = await fetch(url, opts);
        return await r.json();
      } catch {
        return { offline: true };
      }
    },

    // LocalStorage helpers
    ls: {
      get(key) { try { return JSON.parse(localStorage.getItem('nuvolish_' + key)) || []; } catch { return []; } },
      set(key, val) { localStorage.setItem('nuvolish_' + key, JSON.stringify(val)); },
      nextId(key) {
        const items = this.get(key);
        return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
      }
    },

    // MESAS
    async getMesas() {
      const r = await this.request('GET', '/api/mesas');
      if (r.offline) return this.ls.get('mesas');
      return r;
    },
    async createMesa(data) {
      const r = await this.request('POST', '/api/mesas', data);
      if (r.offline) {
        const mesas = this.ls.get('mesas');
        data.id = this.ls.nextId('mesas');
        data.created_at = new Date().toISOString();
        mesas.unshift(data);
        this.ls.set('mesas', mesas);
        return data;
      }
      return r;
    },
    async deleteMesa(id) {
      const r = await this.request('DELETE', '/api/mesas/' + id);
      if (r.offline) {
        let mesas = this.ls.get('mesas');
        mesas = mesas.filter(m => m.id !== id);
        this.ls.set('mesas', mesas);
        // Remover fichas e sessões da mesa
        let fichas = this.ls.get('fichas');
        fichas = fichas.filter(f => f.mesa_id !== id);
        this.ls.set('fichas', fichas);
      }
      return r;
    },

    // FICHAS
    async getFichas(params = {}) {
      let url = '/api/fichas?';
      if (params.mesa_id) url += 'mesa_id=' + params.mesa_id + '&';
      if (params.tipo) url += 'tipo=' + params.tipo + '&';
      const r = await this.request('GET', url);
      if (r.offline) {
        let fichas = this.ls.get('fichas');
        if (params.mesa_id) fichas = fichas.filter(f => f.mesa_id == params.mesa_id);
        if (params.tipo) fichas = fichas.filter(f => f.tipo === params.tipo);
        return fichas;
      }
      return r;
    },
    async getFicha(id) {
      const r = await this.request('GET', '/api/fichas/' + id);
      if (r.offline) {
        return this.ls.get('fichas').find(f => f.id == id) || null;
      }
      return r;
    },
    async createFicha(data) {
      const r = await this.request('POST', '/api/fichas', data);
      if (r.offline) {
        const fichas = this.ls.get('fichas');
        data.id = this.ls.nextId('fichas');
        data.created_at = new Date().toISOString();
        fichas.unshift(data);
        this.ls.set('fichas', fichas);
        return data;
      }
      return r;
    },
    async updateFicha(id, data) {
      const r = await this.request('PUT', '/api/fichas/' + id, data);
      if (r.offline) {
        let fichas = this.ls.get('fichas');
        const idx = fichas.findIndex(f => f.id == id);
        if (idx !== -1) { fichas[idx] = { ...fichas[idx], ...data }; }
        this.ls.set('fichas', fichas);
      }
      return r;
    },
    async deleteFicha(id) {
      const r = await this.request('DELETE', '/api/fichas/' + id);
      if (r.offline) {
        let fichas = this.ls.get('fichas');
        fichas = fichas.filter(f => f.id != id);
        this.ls.set('fichas', fichas);
      }
      return r;
    },

    // ATAQUES
    async getAtaques(fichaId) {
      const r = await this.request('GET', '/api/ataques/' + fichaId);
      if (r.offline) {
        return this.ls.get('ataques').filter(a => a.ficha_id == fichaId);
      }
      return r;
    },
    async createAtaque(data) {
      const r = await this.request('POST', '/api/ataques', data);
      if (r.offline) {
        const ataques = this.ls.get('ataques');
        data.id = this.ls.nextId('ataques');
        ataques.push(data);
        this.ls.set('ataques', ataques);
        return data;
      }
      return r;
    },
    async deleteAtaque(id) {
      const r = await this.request('DELETE', '/api/ataques/' + id);
      if (r.offline) {
        let ataques = this.ls.get('ataques');
        ataques = ataques.filter(a => a.id != id);
        this.ls.set('ataques', ataques);
      }
      return r;
    },

    // SESSÕES
    async getSessoes(mesaId) {
      const r = await this.request('GET', '/api/sessoes/' + mesaId);
      if (r.offline) {
        return this.ls.get('sessoes').filter(s => s.mesa_id == mesaId).sort((a, b) => b.numero - a.numero);
      }
      return r;
    },
    async createSessao(data) {
      const r = await this.request('POST', '/api/sessoes', data);
      if (r.offline) {
        const sessoes = this.ls.get('sessoes');
        data.id = this.ls.nextId('sessoes');
        data.created_at = new Date().toISOString();
        sessoes.push(data);
        this.ls.set('sessoes', sessoes);
        return data;
      }
      return r;
    },

    // DIÁRIO
    async getDiario(sessaoId) {
      const r = await this.request('GET', '/api/diario/' + sessaoId);
      if (r.offline) {
        return this.ls.get('diario').filter(d => d.sessao_id == sessaoId);
      }
      return r;
    },
    async createDiario(data) {
      const r = await this.request('POST', '/api/diario', data);
      if (r.offline) {
        const diario = this.ls.get('diario');
        data.id = this.ls.nextId('diario');
        data.created_at = new Date().toISOString();
        diario.push(data);
        this.ls.set('diario', diario);
        return data;
      }
      return r;
    }
  };

  // ══════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════
  function toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ══════════════════════════════════════
  // MODAL
  // ══════════════════════════════════════
  const modal = {
    open(title, bodyHtml, footerHtml = '') {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = bodyHtml;
      document.getElementById('modalFooter').innerHTML = footerHtml;
      document.getElementById('modalOverlay').classList.add('open');
    },
    close() {
      document.getElementById('modalOverlay').classList.remove('open');
    }
  };

  // ══════════════════════════════════════
  // NAVEGAÇÃO SPA
  // ══════════════════════════════════════
  function navigate(section) {
    // Seções que precisam de login
    const protectedSections = ['mesas', 'fichas', 'bestiario', 'sessoes'];
    if (protectedSections.includes(section) && !currentUser) {
      toast('Crie uma conta ou faça login para acessar!', 'warning');
      auth.showRegister();
      return;
    }

    // Esconder todas as seções
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Mostrar a seção alvo
    const target = document.getElementById('sec-' + section);
    if (target) {
      target.classList.add('active');
      currentSection = section;
    }
    // Atualizar nav links
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === section);
    });
    // Fechar menu mobile
    document.getElementById('navLinks').classList.remove('open');
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Load data da seção
    if (section === 'mesas') mesas.load();
    if (section === 'fichas') fichas.load();
    if (section === 'bestiario') bestiario.load();
    if (section === 'sessoes') sessoes.loadMesas();
  }

  // ══════════════════════════════════════
  // MESAS
  // ══════════════════════════════════════
  const mesas = {
    async load() {
      const data = await api.getMesas();
      const grid = document.getElementById('mesasGrid');
      document.getElementById('mesasList').style.display = 'block';
      document.getElementById('mesaActive').style.display = 'none';

      if (!data.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚔️</div><p>Nenhuma mesa criada ainda</p></div>';
        return;
      }

      grid.innerHTML = data.map(m => `
        <div class="card" style="cursor:pointer" onclick="App.mesas.enter(${m.id})">
          <div class="card-header">
            <span class="card-title">${esc(m.nome)}</span>
            <span class="mesa-code">${esc(m.codigo)}</span>
          </div>
          <p style="color:var(--text-muted);font-size:14px;margin-bottom:8px">${esc(m.descricao || 'Sem descrição')}</p>
          <span class="card-meta">Mestre: ${esc(m.mestre)}</span>
        </div>
      `).join('');
    },

    openCreate() {
      if (!auth.requireLogin()) return;
      modal.open('Nova Mesa', `
        <div class="form-group">
          <label>Nome da Mesa</label>
          <input type="text" id="m-nome" placeholder="Ex: A Queda de Hystéria">
        </div>
        <div class="form-group">
          <label>Mestre</label>
          <input type="text" id="m-mestre" value="${esc(currentUser.nome)}" readonly style="opacity:0.7">
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <textarea id="m-desc" rows="3" placeholder="Sobre a campanha..."></textarea>
        </div>
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.mesas.create()">Criar Mesa</button>
      `);
    },

    async create() {
      if (!auth.requireLogin()) return;
      const nome = document.getElementById('m-nome').value.trim();
      const mestre = currentUser.nome;
      const descricao = document.getElementById('m-desc').value.trim();
      if (!nome) return toast('Preencha o nome da mesa!', 'error');
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      await api.createMesa({ nome, codigo, mestre, mestre_id: currentUser.id, descricao });
      modal.close();
      toast('Mesa criada! Código: ' + codigo, 'success');
      this.load();
    },

    async enter(id) {
      const data = await api.getMesas();
      const mesa = data.find(m => m.id == id);
      if (!mesa) return toast('Mesa não encontrada', 'error');
      currentMesa = mesa;

      // Detectar se é mestre (por ID do usuário ou por nome como fallback)
      isMaster = currentUser && (mesa.mestre_id == currentUser.id || mesa.mestre === currentUser.nome);
      const activeEl = document.getElementById('mesaActive');
      activeEl.classList.toggle('is-master', isMaster);

      // Badge de role
      const badge = document.getElementById('mesaRoleBadge');
      if (isMaster) {
        badge.textContent = '👑 Mestre';
        badge.className = 'master-badge';
      } else {
        badge.textContent = '⚔ Jogador';
        badge.className = 'player-badge';
      }

      document.getElementById('mesasList').style.display = 'none';
      activeEl.style.display = 'block';
      document.getElementById('mesaActiveName').textContent = mesa.nome;
      document.getElementById('mesaActiveCode').textContent = mesa.codigo;
      this.loadTab('jogadores');
    },

    join() {
      if (!auth.requireLogin()) return;
      const code = document.getElementById('mesaJoinCode').value.trim().toUpperCase();
      if (!code) return toast('Digite um código!', 'error');

      api.getMesas().then(data => {
        const mesa = data.find(m => m.codigo === code);
        if (mesa) {
          this.enter(mesa.id);
        } else {
          toast('Mesa não encontrada com esse código', 'error');
        }
      });
    },

    copyCode() {
      const code = document.getElementById('mesaActiveCode').textContent;
      navigator.clipboard.writeText(code).then(() => toast('Código copiado!', 'success'));
    },

    back() {
      currentMesa = null;
      this.load();
    },

    async deleteCurrent() {
      if (!currentMesa) return;
      if (!confirm('Excluir mesa "' + currentMesa.nome + '"? Isso apaga tudo!')) return;
      await api.deleteMesa(currentMesa.id);
      currentMesa = null;
      toast('Mesa excluída', 'warning');
      this.load();
    },

    async loadTab(tab) {
      // Ativar tab visual
      document.querySelectorAll('.mesa-tab').forEach(t => t.classList.toggle('active', t.dataset.mesaTab === tab));
      const content = document.getElementById('mesaTabContent');
      if (!currentMesa) return;

      if (tab === 'jogadores') {
        const players = await api.getFichas({ mesa_id: currentMesa.id, tipo: 'player' });
        content.innerHTML = `
          <button class="btn btn-sm btn-outline" onclick="App.mesas.addFichaToMesa('player')" style="margin-bottom:16px">+ Adicionar Jogador</button>
          <div class="card-grid">${players.length ? players.map(p => this.renderFichaCard(p)).join('') : '<div class="empty-state"><p>Nenhum jogador na mesa</p></div>'}</div>
        `;
      } else if (tab === 'monstros') {
        if (!isMaster) {
          content.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><p>Apenas o Mestre pode ver os monstros da mesa</p></div>';
          return;
        }
        const monsters = await api.getFichas({ mesa_id: currentMesa.id, tipo: 'monstro' });
        content.innerHTML = `
          <button class="btn btn-sm btn-outline" onclick="App.mesas.addFichaToMesa('monstro')" style="margin-bottom:16px">+ Adicionar Monstro</button>
          <div class="card-grid">${monsters.length ? monsters.map(m => this.renderMonsterCard(m)).join('') : '<div class="empty-state"><p>Nenhum monstro na mesa</p></div>'}</div>
        `;
      } else if (tab === 'combate') {
        const allFichas = await api.getFichas({ mesa_id: currentMesa.id });
        // Jogador só vê PCs no combate, Mestre vê tudo
        const fichasVisiveis = isMaster ? allFichas : allFichas.filter(f => f.tipo === 'player');
        content.innerHTML = `
          <div class="card sheet-full" style="margin-bottom:20px">
            <div class="card-header"><span class="card-title">Ordem de Iniciativa</span>
              ${isMaster ? '<button class="btn btn-sm btn-gold" onclick="App.mesas.rollInitiative()">🎲 Rolar Iniciativa</button>' : '<span class="tag">Aguardando o Mestre...</span>'}
            </div>
            <div id="initiativeList">${fichasVisiveis.map(f => `
              <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
                <span class="tag ${f.tipo === 'monstro' ? 'tag-red' : 'tag-gold'}">${f.tipo === 'monstro' ? 'MON' : 'PC'}</span>
                <span style="flex:1;font-family:var(--font-display);font-size:15px">${esc(f.nome)}</span>
                ${isMaster ? `<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim)">HP ${f.hp_atual||0}/${f.hp_max||0}</span>` : ''}
                <span class="initiative-val" data-ficha="${f.id}" data-agi="${f.agilidade || 10}" style="font-family:var(--font-mono);font-size:18px;color:var(--gold);min-width:30px;text-align:center">—</span>
              </div>
            `).join('')}</div>
          </div>
        `;
      } else if (tab === 'diario') {
        const sessoes = await api.getSessoes(currentMesa.id);
        content.innerHTML = `
          ${isMaster ? `<button class="btn btn-sm btn-gold" onclick="App.sessoes.openCreateForMesa(${currentMesa.id})" style="margin-bottom:16px">+ Nova Sessão</button>` : ''}
          ${sessoes.length ? sessoes.map(s => `
            <div class="card" style="margin-bottom:12px;cursor:pointer" onclick="App.sessoes.viewDiario(${s.id}, '${esc(s.titulo || 'Sessão ' + s.numero)}')">
              <div class="card-header">
                <span class="card-title">Sessão ${s.numero}${s.titulo ? ' — ' + esc(s.titulo) : ''}</span>
                <span class="card-meta">${s.data_sessao || ''}</span>
              </div>
              <p style="color:var(--text-muted);font-size:14px">${esc(s.resumo || 'Sem resumo')}</p>
            </div>
          `).join('') : '<div class="empty-state"><p>Nenhuma sessão registrada</p></div>'}
        `;
      }
    },

    renderFichaCard(f) {
      return `<div class="card" style="cursor:pointer" onclick="App.fichas.openEditor(${f.id})">
        <div class="card-header">
          <span class="card-title">${esc(f.nome)}</span>
          <span class="tag tag-gold">${esc(f.raca || '—')}</span>
        </div>
        <p style="color:var(--text-muted);font-size:14px">${esc(f.classe || '—')} · Nível ${f.nivel || 1}</p>
        <div style="margin-top:8px">
          <div class="energy-bar" style="margin-bottom:4px">
            <span class="energy-label" style="width:30px;font-size:11px">HP</span>
            <div class="energy-track" style="height:16px"><div class="energy-fill hp" style="width:${((f.hp_atual||0)/(f.hp_max||1))*100}%"></div></div>
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim);width:60px;text-align:center">${f.hp_atual||0}/${f.hp_max||0}</span>
          </div>
        </div>
      </div>`;
    },

    renderMonsterCard(m) {
      return `<div class="monster-card" onclick="App.fichas.openEditor(${m.id})" style="cursor:pointer">
        <div class="monster-header">
          <span class="monster-name">${esc(m.nome)}</span>
          <span class="monster-cr">CR ${esc(m.cr || '?')}</span>
        </div>
        <div class="monster-body">
          <div class="monster-stats">
            ${ATRIBUTOS_KEY.map((k, i) => `<div class="monster-stat"><div class="monster-stat-label">${ATRIBUTOS[i].substring(0, 3)}</div><div class="monster-stat-val">${m[k] || 10}</div></div>`).join('')}
          </div>
          <p style="color:var(--text-muted);font-size:13px">${esc(m.descricao || '')}</p>
          ${m.drops ? `<div style="margin-top:8px"><span class="tag tag-green">Drops: ${esc(m.drops)}</span></div>` : ''}
        </div>
      </div>`;
    },

    addFichaToMesa(tipo) {
      if (tipo === 'monstro') {
        bestiario.openCreate(currentMesa.id);
      } else {
        fichas.openCreate(currentMesa.id);
      }
    },

    rollInitiative() {
      const items = document.querySelectorAll('.initiative-val');
      const results = [];
      items.forEach(el => {
        const agi = parseInt(el.dataset.agi) || 10;
        const roll = rollDice(20)[0];
        const total = roll + calcMod(agi);
        el.textContent = total;
        results.push({ el: el.parentElement, total });
      });
      // Ordenar visualmente
      results.sort((a, b) => b.total - a.total);
      const container = document.getElementById('initiativeList');
      results.forEach(r => container.appendChild(r.el));
      toast('Iniciativa rolada!', 'success');
    }
  };

  // ══════════════════════════════════════
  // FICHAS
  // ══════════════════════════════════════
  const fichas = {
    async load() {
      const data = await api.getFichas({ tipo: 'player' });
      const grid = document.getElementById('fichasGrid');
      document.getElementById('fichaEditor').style.display = 'none';
      grid.style.display = '';

      if (!data.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>Nenhuma ficha criada</p></div>';
        return;
      }

      grid.innerHTML = data.map(f => mesas.renderFichaCard(f)).join('');
    },

    openCreate(mesaId = null) {
      if (!auth.requireLogin()) return;
      modal.open('Nova Ficha', `
        <div class="form-group">
          <label>Nome do Personagem</label>
          <input type="text" id="nf-nome" placeholder="Nome">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Raça</label>
            <input type="text" id="nf-raca" placeholder="Ex: Nuvolian, Eldryd..." list="racas-modal">
            <datalist id="racas-modal">
              <option value="Nuvolian">
              <option value="Eldryd da Floresta">
              <option value="Eldryd do Caos">
              <option value="Kragnir">
            </datalist>
          </div>
          <div class="form-group">
            <label>Classe</label>
            <input type="text" id="nf-classe" placeholder="Classe">
          </div>
        </div>
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.fichas.create(${mesaId})">Criar Ficha</button>
      `);
    },

    async create(mesaId = null) {
      const nome = document.getElementById('nf-nome').value.trim();
      const raca = document.getElementById('nf-raca').value;
      const classe = document.getElementById('nf-classe').value.trim();
      if (!nome) return toast('Nome obrigatório!', 'error');

      const auraMax = calcAura(10, 10);
      const data = {
        mesa_id: mesaId,
        tipo: 'player',
        nome, raca, classe,
        nivel: 1,
        forca: 10, vitalidade: 10, agilidade: 10,
        inteligencia: 10, carisma: 10, sabedoria: 10,
        hp_max: 10, hp_atual: 10,
        aura_max: auraMax, aura_atual: auraMax,
        mana_max: 0, mana_atual: 0,
        prana_max: 0, prana_atual: 0,
        sanidade: 10, yvero_fase: 0,
        moeda_cobre: 0, moeda_prata: 0, moeda_ouro: 0, moeda_platina: 0,
        pericias: {}, inventario: [],
        afinidade_magica: false,
        deslocamento_zonas: 1,
        notas: ''
      };

      const result = await api.createFicha(data);
      modal.close();
      toast('Ficha criada!', 'success');
      this.openEditor(result.id);
    },

    async openEditor(id) {
      const data = await api.getFicha(id);
      if (!data) return toast('Ficha não encontrada', 'error');

      currentFicha = id;
      currentFichaData = data;

      // Esconder grid, mostrar editor
      document.getElementById('fichasGrid').style.display = 'none';
      document.getElementById('fichaEditor').style.display = 'block';
      document.getElementById('fichaEditorName').textContent = data.nome;

      // Aplicar tema da raça
      const sheet = document.getElementById('fichaSheet');
      Object.values(RACE_THEMES).forEach(t => sheet.classList.remove(t));
      if (data.raca && RACE_THEMES[data.raca]) sheet.classList.add(RACE_THEMES[data.raca]);

      // Preencher campos básicos
      document.getElementById('f-nome').value = data.nome || '';
      document.getElementById('f-classe').value = data.classe || '';
      document.getElementById('f-raca').value = data.raca || '';
      document.getElementById('f-nivel').value = data.nivel || 1;
      document.getElementById('f-deslocamento').value = data.deslocamento_zonas || 1;
      document.getElementById('fichaRaceTag').textContent = data.raca || '—';

      // Atributos
      this.renderAttributes(data);

      // Energias
      document.getElementById('f-hp-atual').value = data.hp_atual || 0;
      document.getElementById('f-hp-max').value = data.hp_max || 10;
      document.getElementById('f-aura-atual').value = data.aura_atual || 0;
      document.getElementById('f-mana-atual').value = data.mana_atual || 0;
      document.getElementById('f-mana-max').value = data.mana_max || 0;
      document.getElementById('f-prana-atual').value = data.prana_atual || 0;
      document.getElementById('f-prana-max').value = data.prana_max || 0;
      this.recalcAura();
      this.updateEnergy();

      // Afinidade
      const afEl = document.getElementById('f-afinidade-status');
      if (data.afinidade_magica) {
        afEl.textContent = '✦ Possui Afinidade';
        afEl.className = 'tag tag-gold';
      } else {
        afEl.textContent = 'Sem Afinidade';
        afEl.className = 'tag';
      }

      // Sanidade
      this.renderSanidade(data.sanidade ?? 10);

      // Yvero
      this.setYvero(data.yvero_fase || 0);

      // Moedas
      document.getElementById('f-moeda-cobre').value = data.moeda_cobre || 0;
      document.getElementById('f-moeda-prata').value = data.moeda_prata || 0;
      document.getElementById('f-moeda-ouro').value = data.moeda_ouro || 0;
      document.getElementById('f-moeda-platina').value = data.moeda_platina || 0;

      // Perícias
      this.renderPericias(data);

      // Ataques
      this.loadAtaques(id);

      // Inventário
      this.renderInventario(data);

      // Traits & Condições
      document.getElementById('f-traits').value = data.notas ? (data.notas.split('|||TRAITS|||')[1]?.split('|||COND|||')[0] || '') : '';
      document.getElementById('f-condicoes').value = data.notas ? (data.notas.split('|||COND|||')[1] || '') : '';

      // Notas (parte antes dos separadores)
      document.getElementById('f-notas').value = data.notas ? data.notas.split('|||TRAITS|||')[0] : '';
    },

    renderAttributes(data) {
      const grid = document.getElementById('attrGrid');
      grid.innerHTML = ATRIBUTOS.map((nome, i) => {
        const key = ATRIBUTOS_KEY[i];
        const val = data[key] || 10;
        const mod = calcMod(val);
        const modStr = mod >= 0 ? '+' + mod : '' + mod;
        const modClass = mod > 0 ? 'positive' : mod < 0 ? 'negative' : '';
        return `
          <div class="attr-box">
            <div class="attr-name">${nome}</div>
            <input type="number" class="attr-input" data-attr="${key}" value="${val}" min="1" max="30" onchange="App.fichas.onAttrChange()">
            <div class="attr-mod ${modClass}">${modStr}</div>
          </div>
        `;
      }).join('');
    },

    onAttrChange() {
      this.recalcAura();
      // Atualizar mods visuais
      document.querySelectorAll('.attr-input').forEach(input => {
        const val = parseInt(input.value) || 10;
        const mod = calcMod(val);
        const modStr = mod >= 0 ? '+' + mod : '' + mod;
        const modEl = input.nextElementSibling;
        modEl.textContent = modStr;
        modEl.className = 'attr-mod ' + (mod > 0 ? 'positive' : mod < 0 ? 'negative' : '');
      });
      // Atualizar pericias
      this.updatePericiasBonuses();
    },

    recalcAura() {
      const car = parseInt(document.querySelector('[data-attr="carisma"]')?.value) || 10;
      const int = parseInt(document.querySelector('[data-attr="inteligencia"]')?.value) || 10;
      const auraMax = calcAura(car, int);
      document.getElementById('f-aura-max-display').textContent = auraMax;
      this.updateEnergy();
    },

    updateEnergy() {
      const hpAtual = parseInt(document.getElementById('f-hp-atual').value) || 0;
      const hpMax = parseInt(document.getElementById('f-hp-max').value) || 1;
      const auraAtual = parseInt(document.getElementById('f-aura-atual').value) || 0;
      const car = parseInt(document.querySelector('[data-attr="carisma"]')?.value) || 10;
      const int = parseInt(document.querySelector('[data-attr="inteligencia"]')?.value) || 10;
      const auraMax = calcAura(car, int);
      const manaAtual = parseInt(document.getElementById('f-mana-atual').value) || 0;
      const manaMax = parseInt(document.getElementById('f-mana-max').value) || 1;
      const pranaAtual = parseInt(document.getElementById('f-prana-atual').value) || 0;
      const pranaMax = parseInt(document.getElementById('f-prana-max').value) || 1;

      document.getElementById('hpFill').style.width = Math.min(100, (hpAtual / hpMax) * 100) + '%';
      document.getElementById('auraFill').style.width = auraMax > 0 ? Math.min(100, (auraAtual / auraMax) * 100) + '%' : '0%';
      document.getElementById('manaFill').style.width = manaMax > 0 ? Math.min(100, (manaAtual / manaMax) * 100) + '%' : '0%';
      document.getElementById('pranaFill').style.width = pranaMax > 0 ? Math.min(100, (pranaAtual / pranaMax) * 100) + '%' : '0%';
    },

    renderSanidade(val) {
      const track = document.getElementById('sanityTrack');
      track.innerHTML = '';
      for (let i = 10; i >= 1; i--) {
        const pip = document.createElement('div');
        pip.className = 'sanity-pip';
        if (i <= val) {
          pip.classList.add('filled');
          const est = getSanidadeEstagio(i);
          pip.classList.add(est.css);
        }
        // Só mestre pode alterar sanidade (ou se não tiver mesa = edição solo)
        if (isMaster || !currentMesa) {
          pip.onclick = () => this.setSanidade(i);
          pip.style.cursor = 'pointer';
        } else {
          pip.style.cursor = 'default';
        }
        track.appendChild(pip);
      }
      const est = getSanidadeEstagio(val);
      document.getElementById('sanidadeLabel').textContent = est.nome;
      document.getElementById('sanidadeLabel').style.color = `var(--san-${est.css})`;
      document.getElementById('sanidadeDesc').textContent = `${val}/10 — ${est.desc}`;
    },

    setSanidade(val) {
      if (currentFichaData) currentFichaData.sanidade = val;
      this.renderSanidade(val);
    },

    setYvero(fase) {
      // Só mestre pode alterar yvero (ou edição solo)
      if (currentMesa && !isMaster) return;
      if (currentFichaData) currentFichaData.yvero_fase = fase;
      document.querySelectorAll('.yvero-phase').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.fase) <= fase);
      });
      document.getElementById('yveroLabel').textContent = YVERO_FASES[fase].nome;
      document.getElementById('yveroDesc').textContent = YVERO_FASES[fase].desc;
    },

    rollAfinidade() {
      const roll = rollDice(100)[0];
      const success = roll > 40;
      const afEl = document.getElementById('f-afinidade-status');

      // Animação
      toast(`🎲 Afinidade Mágica: d100 = ${roll} ${success ? '✦ POSSUI!' : '✗ Não possui'}`, success ? 'success' : 'warning');

      if (success) {
        afEl.textContent = `✦ Possui (${roll})`;
        afEl.className = 'tag tag-gold';
        if (currentFichaData) currentFichaData.afinidade_magica = true;
      } else {
        afEl.textContent = `Sem Afinidade (${roll})`;
        afEl.className = 'tag tag-red';
        if (currentFichaData) currentFichaData.afinidade_magica = false;
      }
    },

    rollAttributes() {
      const rolls = rollDice(20, 6);
      toast(`🎲 6d20: [${rolls.join(', ')}]`, 'info');

      modal.open('Distribuir 6d20', `
        <p style="color:var(--text-muted);margin-bottom:16px">Resultados: <strong style="color:var(--gold)">${rolls.join(', ')}</strong></p>
        <p style="color:var(--text-muted);margin-bottom:16px;font-size:14px">Arraste os valores para os atributos ou clique pra aplicar em ordem:</p>
        ${ATRIBUTOS.map((nome, i) => `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <span style="width:120px;font-family:var(--font-display);font-size:14px;color:var(--text-muted)">${nome}</span>
            <select id="roll-attr-${i}" style="flex:1;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--gold);font-family:var(--font-mono);font-size:16px">
              <option value="">—</option>
              ${rolls.map(r => `<option value="${r}">${r} (mod ${calcMod(r) >= 0 ? '+' : ''}${calcMod(r)})</option>`).join('')}
            </select>
          </div>
        `).join('')}
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.fichas.applyRolledAttrs()">Aplicar</button>
      `);
    },

    applyRolledAttrs() {
      ATRIBUTOS_KEY.forEach((key, i) => {
        const val = document.getElementById('roll-attr-' + i).value;
        if (val) {
          const input = document.querySelector(`[data-attr="${key}"]`);
          if (input) input.value = val;
        }
      });
      this.onAttrChange();
      modal.close();
      toast('Atributos aplicados!', 'success');
    },

    onRaceChange() {
      const raca = document.getElementById('f-raca').value.trim();
      document.getElementById('fichaRaceTag').textContent = raca || '—';
      const sheet = document.getElementById('fichaSheet');
      Object.values(RACE_THEMES).forEach(t => sheet.classList.remove(t));
      // Aplicar tema se bater com raça conhecida (busca parcial)
      if (raca) {
        const racaLower = raca.toLowerCase();
        if (racaLower.includes('nuvolian')) sheet.classList.add(RACE_THEMES['Nuvolian']);
        else if (racaLower.includes('floresta') || racaLower.includes('eldryd da f')) sheet.classList.add(RACE_THEMES['Eldryd da Floresta']);
        else if (racaLower.includes('caos') || racaLower.includes('eldryd do c')) sheet.classList.add(RACE_THEMES['Eldryd do Caos']);
        else if (racaLower.includes('kragnir')) sheet.classList.add(RACE_THEMES['Kragnir']);
      }
    },

    renderPericias(data) {
      const grid = document.getElementById('skillsGrid');
      const pericias = (typeof data.pericias === 'string') ? JSON.parse(data.pericias || '{}') : (data.pericias || {});

      grid.innerHTML = PERICIAS.map(p => {
        const attrKey = p.attr;
        const attrVal = data[attrKey] || 10;
        const mod = calcMod(attrVal);
        const proficiente = pericias[p.nome] || false;
        const bonus = proficiente ? mod + 2 : mod; // +2 proficiência
        const bonusStr = bonus >= 0 ? '+' + bonus : '' + bonus;

        return `
          <div class="skill-row">
            <input type="checkbox" class="skill-check" data-skill="${p.nome}" ${proficiente ? 'checked' : ''} onchange="App.fichas.updatePericiasBonuses()">
            <span class="skill-name">${p.nome}</span>
            <span class="skill-bonus" data-skill-bonus="${p.nome}">${bonusStr}</span>
          </div>
        `;
      }).join('');
    },

    updatePericiasBonuses() {
      PERICIAS.forEach(p => {
        const attrInput = document.querySelector(`[data-attr="${p.attr}"]`);
        const attrVal = parseInt(attrInput?.value) || 10;
        const mod = calcMod(attrVal);
        const checkbox = document.querySelector(`[data-skill="${p.nome}"]`);
        const proficiente = checkbox?.checked || false;
        const bonus = proficiente ? mod + 2 : mod;
        const bonusStr = bonus >= 0 ? '+' + bonus : '' + bonus;
        const bonusEl = document.querySelector(`[data-skill-bonus="${p.nome}"]`);
        if (bonusEl) bonusEl.textContent = bonusStr;
      });
    },

    async loadAtaques(fichaId) {
      const ataques = await api.getAtaques(fichaId);
      const container = document.getElementById('ataquesContainer');
      if (!ataques.length) {
        container.innerHTML = '<p style="color:var(--text-dim);font-size:14px;font-style:italic">Nenhum ataque registrado</p>';
        return;
      }
      container.innerHTML = ataques.map(a => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:15px;color:var(--gold-light)">${esc(a.nome)}</div>
            <div style="font-size:13px;color:var(--text-muted)">${esc(a.tipo || '')} · ${esc(a.dano || '')} · ${esc(a.alcance || '')}</div>
            ${a.descricao ? `<div style="font-size:12px;color:var(--text-dim);margin-top:2px">${esc(a.descricao)}</div>` : ''}
            ${a.custo_energia ? `<span class="tag tag-blue" style="margin-top:4px">${esc(a.custo_energia)}</span>` : ''}
          </div>
          <button class="btn-icon" onclick="App.fichas.deleteAtaque(${a.id})" title="Remover">✕</button>
        </div>
      `).join('');
    },

    addAtaque() {
      if (!currentFicha) return;
      modal.open('Novo Ataque', `
        <div class="form-group"><label>Nome</label><input type="text" id="atk-nome"></div>
        <div class="form-row">
          <div class="form-group"><label>Tipo</label><input type="text" id="atk-tipo" placeholder="Físico, Mágico..."></div>
          <div class="form-group"><label>Dano</label><input type="text" id="atk-dano" placeholder="2d6+3"></div>
          <div class="form-group"><label>Alcance</label><input type="text" id="atk-alcance" placeholder="1 zona"></div>
        </div>
        <div class="form-group"><label>Custo de Energia</label><input type="text" id="atk-custo" placeholder="3 Mana"></div>
        <div class="form-group"><label>Descrição</label><textarea id="atk-desc" rows="2"></textarea></div>
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.fichas.saveAtaque()">Salvar</button>
      `);
    },

    async saveAtaque() {
      const data = {
        ficha_id: currentFicha,
        nome: document.getElementById('atk-nome').value.trim(),
        tipo: document.getElementById('atk-tipo').value.trim(),
        dano: document.getElementById('atk-dano').value.trim(),
        alcance: document.getElementById('atk-alcance').value.trim(),
        custo_energia: document.getElementById('atk-custo').value.trim(),
        descricao: document.getElementById('atk-desc').value.trim()
      };
      if (!data.nome) return toast('Nome do ataque obrigatório!', 'error');
      await api.createAtaque(data);
      modal.close();
      toast('Ataque adicionado!', 'success');
      this.loadAtaques(currentFicha);
    },

    async deleteAtaque(id) {
      await api.deleteAtaque(id);
      toast('Ataque removido', 'warning');
      this.loadAtaques(currentFicha);
    },

    renderInventario(data) {
      const inv = (typeof data.inventario === 'string') ? JSON.parse(data.inventario || '[]') : (data.inventario || []);
      const body = document.getElementById('inventarioBody');
      if (!inv.length) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);font-style:italic;padding:20px">Mochila vazia</td></tr>';
        return;
      }
      body.innerHTML = inv.map((item, i) => `
        <tr>
          <td>${esc(item.nome || '')}</td>
          <td style="font-family:var(--font-mono)">${item.qtd || 1}</td>
          <td style="font-family:var(--font-mono)">${item.peso || '—'}</td>
          <td style="color:var(--text-muted);font-size:13px">${esc(item.notas || '')}</td>
          <td><button class="btn-icon" onclick="App.fichas.removeItem(${i})" title="Remover">✕</button></td>
        </tr>
      `).join('');
    },

    addItem() {
      modal.open('Adicionar Item', `
        <div class="form-group"><label>Nome</label><input type="text" id="item-nome"></div>
        <div class="form-row">
          <div class="form-group"><label>Quantidade</label><input type="number" id="item-qtd" value="1" min="1"></div>
          <div class="form-group"><label>Peso</label><input type="text" id="item-peso" placeholder="1kg"></div>
        </div>
        <div class="form-group"><label>Notas</label><input type="text" id="item-notas" placeholder="Observações..."></div>
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.fichas.saveItem()">Adicionar</button>
      `);
    },

    saveItem() {
      const item = {
        nome: document.getElementById('item-nome').value.trim(),
        qtd: parseInt(document.getElementById('item-qtd').value) || 1,
        peso: document.getElementById('item-peso').value.trim(),
        notas: document.getElementById('item-notas').value.trim()
      };
      if (!item.nome) return toast('Nome do item obrigatório!', 'error');
      if (!currentFichaData.inventario) currentFichaData.inventario = [];
      if (typeof currentFichaData.inventario === 'string') currentFichaData.inventario = JSON.parse(currentFichaData.inventario);
      currentFichaData.inventario.push(item);
      this.renderInventario(currentFichaData);
      modal.close();
      toast('Item adicionado!', 'success');
    },

    removeItem(idx) {
      if (typeof currentFichaData.inventario === 'string') currentFichaData.inventario = JSON.parse(currentFichaData.inventario);
      currentFichaData.inventario.splice(idx, 1);
      this.renderInventario(currentFichaData);
      toast('Item removido', 'warning');
    },

    async save() {
      if (!currentFicha) return;

      // Coletar todos os dados do formulário
      const data = {
        nome: document.getElementById('f-nome').value.trim(),
        classe: document.getElementById('f-classe').value.trim(),
        raca: document.getElementById('f-raca').value,
        nivel: parseInt(document.getElementById('f-nivel').value) || 1,
        deslocamento_zonas: parseInt(document.getElementById('f-deslocamento').value) || 1,
        hp_atual: parseInt(document.getElementById('f-hp-atual').value) || 0,
        hp_max: parseInt(document.getElementById('f-hp-max').value) || 10,
        aura_atual: parseInt(document.getElementById('f-aura-atual').value) || 0,
        mana_atual: parseInt(document.getElementById('f-mana-atual').value) || 0,
        mana_max: parseInt(document.getElementById('f-mana-max').value) || 0,
        prana_atual: parseInt(document.getElementById('f-prana-atual').value) || 0,
        prana_max: parseInt(document.getElementById('f-prana-max').value) || 0,
        sanidade: currentFichaData?.sanidade ?? 10,
        yvero_fase: currentFichaData?.yvero_fase ?? 0,
        moeda_cobre: parseInt(document.getElementById('f-moeda-cobre').value) || 0,
        moeda_prata: parseInt(document.getElementById('f-moeda-prata').value) || 0,
        moeda_ouro: parseInt(document.getElementById('f-moeda-ouro').value) || 0,
        moeda_platina: parseInt(document.getElementById('f-moeda-platina').value) || 0,
        afinidade_magica: currentFichaData?.afinidade_magica || false,
        notas: document.getElementById('f-notas').value + '|||TRAITS|||' + document.getElementById('f-traits').value + '|||COND|||' + document.getElementById('f-condicoes').value
      };

      // Atributos
      ATRIBUTOS_KEY.forEach(key => {
        const input = document.querySelector(`[data-attr="${key}"]`);
        data[key] = parseInt(input?.value) || 10;
      });

      // Recalc aura max
      data.aura_max = calcAura(data.carisma, data.inteligencia);

      // Pericias
      const pericias = {};
      document.querySelectorAll('.skill-check').forEach(cb => {
        if (cb.checked) pericias[cb.dataset.skill] = true;
      });
      data.pericias = pericias;

      // Inventário
      data.inventario = currentFichaData?.inventario || [];

      await api.updateFicha(currentFicha, data);
      toast('Ficha salva!', 'success');
      document.getElementById('fichaEditorName').textContent = data.nome;
    },

    async deleteCurrent() {
      if (!currentFicha) return;
      const nome = currentFichaData?.nome || 'esta ficha';
      if (!confirm('Excluir "' + nome + '"? Essa ação não pode ser desfeita!')) return;
      await api.deleteFicha(currentFicha);
      toast('Ficha excluída', 'warning');
      this.closeEditor();
    },

    closeEditor() {
      currentFicha = null;
      currentFichaData = null;
      document.getElementById('fichaEditor').style.display = 'none';
      document.getElementById('fichasGrid').style.display = '';
      if (currentMesa) {
        mesas.loadTab('jogadores');
      } else {
        this.load();
      }
    }
  };

  // ══════════════════════════════════════
  // BESTIÁRIO
  // ══════════════════════════════════════
  const bestiario = {
    async load() {
      const data = await api.getFichas({ tipo: 'monstro' });
      const grid = document.getElementById('bestiarioGrid');

      if (!data.length) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🐉</div><p>Nenhum monstro catalogado</p></div>';
        return;
      }

      grid.innerHTML = data.map(m => mesas.renderMonsterCard(m)).join('');
    },

    openCreate(mesaId = null) {
      if (!auth.requireLogin()) return;
      modal.open('Novo Monstro', `
        <div class="form-group"><label>Nome</label><input type="text" id="mon-nome" placeholder="Nome da criatura"></div>
        <div class="form-row">
          <div class="form-group"><label>CR (Nível de Desafio)</label><input type="text" id="mon-cr" placeholder="1/4, 1, 5..."></div>
          <div class="form-group"><label>HP</label><input type="number" id="mon-hp" value="10" min="1"></div>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-family:var(--font-display);font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Atributos</label>
          <div class="attr-grid">
            ${ATRIBUTOS.map((nome, i) => `
              <div class="attr-box" style="padding:10px 8px">
                <div class="attr-name">${nome.substring(0,3)}</div>
                <input type="number" class="attr-input" id="mon-${ATRIBUTOS_KEY[i]}" value="10" min="1" max="30" style="font-size:18px">
              </div>
            `).join('')}
          </div>
        </div>
        <div class="form-group"><label>Drops / Loot</label><input type="text" id="mon-drops" placeholder="3 Po, Espada Yvero..."></div>
        <div class="form-group"><label>Descrição</label><textarea id="mon-desc" rows="3" placeholder="Comportamento, habitat, fraquezas..."></textarea></div>
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.bestiario.create(${mesaId})">Criar Monstro</button>
      `);
    },

    async create(mesaId = null) {
      const nome = document.getElementById('mon-nome').value.trim();
      if (!nome) return toast('Nome obrigatório!', 'error');

      const hp = parseInt(document.getElementById('mon-hp').value) || 10;
      const data = {
        mesa_id: mesaId,
        tipo: 'monstro',
        nome,
        cr: document.getElementById('mon-cr').value.trim(),
        hp_max: hp, hp_atual: hp,
        drops: document.getElementById('mon-drops').value.trim(),
        descricao: document.getElementById('mon-desc').value.trim(),
        nivel: 1, raca: 'Monstro', classe: 'Criatura',
        sanidade: 10, yvero_fase: 0,
        pericias: {}, inventario: [],
        afinidade_magica: false, deslocamento_zonas: 1
      };

      ATRIBUTOS_KEY.forEach(key => {
        data[key] = parseInt(document.getElementById('mon-' + key)?.value) || 10;
      });

      data.aura_max = calcAura(data.carisma, data.inteligencia);
      data.aura_atual = data.aura_max;

      await api.createFicha(data);
      modal.close();
      toast('Monstro criado!', 'success');

      if (currentMesa) {
        mesas.loadTab('monstros');
      } else {
        this.load();
      }
    }
  };

  // ══════════════════════════════════════
  // SESSÕES & DIÁRIO
  // ══════════════════════════════════════
  const sessoes = {
    async loadMesas() {
      const data = await api.getMesas();
      const sel = document.getElementById('sessaoMesaSelect');
      sel.innerHTML = '<option value="">Selecione uma mesa...</option>' +
        data.map(m => `<option value="${m.id}">${esc(m.nome)} [${esc(m.codigo)}]</option>`).join('');
    },

    async loadForMesa() {
      const mesaId = document.getElementById('sessaoMesaSelect').value;
      if (!mesaId) {
        document.getElementById('sessoesContent').style.display = 'none';
        return;
      }
      document.getElementById('sessoesContent').style.display = 'block';
      const data = await api.getSessoes(mesaId);
      const list = document.getElementById('sessoesList');

      if (!data.length) {
        list.innerHTML = '<div class="empty-state"><p>Nenhuma sessão registrada</p></div>';
        return;
      }

      list.innerHTML = data.map(s => `
        <div class="card" style="margin-bottom:12px;cursor:pointer" onclick="App.sessoes.viewDiario(${s.id}, '${esc(s.titulo || 'Sessão ' + s.numero)}')">
          <div class="card-header">
            <span class="card-title">Sessão ${s.numero}${s.titulo ? ' — ' + esc(s.titulo) : ''}</span>
            <span class="card-meta">${s.data_sessao || ''}</span>
          </div>
          <p style="color:var(--text-muted);font-size:14px">${esc(s.resumo || 'Sem resumo')}</p>
        </div>
      `).join('');
    },

    openCreate() {
      const mesaId = document.getElementById('sessaoMesaSelect').value;
      if (!mesaId) return toast('Selecione uma mesa primeiro', 'error');
      this.openCreateForMesa(mesaId);
    },

    openCreateForMesa(mesaId) {
      modal.open('Nova Sessão', `
        <div class="form-row">
          <div class="form-group"><label>Número</label><input type="number" id="ses-numero" value="1" min="1"></div>
          <div class="form-group"><label>Data</label><input type="date" id="ses-data"></div>
        </div>
        <div class="form-group"><label>Título</label><input type="text" id="ses-titulo" placeholder="Título da sessão"></div>
        <div class="form-group"><label>Resumo</label><textarea id="ses-resumo" rows="4" placeholder="O que aconteceu..."></textarea></div>
      `, `
        <button class="btn btn-outline" onclick="App.modal.close()">Cancelar</button>
        <button class="btn btn-gold" onclick="App.sessoes.create(${mesaId})">Criar Sessão</button>
      `);
    },

    async create(mesaId) {
      const data = {
        mesa_id: mesaId,
        numero: parseInt(document.getElementById('ses-numero').value) || 1,
        titulo: document.getElementById('ses-titulo').value.trim(),
        data_sessao: document.getElementById('ses-data').value,
        resumo: document.getElementById('ses-resumo').value.trim()
      };
      await api.createSessao(data);
      modal.close();
      toast('Sessão criada!', 'success');
      if (currentMesa) {
        mesas.loadTab('diario');
      } else {
        this.loadForMesa();
      }
    },

    async viewDiario(sessaoId, titulo) {
      const entries = await api.getDiario(sessaoId);
      const tipoIcons = { narrativa: '📖', combate: '⚔️', loot: '💰', nota: '📝' };

      modal.open('Diário — ' + titulo, `
        <div id="diarioEntries">
          ${entries.length ? entries.map(e => `
            <div style="padding:12px 0;border-bottom:1px solid var(--border)">
              <span class="tag ${e.tipo === 'combate' ? 'tag-red' : e.tipo === 'loot' ? 'tag-green' : 'tag-gold'}" style="margin-bottom:6px">
                ${tipoIcons[e.tipo] || '📝'} ${e.tipo}
              </span>
              <p style="margin-top:6px;font-size:15px;color:var(--text)">${esc(e.conteudo)}</p>
              <span class="card-meta">${new Date(e.created_at).toLocaleString('pt-BR')}</span>
            </div>
          `).join('') : '<p style="color:var(--text-dim);font-style:italic">Nenhuma entrada ainda</p>'}
        </div>
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
          <div class="form-row">
            <div class="form-group">
              <label>Tipo</label>
              <select id="diario-tipo" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-body)">
                <option value="narrativa">📖 Narrativa</option>
                <option value="combate">⚔️ Combate</option>
                <option value="loot">💰 Loot</option>
                <option value="nota">📝 Nota</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Conteúdo</label>
            <textarea id="diario-conteudo" rows="3" placeholder="O que aconteceu..."></textarea>
          </div>
          <button class="btn btn-sm btn-gold" onclick="App.sessoes.addDiarioEntry(${sessaoId}, '${esc(titulo)}')">Adicionar Entrada</button>
        </div>
      `, '');
    },

    async addDiarioEntry(sessaoId, titulo) {
      const tipo = document.getElementById('diario-tipo').value;
      const conteudo = document.getElementById('diario-conteudo').value.trim();
      if (!conteudo) return toast('Escreva algo!', 'error');
      await api.createDiario({ sessao_id: sessaoId, tipo, conteudo });
      toast('Entrada adicionada!', 'success');
      this.viewDiario(sessaoId, titulo);
    }
  };

  // ══════════════════════════════════════
  // DICE ROLLER
  // ══════════════════════════════════════
  const dice = {
    init() {
      const toggle = document.getElementById('diceToggle');
      const panel = document.getElementById('dicePanel');

      toggle.addEventListener('click', () => {
        panel.classList.toggle('open');
      });

      document.querySelectorAll('.dice-type').forEach(btn => {
        btn.addEventListener('click', () => {
          const d = btn.dataset.dice;
          if (d === 'custom') {
            document.getElementById('diceCustom').classList.toggle('hidden');
            btn.classList.toggle('selected');
            return;
          }
          this.roll(parseInt(d));
        });
      });
    },

    roll(sides, qty = 1) {
      const resultEl = document.getElementById('diceResult');
      const detailEl = document.getElementById('diceDetail');

      // Animação de rolagem
      resultEl.classList.add('rolling');
      let frames = 0;
      const anim = setInterval(() => {
        resultEl.textContent = Math.floor(Math.random() * sides) + 1;
        frames++;
        if (frames > 10) {
          clearInterval(anim);
          resultEl.classList.remove('rolling');

          // Resultado real
          const results = rollDice(sides, qty);
          const total = results.reduce((a, b) => a + b, 0);
          resultEl.textContent = total;

          if (qty > 1) {
            detailEl.textContent = `${qty}d${sides}: [${results.join(', ')}] = ${total}`;
          } else {
            detailEl.textContent = `d${sides}`;
          }

          // Histórico
          diceHistory.unshift(`${qty}d${sides}=${total}`);
          if (diceHistory.length > 10) diceHistory.pop();
          this.renderHistory();

          // Sound effect via Web Audio API
          this.playDiceSound();
        }
      }, 50);
    },

    rollCustom() {
      const qty = parseInt(document.getElementById('diceQty').value) || 1;
      const sides = parseInt(document.getElementById('diceSides').value) || 6;
      this.roll(sides, qty);
    },

    renderHistory() {
      const el = document.getElementById('diceHistory');
      el.innerHTML = diceHistory.map(h => `<span class="dice-history-item">${h}</span>`).join('');
    },

    playDiceSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Clack sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
        // Second tap
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.setValueAtTime(600, ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
          gain2.gain.setValueAtTime(0.2, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.1);
        }, 60);
      } catch (e) { /* no audio api */ }
    }
  };

  // ══════════════════════════════════════
  // MAPA INTERATIVO
  // ══════════════════════════════════════
  function initMap() {
    const tooltip = document.getElementById('mapTooltip');

    document.querySelectorAll('.map-region').forEach(region => {
      region.addEventListener('mouseenter', (e) => {
        const data = MAP_REGIONS[region.dataset.region];
        if (!data) return;
        tooltip.innerHTML = `
          <div style="font-family:var(--font-display);font-size:16px;color:${data.cor};margin-bottom:8px">${data.nome}</div>
          <p style="font-size:14px;color:var(--text-muted);line-height:1.5">${data.desc}</p>
        `;
        tooltip.style.left = (e.offsetX + 20) + 'px';
        tooltip.style.top = (e.offsetY - 10) + 'px';
        tooltip.classList.add('visible');
      });

      region.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });

      region.addEventListener('click', () => {
        const data = MAP_REGIONS[region.dataset.region];
        if (!data) return;
        modal.open(data.nome, `<p style="font-size:16px;line-height:1.8;color:var(--text)">${data.desc}</p>`, '');
      });
    });
  }

  // ══════════════════════════════════════
  // UTILITÁRIOS
  // ══════════════════════════════════════
  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  // ══════════════════════════════════════
  // INIT
  // ══════════════════════════════════════
  function init() {
    // Check DB health
    api.checkHealth();
    setInterval(() => api.checkHealth(), 30000);

    // Navegação
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(el.dataset.nav);
      });
    });

    // Mobile menu toggle
    document.getElementById('navToggle').addEventListener('click', () => {
      document.getElementById('navLinks').classList.toggle('open');
    });

    // Nav scroll effect
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
    });

    // Mesa tabs
    document.querySelectorAll('.mesa-tab').forEach(tab => {
      tab.addEventListener('click', () => mesas.loadTab(tab.dataset.mesaTab));
    });

    // Close modal on overlay click
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) modal.close();
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.close();
    });

    // Dice roller
    dice.init();

    // Map
    initMap();

    // Auth UI
    auth.updateUI();

    // Hidden class
    const style = document.createElement('style');
    style.textContent = '.hidden { display: none !important; }';
    document.head.appendChild(style);
  }

  // Run on load
  document.addEventListener('DOMContentLoaded', init);

  // ── API pública ──
  return {
    navigate,
    auth,
    mesas,
    fichas,
    bestiario,
    sessoes,
    dice,
    modal,
    toast
  };
})();
