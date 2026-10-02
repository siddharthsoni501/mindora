# 🧠 MINDORA — Private Personal AI Platform

<div align="center">

![MINDORA Banner](https://img.shields.io/badge/MINDORA-Private%20Personal%20AI-8b5cf6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNWwtNS01IDEuNDEtMS40MUwxMCAxNC4xN2w3LjU5LTcuNTlMMTkgOGwtOSA5eiIvPjwvc3ZnPg==)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Your AI remembers. You own the memory.**

A private, secure personal AI platform with persistent, structured, user-owned memory.

[🚀 Live Demo](https://mindora-web.vercel.app) · [📖 Docs](#documentation) · [🐛 Issues](https://github.com/siddharthsoni501/mindora/issues)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Persistent Memory** | Three memory types: Facts, Episodes, and Skills — remembered across every conversation |
| 🔐 **You Own Your Data** | Memories stored locally in your browser. Export, edit, or delete any time |
| ⚡ **Intelligent Routing** | Auto-routes to fast or reasoning models based on query complexity |
| 🛠️ **Skills & Automations** | Save workflows as reusable skills and automate repetitive tasks |
| 🔍 **Memory Center** | Full visibility into every memory — see sources, edit, or disable any fact |
| 🛡️ **Privacy First** | Sensitive data is never auto-stored. You approve before anything is saved |

---

## 🖼️ Screenshots

| Landing Page | Chat Interface | Memory Center |
|:---:|:---:|:---:|
| Beautiful dark UI with glassmorphism effects | Real-time AI chat with memory context | Full control over all stored memories |

---

## 🏗️ Project Structure

```
mindora/
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx        # Landing page
│   │   │   │   ├── chat/           # AI chat interface
│   │   │   │   ├── dashboard/      # User dashboard
│   │   │   │   ├── memory/         # Memory management
│   │   │   │   ├── skills/         # Skills manager
│   │   │   │   ├── tools/          # Tool permissions
│   │   │   │   └── api/            # API routes
│   │   │   ├── components/         # Reusable components
│   │   │   └── lib/                # Utilities & store
│   │   └── package.json
│   └── api/                    # Python FastAPI backend (optional)
│       ├── main.py
│       └── pyproject.toml
└── packages/
    ├── memory/                 # Memory engine
    ├── models/                 # AI model interfaces
    ├── skills/                 # Skills system
    └── tools/                  # Tool integrations
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/siddharthsoni501/mindora.git
cd mindora

# Install dependencies
cd apps/web
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment (Vercel)

The web app is configured for one-click Vercel deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/siddharthsoni501/mindora&root=apps/web)

### Manual Deployment

```bash
cd apps/web
npx vercel --prod
```

---

## 🛠️ Tech Stack

### Frontend
- **[Next.js 14](https://nextjs.org)** — React framework with App Router
- **[TypeScript](https://typescriptlang.org)** — Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com)** — Utility-first styling
- **[Lucide React](https://lucide.dev)** — Beautiful icons

### Backend (Optional)
- **[FastAPI](https://fastapi.tiangolo.com)** — High-performance Python API
- **[SQLAlchemy](https://sqlalchemy.org)** — Database ORM
- **[Alembic](https://alembic.sqlalchemy.org)** — Database migrations

### AI / Models
- **NVIDIA NIM** — Nemotron model family
- **Nebius AI** — Model hosting and inference
- Smart routing between fast and reasoning models

---

## 🧠 Memory System

MINDORA uses a three-tier memory architecture:

```
┌─────────────────────────────────────────────────────┐
│                    MINDORA MEMORY                   │
├───────────────┬──────────────────┬──────────────────┤
│     FACT      │     EPISODE      │      SKILL       │
│               │                  │                  │
│ User prefs,   │ Past events,     │ Saved workflows, │
│ personal info │ completed tasks  │ automations      │
│               │                  │                  │
│ "Prefers      │ "Completed       │ "Weekly plan:    │
│  concise      │  Python project  │  calendar →      │
│  responses"   │  on Oct 1"       │  prioritize"     │
└───────────────┴──────────────────┴──────────────────┘
```

All memories are:
- ✅ Stored locally in your browser
- ✅ Filterable and searchable
- ✅ Editable and deletable
- ✅ Confidence-scored
- ✅ Source-tracked

---

## ⚙️ Environment Variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|----------|-------------|----------|
| `NEBIUS_API_KEY` | Nebius AI API key for model access | Yes |
| `DATABASE_URL` | Database connection string | No (SQLite default) |
| `MINDORA_ENCRYPTION_KEY` | Encryption key for sensitive data | Yes |
| `REDIS_URL` | Redis for caching (optional) | No |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

---

<div align="center">

**Built with ❤️ for people who value privacy.**

[⬆ Back to top](#-mindora--private-personal-ai-platform)

</div>
