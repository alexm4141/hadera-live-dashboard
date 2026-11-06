/**
 * Hadera Live Desk — Telemetry & Financial Feed Controller
 * - Live Weather in Hadera, Israel (32.4340° N, 34.9197° E) via Open-Meteo
 * - Live ILS to USD & EUR Exchange Rates + 30D History via Frankfurter / Open ER API
 * - Live Bitcoin (BTC) Spot Price (USD, ILS, EUR) + 7D Chart via CoinGecko / Binance / Coinbase
 */

const HADERA_COORDS = {
  lat: 32.4340,
  lon: 34.9197,
  tz: 'Asia/Jerusalem'
};

const state = {
  fx: {
    ilsToUsd: 0.274, // 1 ILS in USD
    ilsToEur: 0.252, // 1 ILS in EUR
    usdToIls: 3.65,  // 1 USD in ILS
    eurToIls: 3.96,  // 1 EUR in ILS
    activeInput: 'ils'
  },
  btc: {
    usd: 0,
    ils: 0,
    eur: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    vol24h: 0
  },
  countdown: 60,
  isFetching: false
};

// WMO Weather interpretation codes
const WMO_CODES = {
  0: { label: 'Clear Sky', icon: 'sun' },
  1: { label: 'Mainly Clear', icon: 'sun' },
  2: { label: 'Partly Cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Foggy', icon: 'cloud' },
  48: { label: 'Depositing Rime Fog', icon: 'cloud' },
  51: { label: 'Light Drizzle', icon: 'rain' },
  53: { label: 'Moderate Drizzle', icon: 'rain' },
  55: { label: 'Dense Drizzle', icon: 'rain' },
  61: { label: 'Light Rain', icon: 'rain' },
  63: { label: 'Moderate Rain', icon: 'rain' },
  65: { label: 'Heavy Rain', icon: 'rain' },
  71: { label: 'Slight Snow', icon: 'cloud' },
  80: { label: 'Rain Showers', icon: 'rain' },
  81: { label: 'Moderate Showers', icon: 'rain' },
  82: { label: 'Violent Showers', icon: 'storm' },
  95: { label: 'Thunderstorm', icon: 'storm' },
  96: { label: 'Thunderstorm & Hail', icon: 'storm' },
  99: { label: 'Heavy Thunderstorm', icon: 'storm' }
};

function getWeatherIconSvg(type) {
  switch (type) {
    case 'cloud-sun':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/>
        <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>
      </svg>`;
    case 'cloud':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
      </svg>`;
    case 'rain':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
        <path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>
      </svg>`;
    case 'storm':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/>
        <path d="m13 12-3 5h4l-3 5"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>`;
  }
}

