# CartCoach

A Chrome extension that intercepts online shopping checkouts and gives you real-time financial coaching — powered by Google Gemini and MongoDB.

## What it does

When you go to checkout on a supported retail site, CartCoach automatically detects the product and price, then shows a popup with:

- **Risk assessment** — how much of your monthly budget this purchase uses, how many days it delays your savings goal, and what the money could grow to if invested instead
- **Smarter options** — skip it, wishlist it, or find cheaper alternatives via live eBay listings
- **Savings tracking** — if you skip, it asks whether you're putting the money into savings or spending elsewhere, and logs it accordingly

Everything is tracked in a full **dashboard** with history, wishlist, ledger, and an AI chatbot powered by Gemini.

## Tech Stack

| Layer | Tech |
|---|---|
| Extension | React + TypeScript + Tailwind CSS + Vite (Manifest V3) |
| Backend | FastAPI (Python, fully async) |
| Database | MongoDB via Motor (async driver) |
| AI | Google Gemini 2.5 Flash |
| Scraping | Playwright (eBay alternatives) |

## Project Structure

```
cartcoach/
├── backend/          # FastAPI server
│   ├── api/routers/  # analyze, users, wishlist, ledger, insights
│   ├── db/           # MongoDB connection (Motor)
│   ├── logic/        # finance engine, recommendation, eBay scraper
│   └── models/       # Pydantic schemas
├── extension/        # Chrome extension
│   └── src/
│       ├── components/   # InterventionModal, RiskWarning, LedgerTable, etc.
│       ├── dashboard/    # Full dashboard UI
│       ├── popup/        # Extension popup
│       ├── content/      # DOM scraper content script
│       └── background/   # Service worker
└── shared/           # Shared TypeScript types + constants
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB running locally (`mongod`) or a MongoDB Atlas connection string
- Google Gemini API key

### Backend

```bash
cd cartcoach/backend
pip install -r requirements.txt
playwright install chromium
```

Create a `.env` file in `cartcoach/backend/`:

```
GEMINI_API_KEY=your_key_here
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=cartcoach
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

### Extension

```bash
cd cartcoach/extension
npm install
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

## Supported Sites

Amazon, Target, Walmart, Best Buy, Sephora, Etsy

## Features

- **Intervention popup** — modal injected via iframe on checkout pages without breaking host site CSS
- **Risk scoring** — low / medium / high based on budget impact and goal delay
- **Finance engine** — real-time budget impact, S&P 500 compound projections, savings goal delay in days
- **Gemini chatbot** — answers financial questions using your live budget and savings context
- **Alternatives** — Playwright scrapes eBay for cheaper live listings
- **Dashboard** — overview, history, wishlist, ledger, and insights tabs
- **Skip follow-up** — tracks whether skipped money goes to savings or is spent elsewhere
