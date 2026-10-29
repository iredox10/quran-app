<div align="center">
  <img src="https://quran-nur.appwrite.network/icon-512x512.png" alt="Quran Nur Logo" width="150" />
  <h1>Quran Nur 🌙</h1>
  <p><strong>Illuminate your heart. A beautifully designed companion for reading, listening, and studying the Quran.</strong></p>

  <p>
    <a href="https://quran-nur.appwrite.network/"><strong>Visit the App</strong></a> ·
    <a href="#features"><strong>Features</strong></a> ·
    <a href="#installation"><strong>Installation</strong></a> ·
    <a href="CONTRIBUTING.md"><strong>Contributing</strong></a>
  </p>
</div>

---

## 📖 About Quran Nur

**Quran Nur** is a modern, premium, Progressive Web Application (PWA) designed to provide the most beautiful and seamless Quran reading experience on the web. It aims to help Muslims worldwide build and track their daily Quran reading habits with elegant design and rich features.

Built with **React**, **Tailwind CSS**, and **Heroku Postgres**, the app works fully offline and syncs across your devices seamlessly.

---

## ✨ Features

- 📖 **Authentic Reading Experience:** Read the Quran in standard Madani, Indopak, or Tajweed styles.
- 🎨 **Beautiful UI:** A premium, fully responsive design with a calming color palette and micro-animations.
- 🎧 **High-Quality Recitations:** Listen to verses with auto-scrolling synchronization and playback controls.
- 📱 **Progressive Web App (PWA):** Install it on your phone or desktop for an app-like experience.
- 📶 **Fully Offline Mode:** Download chapters, pages, and audio packs for reliable reading without internet.
- 🗓️ **Personalized Planners:** Set your reading goals (e.g., read the whole Quran in 30 days) and track daily progress.
- 👥 **Group Reading (Sauka):** Create or join groups to distribute reading parts (Juz) among friends or community members.
- ☁️ **Cross-Device Sync:** Seamlessly sync your bookmarks, plans, and progress across all your devices using the Heroku API.

---

## 🛠 Tech Stack

- **Frontend:** React 18, Vite, React Router, Zustand (State Management), React Query, Framer Motion
- **Styling:** Tailwind CSS, PostCSS
- **Backend & Auth:** Hono/TypeScript on Heroku with Heroku Postgres
- **Data Source:** Quran.com API

---

## 🚀 Installation & Local Development

Want to run the app locally and contribute? It's easy!

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) (Optional but recommended for faster installs)
- Access to the Quran Nur API, or a local copy of the companion `quran-backend` project

### 1. Clone the repository
```bash
git clone https://github.com/iredox10/quran-app.git
cd quran-app
```

### 2. Install dependencies
```bash
bun install
# or
npm install
```

### 3. Setup Environment Variables
Duplicate the `.env.example` file and rename it to `.env`:
```bash
cp .env.example .env
```
The browser uses the deployed Heroku API by default. `.env.production` contains
only the public API origin:

```env
VITE_API_BASE_URL=https://qurannur-backend-d7d7312f118d.herokuapp.com
```

Appwrite is no longer used for browser authentication, sync, group documents,
realtime subscriptions, or voice-note storage. Its existing static-site hosting
can remain in place. The retired `VITE_USE_RENDER_API` switch is ignored;
there is no silent fallback to the old data service. Server/admin keys must
never be put in `VITE_*` settings.

See [docs/heroku-cutover.md](docs/heroku-cutover.md) for deployment, migration,
validation, and session behavior.

## 🤝 Contributing

We welcome contributions from the community! Whether it's fixing a bug, improving the UI, or adding a new feature, your help is appreciated.

Please read our [Contributing Guidelines](CONTRIBUTING.md) to learn about our development process, how to propose bug fixes, and how to build features.

Please also review our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

This project is open-sourced software licensed under the [MIT license](LICENSE).

---

<div align="center">
  <sub>Made with ❤️ for the Ummah.</sub>
</div>