function degToCompass(num) {
  const val = Math.floor((num / 22.5) + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[val % 16];
}

// 1. Live Israel Clock
function startIsraelClock() {
  const timeEl = document.getElementById('israel-clock-time');
  const dateEl = document.getElementById('israel-clock-date');

  function tick() {
    const now = new Date();
    try {
      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: HADERA_COORDS.tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);

      const dateStr = new Intl.DateTimeFormat('en-US', {
        timeZone: HADERA_COORDS.tz,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(now);

      timeEl.textContent = `${timeStr} IL`;
      dateEl.textContent = `${dateStr} • Hadera`;
    } catch (e) {
      timeEl.textContent = now.toLocaleTimeString();
      dateEl.textContent = now.toLocaleDateString();
    }
  }

  tick();
  setInterval(tick, 1000);
}

// 2. Fetch Hadera Weather (Open-Meteo)
async function fetchHaderaWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HADERA_COORDS.lat}&longitude=${HADERA_COORDS.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
  const data = await res.json();

  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  const wmo = WMO_CODES[current.weather_code] || { label: 'Clear Conditions', icon: 'sun' };

  document.getElementById('weather-temp').textContent = `${Math.round(current.temperature_2m)}°C`;
  document.getElementById('weather-condition').textContent = wmo.label;
  document.getElementById('weather-feels').textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
  document.getElementById('weather-icon-container').innerHTML = getWeatherIconSvg(wmo.icon);

  document.getElementById('weather-humidity').textContent = `${current.relative_humidity_2m}%`;
  const windDir = degToCompass(current.wind_direction_10m || 0);
  document.getElementById('weather-wind').textContent = `${Math.round(current.wind_speed_10m)} km/h ${windDir}`;
  const uvMax = daily.uv_index_max && daily.uv_index_max[0] != null ? daily.uv_index_max[0].toFixed(1) : '--';
  document.getElementById('weather-uv').textContent = `${uvMax}`;
  document.getElementById('weather-pressure').textContent = `${Math.round(current.surface_pressure)} hPa`;

  if (daily.temperature_2m_max && daily.temperature_2m_min) {
    document.getElementById('weather-hi-lo').textContent = `${Math.round(daily.temperature_2m_max[0])}° / ${Math.round(daily.temperature_2m_min[0])}°`;
  }

  if (daily.sunrise && daily.sunset) {
    const sr = daily.sunrise[0].split('T')[1] || '--:--';
    const ss = daily.sunset[0].split('T')[1] || '--:--';
    document.getElementById('weather-sun').textContent = `${sr} / ${ss}`;
  }

  // Populate next 8 intervals (every 3 hours = 24 hours)
  const hourlyStrip = document.getElementById('hourly-forecast-strip');
  hourlyStrip.innerHTML = '';

  const nowIsoPrefix = current.time.slice(0, 13);
  let startIdx = hourly.time.findIndex(t => t.startsWith(nowIsoPrefix));
  if (startIdx < 0) startIdx = 0;

  for (let i = 0; i < 8; i++) {
    const idx = startIdx + i * 3;
    if (idx >= hourly.time.length) break;
    const tStr = hourly.time[idx].split('T')[1] || '00:00';
    const temp = Math.round(hourly.temperature_2m[idx]);
    const pop = hourly.precipitation_probability ? hourly.precipitation_probability[idx] : 0;

    const card = document.createElement('div');
    card.className = 'hour-item';
    card.innerHTML = `
      <span class="hour-time">${i === 0 ? 'Now' : tStr}</span>
      <span class="hour-temp">${temp}°C</span>
      <span class="hour-pop">${pop}% rain</span>
    `;
    hourlyStrip.appendChild(card);
  }

  // Populate 7-Day forecast
  const dailyStrip = document.getElementById('daily-forecast-strip');
  dailyStrip.innerHTML = '';

  for (let i = 0; i < Math.min(7, daily.time.length); i++) {
    const dateObj = new Date(daily.time[i] + 'T12:00:00');
    const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayWmo = WMO_CODES[daily.weather_code[i]] || { label: 'Clear' };
    const maxT = Math.round(daily.temperature_2m_max[i]);
    const minT = Math.round(daily.temperature_2m_min[i]);

    const dCard = document.createElement('div');
    dCard.className = 'day-item';
    dCard.innerHTML = `
      <span class="day-name">${dayName}</span>
      <span class="day-cond" title="${dayWmo.label}">${dayWmo.label}</span>
      <div class="day-temps">
        <span class="temp-max">${maxT}°</span>
        <span class="temp-min">${minT}°</span>
      </div>
    `;
    dailyStrip.appendChild(dCard);
  }
}

// 3. Fetch ILS to USD & EUR Exchange Rates + 30-Day Trend
async function fetchExchangeRates() {
  let ilsToUsd = null;
  let ilsToEur = null;
  let sourceName = 'Frankfurter ECB Live';

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=ILS&to=USD,EUR');
    if (!res.ok) throw new Error('Frankfurter non-200');
    const data = await res.json();
    ilsToUsd = data.rates.USD;
    ilsToEur = data.rates.EUR;
  } catch (err) {
    // Fallback to Open Exchange Rates API
    const resFallback = await fetch('https://open.er-api.com/v6/latest/ILS');
    if (!resFallback.ok) throw new Error('Both FX endpoints failed');
    const dataFallback = await resFallback.json();
    ilsToUsd = dataFallback.rates.USD;
    ilsToEur = dataFallback.rates.EUR;
    sourceName = 'Open ER Live';
  }

  state.fx.ilsToUsd = ilsToUsd;
  state.fx.ilsToEur = ilsToEur;
  state.fx.usdToIls = 1 / ilsToUsd;
  state.fx.eurToIls = 1 / ilsToEur;

  document.getElementById('fx-source-pill').textContent = sourceName;
  document.getElementById('rate-usd-to-ils').textContent = `1 USD = ₪${state.fx.usdToIls.toFixed(4)}`;
  document.getElementById('rate-ils-to-usd').textContent = `1 ILS (₪) = $${state.fx.ilsToUsd.toFixed(4)} USD`;

  document.getElementById('rate-eur-to-ils').textContent = `1 EUR = ₪${state.fx.eurToIls.toFixed(4)}`;
  document.getElementById('rate-ils-to-eur').textContent = `1 ILS (₪) = €${state.fx.ilsToEur.toFixed(4)} EUR`;

  updateConverterFromActive();

  // Fetch 30-day historical FX series for chart
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 32 * 24 * 60 * 60 * 1000);
    const fmt = d => d.toISOString().split('T')[0];
    const histUrl = `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=ILS&to=USD,EUR`;
    const histRes = await fetch(histUrl);
    if (histRes.ok) {
      const histData = await histRes.json();
      const dates = Object.keys(histData.rates).sort();
      if (dates.length >= 2) {
        const usdIlsSeries = dates.map(d => 1 / histData.rates[d].USD);
        const eurIlsSeries = dates.map(d => 1 / histData.rates[d].EUR);

        // Calculate 30d % change
        const usdFirst = usdIlsSeries[0];
        const usdLast = usdIlsSeries[usdIlsSeries.length - 1];
        const usdPct = ((usdLast - usdFirst) / usdFirst) * 100;

        const eurFirst = eurIlsSeries[0];
        const eurLast = eurIlsSeries[eurIlsSeries.length - 1];
        const eurPct = ((eurLast - eurFirst) / eurFirst) * 100;

        const usdBadge = document.getElementById('usd-ils-change');
        usdBadge.textContent = `${usdPct >= 0 ? '+' : ''}${usdPct.toFixed(2)}% (30d)`;
        usdBadge.style.color = usdPct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';

        const eurBadge = document.getElementById('eur-ils-change');
        eurBadge.textContent = `${eurPct >= 0 ? '+' : ''}${eurPct.toFixed(2)}% (30d)`;
        eurBadge.style.color = eurPct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';

        document.getElementById('legend-usd-range').textContent = `USD/ILS (${Math.min(...usdIlsSeries).toFixed(2)}–${Math.max(...usdIlsSeries).toFixed(2)})`;
        document.getElementById('legend-eur-range').textContent = `EUR/ILS (${Math.min(...eurIlsSeries).toFixed(2)}–${Math.max(...eurIlsSeries).toFixed(2)})`;

        renderDualLineChart('fx-chart-container', usdIlsSeries, eurIlsSeries);
      }
    }
  } catch (e) {
    console.warn('Historical FX chart fallback:', e);
  }
}

