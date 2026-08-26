# Platinx - Crypto Trading Platform

A professional cryptocurrency trading platform built with React, Vite, and Tailwind CSS. Features real-time-like trading interface similar to Binance and Bybit.

## Features

- 📊 Interactive trading charts with Recharts
- 📈 Real-time order book display
- 💰 Buy/Sell order forms with limit and stop-limit options
- 🎨 Modern dark theme UI
- 📱 Responsive design
- 🔄 Market ticker with top gainers

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Charting library
- **Lucide React** - Icon library

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Project Structure

```
platinx-trading/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Navigation header
│   │   ├── TradingChart.jsx    # Chart component
│   │   ├── OrderBook.jsx       # Order book display
│   │   ├── OrderForm.jsx       # Buy/Sell form
│   │   └── MarketTicker.jsx    # Bottom ticker
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── index.html                  # HTML template
├── package.json                # Dependencies
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
└── postcss.config.js          # PostCSS configuration
```

## Static Data

Currently, the platform uses static/mock data for:
- Trading chart (LIGHT/INR pair)
- Order book (buy/sell orders)
- Market ticker (top gainers)
- Price information

## Future Enhancements

- [ ] API integration for real-time data
- [ ] WebSocket for live order book updates
- [ ] User authentication
- [ ] Wallet management
- [ ] Trading history
- [ ] Advanced charting tools
- [ ] Multiple trading pairs
- [ ] Mobile responsive improvements

## Development

The project uses:
- Hot Module Replacement (HMR) for instant updates
- Tailwind CSS for rapid UI development
- Component-based architecture for maintainability

## License

MIT

## Support

For issues and questions, please open an issue on the repository.
