import React from 'react';

const MarketTicker = () => {
  const markets = [
    { pair: 'WVV/INR', price: '₹378.0', change: '+36.51%', isPositive: true },
    { pair: 'SUNDOG/INR', price: '₹0.83', change: '+31.74%', isPositive: true },
    { pair: 'PEPE/INR', price: '₹0.00046', change: '+28.49%', isPositive: true },
    { pair: 'OKC/INR', price: '₹0.4161', change: '+25.03%', isPositive: true },
    { pair: 'X/INR', price: '₹0.00151', change: '+23.77%', isPositive: true },
  ];

  return (
    <div className="bg-secondary border-t border-gray-800 py-2 px-4">
      <div className="flex items-center space-x-8 overflow-x-auto">
        <button className="text-gray-400 hover:text-white text-sm whitespace-nowrap">
          Top Gainers
        </button>
        {markets.map((market, index) => (
          <div key={index} className="flex items-center space-x-3 whitespace-nowrap">
            <span className="text-white text-sm">{market.pair}</span>
            <span className="text-white text-sm font-medium">{market.price}</span>
            <span className={`text-sm ${market.isPositive ? 'text-accent' : 'text-danger'}`}>
              {market.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketTicker;