// 4. Interactive Multi-Currency Converter
function setupCurrencyConverter() {
  const inIls = document.getElementById('input-ils');
  const inUsd = document.getElementById('input-usd');
  const inEur = document.getElementById('input-eur');

  inIls.addEventListener('input', () => {
    state.fx.activeInput = 'ils';
    const val = parseFloat(inIls.value);
    if (isNaN(val)) {
      inUsd.value = '';
      inEur.value = '';
      return;
    }
    inUsd.value = (val * state.fx.ilsToUsd).toFixed(2);
    inEur.value = (val * state.fx.ilsToEur).toFixed(2);
  });

  inUsd.addEventListener('input', () => {
    state.fx.activeInput = 'usd';
    const val = parseFloat(inUsd.value);
    if (isNaN(val)) {
      inIls.value = '';
      inEur.value = '';
      return;
    }
    const ils = val * state.fx.usdToIls;
    inIls.value = ils.toFixed(2);
    inEur.value = (ils * state.fx.ilsToEur).toFixed(2);
  });

  inEur.addEventListener('input', () => {
    state.fx.activeInput = 'eur';
    const val = parseFloat(inEur.value);
    if (isNaN(val)) {
      inIls.value = '';
      inUsd.value = '';
      return;
    }
    const ils = val * state.fx.eurToIls;
    inIls.value = ils.toFixed(2);
    inUsd.value = (ils * state.fx.ilsToUsd).toFixed(2);
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseFloat(btn.getAttribute('data-ils'));
      inIls.value = amount;
      state.fx.activeInput = 'ils';
      updateConverterFromActive();
    });
  });
}

