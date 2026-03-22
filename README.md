# ⚔️ Nuvolish RPG — Sistema do Tephero

Sistema web completo para o RPG Nuvolish: fichas de personagem, mesas de jogo, bestiário, rolador de dados e muito mais.

## 🚀 Rodar o projeto

```bash
# 1. Instalar dependências
npm install

# 2. Rodar (funciona SEM MySQL — usa localStorage como fallback)
npm start

# 3. Abrir no navegador
http://localhost:3000
```

## 🗄️ MySQL (opcional)

Se quiser persistência no servidor:

```bash
# 1. Criar o banco
mysql -u root -p < schema.sql

# 2. Configurar variáveis de ambiente (opcional)
export DB_HOST=localhost
export DB_USER=root
export DB_PASS=sua_senha
export DB_NAME=nuvolish_rpg

# 3. Rodar
npm start
```

O sistema detecta automaticamente se o MySQL está disponível. Se não estiver, usa `localStorage` no navegador.

## 📋 Funcionalidades

### Seções
- **Hero** — Tela inicial com navegação
- **Lore** — História de Core, Lilin, Hystéria, Yvero
- **Mapa** — Mapa interativo de Core com regiões clicáveis
- **Mesas** — Criar mesa com código, adicionar jogadores e monstros
- **Fichas** — Ficha completa de personagem (atributos, energias, perícias, inventário)
- **Bestiário** — Criar/editar fichas de monstro com CR e drops
- **Sessões** — Diário de sessão com tipos (narrativa, combate, loot, nota)

### Sistema Nuvolish
- **3 Energias**: Aura, Mana, Prana
- **Aura** = 8 + mod CAR + mod INT (calculado automaticamente)
- **Afinidade Mágica**: 1d100 > 40
- **Sanidade**: 10 pontos, 5 estágios (Estável → Quebra Mental)
- **Atributos**: 1-30 com tabela de modificadores completa
- **Contaminação Yvero**: 6 fases (Limpo → Transformação Total)
- **19 Perícias** com bônus automático por atributo
- **4 Moedas**: Cobre, Prata, Ouro, Platina
- **Deslocamento em Zonas**
- **Temas visuais por raça**: Nuvolian, Eldryd (Floresta/Caos), Kragnir
- **Rolador de dados** com som e histórico

### Técnico
- SPA (Single Page Application) sem framework
- Backend Node.js + Express
- Fallback localStorage quando MySQL está offline
- CSS dark+gold theme totalmente responsivo
- Som de dados via Web Audio API

## 📁 Estrutura

```
nuvolish-rpg/
├── server.js          # Backend Express + API
├── schema.sql         # Schema MySQL
├── package.json
├── README.md
└── public/
    ├── index.html     # SPA principal
    ├── css/
    │   └── style.css  # Theme dark+gold
    └── js/
        └── app.js     # Toda a lógica frontend
```

## ⚙️ Raças oficiais
- **Nuvolians** — Nativos das cidades flutuantes de Hystéria
- **Eldryds da Floresta** — Seres de Lilin conectados à natureza
- **Eldryds do Caos** — Linhagem corrompida pelo Yvero
- **Kragnir** — Forjadores das profundezas montanhosas

---

*Sistema criado por Tephero. Desenvolvido por Eytor.*
