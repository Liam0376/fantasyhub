# Fantasy Hub

Fantasy football analytics. Paste your Sleeper league link, get instant projections and auction values.

## Quick start

1. Paste your Sleeper league link at [fantasyhub.vercel.app](https://fantasyhub.vercel.app)
2. See projections, auction values, and matchup analysis
3. Done. No sign-up required.

## Local development

```bash
pip install -r requirements.txt
vercel dev
```

## How it works

- **Frontend**: Static HTML/CSS/JS, deployed to Vercel CDN
- **API**: Python serverless functions on Vercel
- **Data**: Weekly projections precomputed via GitHub Actions, league-specific VBD computed on-demand from Sleeper API

## Tech stack

- Python (serverless functions)
- Vanilla JS (frontend)
- Sleeper API (league data)
- nflverse (player stats)
- Vercel (hosting + serverless)