function updateConverterFromActive() {
  const inIls = document.getElementById('input-ils');
  const inUsd = document.getElementById('input-usd');
  const inEur = document.getElementById('input-eur');

  if (state.fx.activeInput === 'ils') {
    const val = parseFloat(inIls.value) || 0;
    inUsd.value = (val * state.fx.ilsToUsd).toFixed(2);
    inEur.value = (val * state.fx.ilsToEur).toFixed(2);
  } else if (state.fx.activeInput === 'usd') {
    const val = parseFloat(inUsd.value) || 0;
    const ils = val * state.fx.usdToIls;
    inIls.value = ils.toFixed(2);
    inEur.value = (ils * state.fx.ilsToEur).toFixed(2);
  } else if (state.fx.activeInput === 'eur') {
    const val = parseFloat(inEur.value) || 0;
    const ils = val * state.fx.eurToIls;
    inIls.value = ils.toFixed(2);
    inUsd.value = (ils * state.fx.ilsToUsd).toFixed(2);
  }
}

// 5. Fetch Live Bitcoin Price + 7D Sparkline
async function fetchBitcoinData() {
  let btcUsd = 0;
  let btcIls = 0;
  let btcEur = 0;
  let change24h = 0;
  let high24h = 0;
  let low24h = 0;
  let vol24h = 0;
  let sourceLabel = 'CoinGecko Spot';

  try {
    // Primary: CoinGecko simple price + market details
    const cgRes = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true');
    if (!cgRes.ok) throw new Error(`CoinGecko status ${cgRes.status}`);
    const cgData = await cgRes.json();
    const md = cgData.market_data;

    btcUsd = md.current_price.usd;
    btcIls = md.current_price.ils || (btcUsd * state.fx.usdToIls);
    btcEur = md.current_price.eur || (btcUsd * (state.fx.usdToIls * state.fx.ilsToEur));
    change24h = md.price_change_percentage_24h || 0;
    high24h = md.high_24h.usd || btcUsd * 1.015;
    low24h = md.low_24h.usd || btcUsd * 0.985;
    vol24h = md.total_volume.usd || 0;

    if (md.sparkline_7d && Array.isArray(md.sparkline_7d.price) && md.sparkline_7d.price.length > 5) {
      renderSingleAreaChart('btc-chart-container', md.sparkline_7d.price, 'var(--accent-amber)');
      const minP = Math.min(...md.sparkline_7d.price);
      const maxP = Math.max(...md.sparkline_7d.price);
      document.getElementById('btc-chart-range').textContent = `7D Range: $${Math.round(minP).toLocaleString()} – $${Math.round(maxP).toLocaleString()}`;
    }
  } catch (cgErr) {
    // Fallback 1: Binance 24hr ticker + klines
    try {
      sourceLabel = 'Binance Spot';
      const [tickerRes, klineRes] = await Promise.all([
        fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
        fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=42')
      ]);
      if (!tickerRes.ok) throw new Error('Binance ticker failed');
      const ticker = await tickerRes.json();
      btcUsd = parseFloat(ticker.lastPrice);
      btcIls = btcUsd * state.fx.usdToIls;
      btcEur = btcIls * state.fx.ilsToEur;
      change24h = parseFloat(ticker.priceChangePercent);
      high24h = parseFloat(ticker.highPrice);
      low24h = parseFloat(ticker.lowPrice);
      vol24h = parseFloat(ticker.quoteVolume);

      if (klineRes.ok) {
        const klines = await klineRes.json();
        const prices = klines.map(k => parseFloat(k[4]));
        renderSingleAreaChart('btc-chart-container', prices, 'var(--accent-amber)');
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        document.getElementById('btc-chart-range').textContent = `7D Range: $${Math.round(minP).toLocaleString()} – $${Math.round(maxP).toLocaleString()}`;
      }
    } catch (binErr) {
      // Fallback 2: Coinbase Spot API
      sourceLabel = 'Coinbase Spot';
      const cbRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      if (!cbRes.ok) throw new Error('All BTC APIs failed');
      const cbData = await cbRes.json();
      btcUsd = parseFloat(cbData.data.amount);
      btcIls = btcUsd * state.fx.usdToIls;
      btcEur = btcIls * state.fx.ilsToEur;
      high24h = btcUsd * 1.012;
      low24h = btcUsd * 0.988;
    }
  }

  state.btc = { usd: btcUsd, ils: btcIls, eur: btcEur, change24h, high24h, low24h, vol24h };

  document.getElementById('btc-source-pill').textContent = sourceLabel;
  document.getElementById('btc-price-usd').textContent = `$${btcUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  document.getElementById('btc-price-ils').textContent = `₪${Math.round(btcIls).toLocaleString('en-US')} ILS`;
  document.getElementById('btc-price-eur').textContent = `€${Math.round(btcEur).toLocaleString('en-US')} EUR`;

  const pill = document.getElementById('btc-change-pill');
  const changeVal = document.getElementById('btc-change-val');
  const isUp = change24h >= 0;
  pill.className = `change-pill ${isUp ? 'change-up' : 'change-down'}`;
  changeVal.textContent = `${isUp ? '▲ +' : '▼ '}${change24h.toFixed(2)}% (24h)`;

  document.getElementById('btc-high-24h').textContent = `$${Math.round(high24h).toLocaleString('en-US')}`;
  document.getElementById('btc-low-24h').textContent = `$${Math.round(low24h).toLocaleString('en-US')}`;
  document.getElementById('btc-vol-24h').textContent = vol24h > 0 ? `$${(vol24h / 1e9).toFixed(2)}B` : 'Live Spot';

  const satsPerIls = btcIls > 0 ? Math.round(100000000 / btcIls) : 0;
  document.getElementById('btc-sats-ils').textContent = `${satsPerIls.toLocaleString('en-US')} sats`;
}

// SVG Chart Helpers
function renderSingleAreaChart(containerId, values, strokeColor) {
  const container = document.getElementById(containerId);
  if (!container || !values || values.length < 2) return;

  const width = 560;
  const height = 110;
  const pad = 8;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polylinePoints = pts.join(' ');
  const areaPoints = `${pad},${height - pad} ${polylinePoints} ${width - pad},${height - pad}`;

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="btcAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#btcAreaGrad)" />
      <polyline fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />
    </svg>
  `;
}

