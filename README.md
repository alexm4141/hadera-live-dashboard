# Hadera Live Telemetry Dashboard

Live web dashboard deployed to GitHub Pages displaying:
1. **Live Weather in Hadera, Israel** (`32.4340° N, 34.9197° E`) — Current temperature, feels-like, weather condition, humidity, wind speed & compass direction, UV index, atmospheric pressure, sunrise/sunset, 24-hour outlook, and 7-day forecast (powered by [Open-Meteo](https://open-meteo.com/)).
2. **ILS to USD & EUR Exchange Rates** — Live bidirectional exchange rates (`ILS ⇄ USD` and `ILS ⇄ EUR`), 30-day historical trend chart, and an interactive 3-way currency converter (powered by [Frankfurter ECB API](https://www.frankfurter.app/) with automatic fallback to Open Exchange Rates).
3. **Live Bitcoin (BTC) Price** — Real-time Bitcoin spot price in **USD**, **ILS (₪)**, and **EUR (€)**, 24-hour percentage change, 24h high/low/volume, Satoshis per ₪1 ILS, and a 7-day price sparkline chart (powered by CoinGecko & Binance/Coinbase fallback).

## Live URL
- **GitHub Pages:** [https://alexm4141.github.io/hadera-live-dashboard/](https://alexm4141.github.io/hadera-live-dashboard/)

## Features
- **Zero API Keys Required**: Uses CORS-enabled public financial and meteorological endpoints with multi-provider fallbacks.
- **Auto-Refresh**: Automatically syncs every 60 seconds with an interactive manual refresh trigger and live Jerusalem (`Asia/Jerusalem`) clock.
- **Dark & Light Themes**: High-contrast financial & meteorological telemetry UI with persistent theme preference.
