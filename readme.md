# 🌳 Bonsai

A calm, zen-garden music player and **ad-free alternative to YouTube playlists**.
Paste a YouTube link, it converts to MP3 and adds it to your library, and you
play it in a peaceful interface — installable on your iPhone Home Screen.

A green bonsai sits at the center of the app. It **grows as your garden grows**
(each song adds foliage), and it gently **sways in the wind — but only while
music is playing.** When the music stops, the scene goes still.

## Features
- 🌳 A green bonsai that grows with your library and sways in the wind during playback
- 📂 **Playlists** — create, rename, delete, and organize your songs into them
- 🎧 Background playback — keeps playing in your pocket / screen off / asleep
- 🔒 Lock-screen + earbud button control (play / pause / skip)
- 🎚️ Software equalizer with a preset tuned for Soundcore earbuds
- 😴 Sleep timer with a gentle fade-out
- ↩️ Resumes the last song right where you left off

## Using playlists
- The **All Songs / playlist tabs** sit above your song list. Tap a tab to switch.
- Tap **＋ New** (or the **＋** in a song's row menu) to create a playlist.
- Each song row has a **list button** — tap it to add/remove that song from any playlist.
- When viewing a playlist, the **pencil** (top-right of "Garden") lets you rename or delete it.
- Press play on any song to start playing through whatever list you're viewing.

## What's inside
- `public/index.html` — the whole app (UI + player). No build step.
- `server.js` — Node/Express server: converts links, serves songs, stores playlists.
- `package.json` — lists the one dependency (Express).
- `.devcontainer/` — makes Codespaces auto-install everything.

## Setup (GitHub Codespaces)
1. **Open a Codespace** on this repo (green **Code** → **Codespaces** → **Create codespace**).
2. Wait for it to finish. With the `.devcontainer`, `yt-dlp`, `ffmpeg`, and npm install automatically.
3. If you did **not** use the devcontainer, run once in the terminal:
   ```bash
   sudo apt-get update && sudo apt-get install -y ffmpeg
   sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
   sudo chmod a+rx /usr/local/bin/yt-dlp
   npm install
   ```
4. **Start it:** `npm start`
5. In the **Ports** tab, set port **3000** to **Public**, then open its URL on your iPhone.
6. On iPhone Safari: **Share → Add to Home Screen**. Open it from the icon for the best background audio.

## Notes
- For personal, ad-free listening. Downloaded audio is for your own use — not for re-uploading or claiming as your own work.
- YouTube sometimes blocks downloads from cloud servers (Codespaces). If that happens, try a different video or run the app on your own computer at home.
- For guaranteed pocket/sleep playback, keep the equalizer on **Flat**.
