// ============================================================
//  Bonsai — backend server
//  - Serves the app (the "public" folder)
//  - Converts a YouTube link to an MP3 using yt-dlp + ffmpeg
//  - Stores your songs (library.json) and playlists (playlists.json)
// ============================================================

const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DOWNLOADS_DIR  = path.join(__dirname, 'downloads');
const LIBRARY_FILE   = path.join(DOWNLOADS_DIR, 'library.json');
const PLAYLISTS_FILE = path.join(DOWNLOADS_DIR, 'playlists.json');

if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/audio', express.static(DOWNLOADS_DIR));

// ---------- tiny "database" helpers (just JSON files) ----------
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
const readLibrary   = () => readJson(LIBRARY_FILE, []);
const writeLibrary  = (l) => writeJson(LIBRARY_FILE, l);
const readPlaylists = () => readJson(PLAYLISTS_FILE, []);
const writePlaylists = (p) => writeJson(PLAYLISTS_FILE, p);

// make a short unique id, e.g. "p_lr8x3k2ab"
function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Run yt-dlp safely. We use execFile (not exec) and pass the URL as a
// separate argument, so the link can never be used to run other commands.
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile('yt-dlp', args, { maxBuffer: 1024 * 1024 * 60 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

// Only allow real YouTube links.
const YT_REGEX =
  /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\/.+/i;

// ==================== SONG ROUTES ====================

// Whole library
app.get('/api/songs', (req, res) => res.json(readLibrary()));

// Convert a YouTube link -> MP3 -> add to library
app.post('/api/convert', async (req, res) => {
  const url = (req.body.url || '').trim();
  if (!YT_REGEX.test(url)) {
    return res.status(400).json({ error: 'Please paste a valid YouTube link.' });
  }

  try {
    // 1) Look up details first (no download yet). --no-playlist => single video.
    const infoRaw = await runYtDlp(['--dump-single-json', '--no-playlist', '--no-warnings', url]);
    const info = JSON.parse(infoRaw);

    const id = info.id;
    const library = readLibrary();

    // Already have it? Don't download again.
    const existing = library.find((s) => s.id === id);
    if (existing) return res.json({ song: existing, already: true });

    // 2) Download audio and convert to MP3 (saved as downloads/<id>.mp3).
    const outputTemplate = path.join(DOWNLOADS_DIR, '%(id)s.%(ext)s');
    await runYtDlp([
      '-x', '--audio-format', 'mp3', '--audio-quality', '0',
      '--no-playlist', '--no-warnings', '-o', outputTemplate, url,
    ]);

    // 3) Save to the library.
    const song = {
      id,
      title: info.title || 'Unknown title',
      uploader: info.uploader || info.channel || 'Unknown',
      duration: Math.round(info.duration || 0),
      thumbnail: info.thumbnail || '',
      file: `/audio/${id}.mp3`,
      addedAt: Date.now(),
    };
    library.unshift(song);
    writeLibrary(library);

    res.json({ song, already: false });
  } catch (e) {
    console.error('Convert failed:', e.message);
    const msg = /sign in|not a bot|403|forbidden/i.test(e.message)
      ? "YouTube blocked this download. This often happens on cloud servers like Codespaces — try a different video, or run the app on your own computer."
      : 'Could not convert that link. Make sure yt-dlp and ffmpeg are installed and the link works.';
    res.status(500).json({ error: msg });
  }
});

// Delete a song everywhere (library + any playlists + the file)
app.delete('/api/songs/:id', (req, res) => {
  const id = req.params.id;

  writeLibrary(readLibrary().filter((s) => s.id !== id));

  const playlists = readPlaylists().map((p) => ({
    ...p,
    songIds: p.songIds.filter((sid) => sid !== id),
  }));
  writePlaylists(playlists);

  const file = path.join(DOWNLOADS_DIR, `${id}.mp3`);
  if (fs.existsSync(file)) fs.unlinkSync(file);

  res.json({ ok: true });
});

// ==================== PLAYLIST ROUTES ====================

// List playlists
app.get('/api/playlists', (req, res) => res.json(readPlaylists()));

// Create a playlist
app.post('/api/playlists', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Playlist name required.' });

  const playlists = readPlaylists();
  const playlist = { id: uid('p_'), name: name.slice(0, 60), songIds: [], createdAt: Date.now() };
  playlists.push(playlist);
  writePlaylists(playlists);
  res.json({ playlist });
});

// Rename a playlist
app.patch('/api/playlists/:id', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Playlist name required.' });

  const playlists = readPlaylists();
  const pl = playlists.find((p) => p.id === req.params.id);
  if (!pl) return res.status(404).json({ error: 'Playlist not found.' });

  pl.name = name.slice(0, 60);
  writePlaylists(playlists);
  res.json({ playlist: pl });
});

// Delete a playlist (songs stay in the library)
app.delete('/api/playlists/:id', (req, res) => {
  writePlaylists(readPlaylists().filter((p) => p.id !== req.params.id));
  res.json({ ok: true });
});

// Add a song to a playlist
app.post('/api/playlists/:id/songs', (req, res) => {
  const songId = (req.body.songId || '').trim();
  const playlists = readPlaylists();
  const pl = playlists.find((p) => p.id === req.params.id);
  if (!pl) return res.status(404).json({ error: 'Playlist not found.' });
  if (!readLibrary().some((s) => s.id === songId)) {
    return res.status(400).json({ error: 'Song not found.' });
  }
  if (!pl.songIds.includes(songId)) pl.songIds.push(songId);
  writePlaylists(playlists);
  res.json({ playlist: pl });
});

// Remove a song from a playlist
app.delete('/api/playlists/:id/songs/:songId', (req, res) => {
  const playlists = readPlaylists();
  const pl = playlists.find((p) => p.id === req.params.id);
  if (!pl) return res.status(404).json({ error: 'Playlist not found.' });
  pl.songIds = pl.songIds.filter((sid) => sid !== req.params.songId);
  writePlaylists(playlists);
  res.json({ playlist: pl });
});

// ==================== START ====================
app.listen(PORT, () => {
  console.log(`\n🌳  Bonsai is running.  Open port ${PORT} in your browser.\n`);
});
