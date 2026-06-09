# 🎬 MediaDrop

> Save the media you actually own.

MediaDrop is a modern media downloader built with React, TypeScript, TanStack Start, and Supabase. It allows users to fetch and download media from popular platforms through a clean, fast, and privacy-focused interface.

## ✨ Features

### 📹 Video Downloads

* Download videos in high quality
* Support for multiple resolutions
* Smart quality fallback system
* Fast processing and delivery

### 🎵 Audio Extraction

* Convert videos to audio formats
* MP3 support
* WAV support
* OPUS support
* High-quality audio extraction

### 🖼️ Thumbnail Download

* Fetch original thumbnails
* Download cover images
* Metadata retrieval support

### 📊 User Dashboard

* Personal download history
* Download statistics
* Platform usage insights
* Download management

### 🔒 Privacy Focused

* Private by default
* Minimal data retention
* Secure authentication
* User-controlled download history

### 🌐 Multi-Platform Support

* YouTube
* Instagram
* TikTok
* Facebook
* X (Twitter)
* Vimeo

---

## 🏗️ Tech Stack

### Frontend

* React 19
* TypeScript
* TanStack Start v1
* Tailwind CSS v4
* shadcn/ui
* Lucide React

### Backend

* Supabase
* Supabase Authentication
* Supabase Database
* Row Level Security (RLS)

### State Management

* TanStack Query

### Runtime & Deployment

* Cloudflare Workers
* Vite 7
* Bun

### Additional Libraries

* Sonner (Toast Notifications)
* Lovable Cloud

---

## 📂 Project Architecture

```text
User
  │
  ▼
React Frontend
(TanStack Start)
  │
  ▼
Cloudflare Workers
  │
  ▼
Supabase
 ├── Authentication
 ├── Database
 └── Storage
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js 20+
* Bun
* Supabase Project
* Git

### Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/mediadrop.git
cd mediadrop
```

Install dependencies:

```bash
bun install
```

Create environment file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

Start development server:

```bash
bun run dev
```

Open:

```text
http://localhost:3000
```

---

## 🔑 Authentication

MediaDrop uses Supabase Authentication for:

* User registration
* Login
* Session management
* Secure user access

---

## 📊 Database Features

The application stores:

* User profiles
* Download history
* Platform statistics
* Usage analytics
* User preferences

All data is protected using Supabase Row Level Security (RLS).

---

## 🎯 Core Features

### Download Media

Paste a supported media URL and fetch:

* Video files
* Audio files
* Thumbnails
* Metadata

### Download History

Track previous downloads through the user dashboard.

### Quality Selection

Choose preferred download quality before processing.

### Platform Analytics

Monitor usage across supported platforms.

---

## 📸 Screenshots

### Landing Page

Modern media download interface with support for multiple platforms.

### Dashboard

User dashboard featuring download history, analytics, and account management.

### Download Management

Track download status and manage media history.

---

## 🔮 Future Roadmap

* Playlist support
* Batch downloads
* Additional platforms
* Browser extension
* Mobile application
* Download scheduling
* Advanced analytics
* AI-powered media tools

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Developed by Gaurav Kumar

If you found this project useful, consider giving it a ⭐ on GitHub.
