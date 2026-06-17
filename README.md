# 🏃 Dudel Dash

> Überlebe den Büroalltag. Ein viraler Endless Runner.

## 🎮 Spielprinzip

Tippen = Springen. Zweimal tippen in der Luft = Doppelsprung.
Weiche Büro-Hindernissen aus (Chef, E-Mails, Drucker, Meetings...) und sammle Schild-Orbs für Extra-Leben.

## 🚀 Lokale Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
```

## 📦 Build & Deploy

```bash
npm run build      # erstellt dist/ Ordner
npm run preview    # lokale Vorschau des Builds
```

### Deployment auf Vercel

1. Auf [vercel.com](https://vercel.com) einloggen
2. "Import Git Repository" → dieses Repo auswählen
3. Build Command: `npm run build` (automatisch erkannt)
4. Output Directory: `dist` (automatisch erkannt)
5. Deploy → fertig, du bekommst eine Live-URL

### Deployment auf Netlify (Alternative)

1. Auf [netlify.com](https://netlify.com) einloggen
2. "Add new site" → "Import from Git"
3. Build Command: `npm run build`
4. Publish directory: `dist`

## 📱 Nächste Schritte (App Store)

Siehe Projekt-Roadmap — Capacitor.js Integration für native iOS/Android Builds folgt in Phase 2.

## 💰 Monetarisierung (geplant)

- Banner Ads (AdSense/AdMob)
- Interstitial nach jedem Tod
- Rewarded Video für Extra-Leben
- Skins als In-App-Purchase
