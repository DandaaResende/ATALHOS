# 🚌 Atalhos — O aplicativo que encurta seu percurso

> **Mais do que indicar caminhos, queremos ajudar cada passageiro a decidir com previsibilidade como chegar ao seu destino.**

O **Atalhos** é uma plataforma inteligente de mobilidade urbana voltada ao transporte público coletivo (inicialmente na Região Metropolitana do Recife). O sistema combina um motor de rotas baseado em dados abertos no formato **GTFS**, integração com mapas interativos, rastreamento em tempo real por **GPS**, e um assistente conversacional movido a **Inteligência Artificial (Google Gemini)** para planejar trajetos, consultar horários e coletar avaliações colaborativas dos passageiros.

---

## 📋 Sumário

- [Visão Geral e Funcionalidades](#-visão-geral-e-funcionalidades)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Como Rodar o Projeto](#-como-rodar-o-projeto)
  - [1. Configurando e Rodando o Backend (Django)](#1-configurando-e-rodando-o-backend-django)
  - [2. Configurando e Rodando o Frontend (React + Vite)](#2-configurando-e-rodando-o-frontend-react--vite)
- [Endpoints Principais da API](#-endpoints-principais-da-api)
- [Testes e Qualidade](#-testes-e-qualidade)

---

## 🎯 Visão Geral e Funcionalidades

### 1. Planejamento Inteligente de Trajetos
- Sugestão de rotas **diretas** e **com integração** (baldeações entre linhas).
- Cálculo de distâncias de caminhada inicial, transbordo e final.
- Apresentação de horários estimados de saída e chegada, paradas intermediárias e tempo total de percurso.

### 2. Assistente Conversacional com IA (Google Gemini)
- O usuário pode digitar perguntas em linguagem natural (ex.: *"Como vou do Shopping Recife ao Derby após as 18h?"*).
- O agente interpreta intenção, origem, destino, preferências e horários, acionando a busca de rotas diretamente.

### 3. Mapa Interativo e Navegação em Tempo Real
- Mapa com OpenStreetMap e Leaflet.
- Rastreamento da localização do usuário com indicador de direção (*heading*) e bússola.
- Traçado colorido com halo destacando exatamente o trecho a bordo do ônibus e linhas tracejadas para caminhadas.
- Modo de acompanhamento ativo com centralização automática (*auto-follow*).

### 4. Pins de Paradas de Ônibus Interativas (Tela do Ponto)
- Visualização de paradas de ônibus diretamente no mapa com marcadores estilizados.
- Ao clicar no pin ou no atalho rápido, abre a **Tela do Ponto de Ônibus**:
  - Distância e tempo de caminhada estimados em relação à posição do usuário via GPS.
  - Botão de favoritar parada.
  - Lista de ônibus previstos com número da linha, itinerário e tempo restante em minutos.
  - Indicadores visuais de acessibilidade para cadeirantes ♿ e ar-condicionado ❄️.

### 5. Avaliação Colaborativa de Ônibus (Tela do Ônibus)
- Ao clicar no botão de informações `(i)` de uma linha na parada, abre a tela de feedback:
  - Confirmação de pontualidade (*Sim*, *Não*, *Não sei*).
  - Nível de lotação (*Cheio*, *Moderado*, *Vazio*, *Não sei*).
  - Campo de observação aberta sobre motorista, conservação e trajeto.
  - Persistência e confirmação de envio para retroalimentar a comunidade.

---

## 🛠️ Tecnologias Utilizadas

### Backend
| Tecnologia | Finalidade |
|---|---|
| **Python 3.12+** | Linguagem principal do backend |
| **Django 5.2** | Framework web robusto e estruturado |
| **Django REST Framework** | Criação de APIs RESTful e serialização |
| **Google Gemini API (`google-genai`)** | Modelo de linguagem para o assistente conversacional |
| **GTFS (General Transit Feed Specification)** | Leitura e processamento de dados reais de linhas, viagens, horários e paradas |
| **Nominatim / OpenStreetMap** | Geocodificação e autocomplete de endereços e pontos de interesse |
| **SQLite** | Banco de dados padrão leve para persistência |

### Frontend
| Tecnologia | Finalidade |
|---|---|
| **React 19** | Biblioteca para construção da interface de usuário |
| **TypeScript** | Tipagem estática e segurança no desenvolvimento |
| **Vite** | Bundler e ambiente de desenvolvimento ultrarrápido |
| **Tailwind CSS v4** | Estilização moderna através de utility classes |
| **Leaflet & @types/leaflet** | Renderização e manipulação do mapa interativo |
| **Lucide React** | Pacote de ícones SVG limpos e consistentes |
| **React Router v7** | Roteamento declarativo de páginas |

---

## 📂 Estrutura do Projeto

```text
ATALHOS/
├── backend/
│   ├── config/             # Configurações do projeto Django (settings, urls, asgi, wsgi)
│   ├── dados/
│   │   └── gtfs/           # Arquivos de dados abertos do transporte público (stops, routes, trips, shapes...)
│   ├── ia/                 # Aplicativo de Inteligência Artificial (prompts, services, views)
│   ├── rotas/              # Aplicativo de cálculo de rotas, itinerários e GTFS
│   ├── db.sqlite3          # Banco de dados SQLite local
│   └── manage.py           # Utilitário CLI do Django
│
├── frontend/
│   └── atalhos-front/
│       ├── src/
│       │   ├── assets/     # Imagens e vetores estáticos
│       │   ├── components/ # Componentes (MapaInterativo, CardPontoOnibus, CardAvaliacaoOnibus, etc.)
│       │   ├── hooks/      # Hooks customizados (useGeolocalizacao)
│       │   ├── pages/      # Telas (Home, Login, Cadastro, Perfil)
│       │   ├── services/   # Integração com APIs e armazenamento (api.ts, paradasService.ts)
│       │   ├── types/      # Definições TypeScript (parada.ts, ia.ts)
│       │   └── utils/      # Funções utilitárias (geo.ts - Haversine)
│       ├── package.json    # Dependências e scripts do frontend
│       └── vite.config.ts  # Configuração do Vite com proxy para o backend
│
├── .env.example            # Exemplo das variáveis de ambiente necessárias
├── requirements.txt        # Dependências Python do backend
└── README.md               # Este documento
```

---

## ⚙️ Pré-requisitos

Antes de iniciar, certifique-se de ter instalado em sua máquina:
- **Python 3.12** ou superior (verifique com `python --version`)
- **Node.js 18** ou superior e gerenciador de pacotes **npm** (verifique com `node -v` e `npm -v`)
- **Git** para clonar o repositório
- Uma chave de API do **Google Gemini** ([obtenha gratuitamente no Google AI Studio](https://aistudio.google.com/))

---

## 🚀 Como Rodar o Projeto

### 1. Configurando e Rodando o Backend (Django)

1. **Abra o terminal** e navegue até a raiz do repositório:
   ```bash
   cd c:\Users\Heloi\Documents\projetos\ATALHOS
   ```

2. **Crie e ative um ambiente virtual:**
   - No Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   - No Linux/macOS:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Instale as dependências do Python:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto (ou dentro da pasta `backend/`) copiando o modelo de `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Abra o arquivo `.env` e preencha suas variáveis:
   ```env
   SECRET_KEY=sua-chave-secreta-django
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   GEMINI_API_KEY=sua-chave-api-gemini-aqui
   ```

5. **Execute as migrações do banco de dados:**
   ```bash
   python backend/manage.py migrate
   ```

6. **Inicie o servidor de desenvolvimento do Django:**
   ```bash
   python backend/manage.py runserver 8000
   ```
   O backend estará acessível em `http://127.0.0.1:8000/`.

---

### 2. Configurando e Rodando o Frontend (React + Vite)

Em uma **nova janela do terminal**:

1. **Navegue até a pasta do frontend:**
   ```bash
   cd c:\Users\Heloi\Documents\projetos\ATALHOS\frontend\atalhos-front
   ```

2. **Instale as dependências do Node.js:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento do Vite:**
   ```bash
   npm run dev
   ```

4. **Acesse no navegador:**
   Abra o endereço indicado pelo Vite, normalmente:
   ```text
   http://localhost:5173/
   ```

> 💡 **Nota sobre Comunicação:** O Vite já está configurado via `vite.config.ts` com **proxy automático** para redirecionar chamadas iniciadas em `/rotas` e `/api` diretamente para `http://127.0.0.1:8000`, evitando qualquer problema de CORS em ambiente de desenvolvimento local.

---

## 📡 Endpoints Principais da API

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/rotas/buscar/?origem=...&destino=...` | Busca de rotas com base em nomes ou coordenadas (`origem_latitude`, `origem_longitude`, etc.) |
| `GET` | `/rotas/api/locais/sugestoes/?q=...` | Autocomplete de locais e bairros usando Nominatim |
| `GET` | `/rotas/api/linhas/<codigo>/itinerario/` | Retorna o itinerário e paradas completas de uma linha |
| `GET` | `/rotas/api/paradas/` | Lista todas as paradas cadastradas no GTFS |
| `POST` | `/api/ia/consultar/` | Envia mensagem em linguagem natural e retorna intenção, origem e destino inferidos pelo Gemini |

---

## 🧪 Testes e Qualidade

- **Executar testes do módulo de IA:**
  ```bash
  python backend/manage.py test ia
  ```
- **Executar testes do módulo de Rotas:**
  ```bash
  python backend/manage.py test rotas
  ```
- **Verificar integridade do Django:**
  ```bash
  python backend/manage.py check
  ```
- **Testar build do Frontend:**
  ```bash
  cd frontend/atalhos-front
  npm run build
  ```

---

<div align="center">
  <sub>Desenvolvido com foco em acessibilidade e inovação na mobilidade urbana.</sub>
</div>
