# Fantasy Hub

Fantasy football analytics. Paste your Sleeper league link, get instant projections and auction values.

## Quick start

1. Paste your Sleeper league link at [fantasyhub-five.vercel.app](https://fantasyhub-five.vercel.app)
2. See projections and auction values
3. Done. No sign-up required.

## Local development

```bash
pip install -r requirements.txt
vercel dev
```

## Architecture

- **Frontend**: Static HTML/CSS/JS, deployed to Vercel CDN
- **API**: Python serverless functions on Vercel
- **Data**: Weekly projections precomputed via GitHub Actions, league-specific VBD computed on-demand from Sleeper API
