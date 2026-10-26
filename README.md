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

Built with **React**, **Tailwind CSS**, and **Appwrite**, the app works fully offline and syncs across your devices seamlessly.

---

## ✨ Features

- 📖 **Authentic Reading Experience:** Read the Quran in standard Madani, Indopak, or Tajweed styles.
- 🎨 **Beautiful UI:** A premium, fully responsive design with a calming color palette and micro-animations.
- 🎧 **High-Quality Recitations:** Listen to verses with auto-scrolling synchronization and playback controls.
- 📱 **Progressive Web App (PWA):** Install it on your phone or desktop for an app-like experience.
- 📶 **Fully Offline Mode:** Download chapters, pages, and audio packs for reliable reading without internet.
- 🗓️ **Personalized Planners:** Set your reading goals (e.g., read the whole Quran in 30 days) and track daily progress.
- 👥 **Group Reading (Sauka):** Create or join groups to distribute reading parts (Juz) among friends or community members.
- ☁️ **Cross-Device Sync:** Seamlessly sync your bookmarks, plans, and progress across all your devices using Appwrite.

---

## 🛠 Tech Stack

- **Frontend:** React 18, Vite, React Router, Zustand (State Management), React Query, Framer Motion
- **Styling:** Tailwind CSS, PostCSS
- **Backend & Auth:** Appwrite
- **Data Source:** Quran.com API

---

## 🚀 Installation & Local Development

Want to run the app locally and contribute? It's easy!

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) (Optional but recommended for faster installs)
- An [Appwrite](https://appwrite.io/) account (if you want to test cloud sync features)

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
*(You can leave the default Appwrite URL for testing, or set up your own Appwrite project if you are working on the backend features).*

**Optional — Render.com backend:** the app can also run against the self-hosted Render API (`https://quran-nur-api.onrender.com`) instead of Appwrite for auth, cloud sync and realtime notifications. This is opt-in and **off by default**:

```bash
# .env
VITE_USE_RENDER_API=true                          # default: false (Appwrite)
VITE_API_BASE_URL=https://quran-nur-api.onrender.com  # default shown
```

When the flag is on, tokens are persisted in `localStorage`, sync docs keep the exact same field names (`userId`, `stateData`), realtime is replaced by a light polling subscription (≤60 s + immediate refresh when the tab becomes visible), and the frozen `/v1` content endpoints are served from Render while offline packs, service-worker caching and CDN-direct audio (everyayah) stay untouched. When the flag is off, behavior is identical to the Appwrite setup.

### 4. Start the development server
```bash
bun run dev
# or
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

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