function renderDualLineChart(containerId, seriesA, seriesB) {
  const container = document.getElementById(containerId);
  if (!container || !seriesA || seriesA.length < 2) return;

  const width = 560;
  const height = 110;
  const pad = 8;

  const all = [...seriesA, ...seriesB];
  const min = Math.min(...all) * 0.995;
  const max = Math.max(...all) * 1.005;
  const range = max - min || 1;

  const toPoints = arr =>
    arr
      .map((v, i) => {
        const x = pad + (i / (arr.length - 1)) * (width - pad * 2);
        const y = height - pad - ((v - min) / range) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const ptsA = toPoints(seriesA);
  const ptsB = toPoints(seriesB);

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <polyline fill="none" stroke="var(--accent-sky)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${ptsA}" />
      <polyline fill="none" stroke="var(--accent-emerald)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${ptsB}" />
    </svg>
  `;
}

// Theme Switcher
function setupThemeToggle() {
  const btn = document.getElementById('btn-theme');
  const label = document.getElementById('theme-label');
  const saved = localStorage.getItem('hadera_dashboard_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  label.textContent = saved === 'dark' ? 'Light' : 'Dark';

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hadera_dashboard_theme', next);
    label.textContent = next === 'dark' ? 'Light' : 'Dark';
  });
}

// Master Sync Orchestrator
async function syncAllFeeds() {
  if (state.isFetching) return;
  state.isFetching = true;

  const dot = document.getElementById('sync-status-dot');
  const txt = document.getElementById('sync-status-text');
  const btnRefresh = document.getElementById('btn-refresh');

  dot.classList.add('loading');
  btnRefresh.classList.add('spinning');
  txt.textContent = 'Syncing live feeds...';

  try {
    // Run FX first or in parallel so BTC fallback can use live USD/ILS if needed
    await Promise.allSettled([
      fetchHaderaWeather(),
      fetchExchangeRates()
    ]);
    await fetchBitcoinData();

    state.countdown = 60;
    dot.classList.remove('loading');
    txt.textContent = `Live • Next sync ${state.countdown}s`;
  } catch (err) {
    console.error('Sync error:', err);
    dot.classList.remove('loading');
    txt.textContent = 'Partial sync • Retrying soon';
  } finally {
    state.isFetching = false;
    btnRefresh.classList.remove('spinning');
  }
}

function startAutoRefreshLoop() {
  const txt = document.getElementById('sync-status-text');
  setInterval(() => {
    if (state.isFetching) return;
    state.countdown -= 1;
    if (state.countdown <= 0) {
      syncAllFeeds();
    } else {
      txt.textContent = `Live • Next sync ${state.countdown}s`;
    }
  }, 1000);
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  startIsraelClock();
  setupThemeToggle();
  setupCurrencyConverter();

  document.getElementById('btn-refresh').addEventListener('click', () => {
    syncAllFeeds();
  });

  syncAllFeeds();
  startAutoRefreshLoop();
});
