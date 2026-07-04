# Hirmify

A music streaming web app I built with React — stream millions of songs,
follow your favorite artists, and build a library that's actually yours.
It installs like a native app too (PWA), so it lives on your home screen
and responds to your lock-screen media controls.

**Try it here → https://hirmify.vercel.app/**

![Hirmify demo](screenshots/demo.gif)

*Prefer a sharper version? Grab the [demo video](screenshots/demo.mp4).*

## What's inside

The usual suspects — login, search, playback — but with the details that
make it feel like a real music app:

- A full player with seek, volume, previous/next, and **smart autoplay**:
  when a song ends, Hirmify quietly picks the next one from the artist's
  top songs (or your liked songs if it runs out of ideas)
- Search that filters by language (English / Hindi / All) and remembers
  your choice
- Artist pages with follower counts and their most popular tracks
- A liked-songs library you can build from anywhere in the app — the heart
  responds instantly, no waiting for the network
- Lyrics for the current track, one tap away
- Media Session support — play/pause from your keyboard or lock screen

## A quick tour

This is what you land on — real trending charts, not filler:

![Home](screenshots/03-home.png)

Search knows what language you want to hear:

![Search](screenshots/04-search.png)

Find an artist and dive into their catalog:

![Artists search](screenshots/05-artists.png)

![Artist](screenshots/06-artist.png)

Sing along whenever the lyrics are available:

![Lyrics](screenshots/07-lyrics.png)

Everything you've liked, in one place:

![Liked Songs](screenshots/08-liked.png)

It all starts here — and yes, it works great on phones:

<p>
  <img src="screenshots/01-login.png" alt="Login" width="49%" />
  <img src="screenshots/02-register.png" alt="Register" width="49%" />
</p>

<img src="screenshots/09-mobile.png" alt="Mobile" width="30%" />

## Under the hood

React 18, Vite 7, Tailwind CSS, React Router 6, and vite-plugin-pwa for the
installable bits. No state library — two React contexts (auth and player)
cover everything this app needs.

```
src/
├── config/env.js        API base URLs (env-driven)
├── services/            every API call lives here, nowhere else
├── context/             AuthContext + PlayerContext (playback, queue, likes)
├── hooks/               useDebounce
├── utils/               song mapping & formatting helpers
├── components/
│   ├── layout/          Sidebar, TopBar, PlayerBar, mobile nav
│   └── ui/              cards, rows, inputs, skeletons, lyrics panel...
└── pages/               Home, Search, Artists, Artist, Liked, Auth
```

Music data comes from [Proxy_Server_Song_v2](https://github.com/ReynardChristiansen/Proxy_Server_Song_v2)
(a JioSaavn proxy), and accounts live on a separate user API.

## Run it yourself

```bash
npm install
npm run dev        # opens on http://localhost:5173
```

By default, dev mode expects the proxy on `localhost:3000` — or point it at
the deployed one by copying `.env.example` to `.env.local`:

```
VITE_MUSIC_API_URL=https://proxy-server-song-v2.vercel.app
VITE_USER_API_URL=https://hirmify-api.vercel.app
```

For a production build: `npm run build`, then `npm run preview` to try it —
that's also where the PWA install works (it doesn't in dev mode).

## Install it as an app

Visit the site in Chrome or Edge and hit **Install** in the address bar
(or **Add to Home Screen** on iOS Safari). You get a standalone window,
an app icon, and hardware media-key support.

## Feedback

Found a bug or have an idea? Reach me at reynard.satria@gmail.com
