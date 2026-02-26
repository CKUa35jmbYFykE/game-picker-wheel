# 🎮 Game Roulette

A spinning wheel to randomly pick your next game to play, powered by Steam tags.

## Features
- Spinning wheel with satisfying animation + synthesized sound effects
- Fetch games from Steam by tag (roguelike, co-op, RPG, etc.)
- Filter/enable individual games on the wheel
- Manual game entry
- Links to Steam store pages for selected games

## Project Structure
```
game-wheel/
├── index.html              # Everything — HTML, CSS, JS
├── netlify.toml            # Netlify config
├── netlify/
│   └── functions/
│       └── steam.js        # Serverless CORS proxy for Steam API
└── README.md
```

## Deploy to Netlify (5 minutes)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "init"
   gh repo create game-roulette --public --push
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com) → "Add new site" → "Import an existing project"
   - Connect your GitHub repo
   - Build settings are auto-detected from `netlify.toml`
   - Click **Deploy**

3. **Done!** Your site will be live at `https://your-site-name.netlify.app`

## Local Development

To test the Steam integration locally, install the Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev
```

This runs your site at `http://localhost:8888` with the Netlify Function active.

Without the CLI, the Steam fetch won't work locally (CORS), but the wheel itself and manual game entry work fine by just opening `index.html` in a browser.

## How the Steam Integration Works

The `netlify/functions/steam.js` file is a tiny serverless Node.js function that:
1. Receives a tag name from your frontend
2. Calls the Steam Store search API server-side (no CORS issue)
3. Parses the HTML response to extract game names, IDs, and icons
4. Returns clean JSON to your frontend

## Possible Upgrades
- [ ] Steam profile integration (requires Steam OAuth — needs a real backend)
- [ ] Multiple simultaneous tags with AND/OR logic
- [ ] Wheel themes / color schemes
- [ ] Save your game list to localStorage
- [ ] Weighted spinning (spin more = lower weight)
