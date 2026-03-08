# CartCoach

A Chrome extension that intercepts purchase decisions in real time and helps you spend smarter.

## What it does

When you're about to buy something online, CartCoach pops up with a financial reality check — showing budget impact, goal delay, and what that money could grow to in 5 years. You can buy, skip, or save for later. Every decision is tracked.

## Features

- **Intervention modal** — appears at checkout with risk score, budget impact, and cheaper alternatives
- **Dashboard** — overview of total saved, spending by category, and savings goal progress
- **Ledger** — personal accounting ledger synced to MongoDB, auto-populated from purchase history
- **Insights** — investment projection chart and monthly breakdown
- **Wishlist** — save items for later and revisit them
- **AI Chat** — ask Mochi (the mascot) financial questions about your spending

## Stack

- **Extension** — React + TypeScript + Tailwind, built with Vite
- **Backend** — FastAPI + MongoDB Atlas (Motor async driver)
- **Shared** — types and constants shared between extension and backend

## Setup

### Backend
```bash
cd cartcoach/backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Extension
```bash
cd cartcoach/extension
npm install
npm run build
```

Load `cartcoach/dist` as an unpacked extension in Chrome (`chrome://extensions` → Load unpacked).
