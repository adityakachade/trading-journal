import { useState, useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";
import { tradeService } from "../services/tradeService";

function LiveTradingChart() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('paperBalance');
    return saved ? parseFloat(saved) : 10000;
  });
  const [positions, setPositions] = useState([]);
  const [latestPrice, setLatestPrice] = useState({
    price: 1.0850,
    bid: 1.0849,
    ask: 1.0851,
    volume: 750000,
    change: 0
  });
  const [quantity, setQuantity] = useState(1000);
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [priceLines, setPriceLines] = useState({}); // { posId: { entry: line, sl: line, tp: line } }

  // Phase 11: Market Explorer
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('favoriteSymbols');
    return saved ? JSON.parse(saved) : ["EURUSD", "GBPUSD", "USDJPY", "BTCUSD"];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const allSymbols = [
    { id: "EURUSD", name: "EUR/USD", type: "Forex" },
    { id: "GBPUSD", name: "GBP/USD", type: "Forex" },
    { id: "USDJPY", name: "USD/JPY", type: "Forex" },
    { id: "AUDUSD", name: "AUD/USD", type: "Forex" },
    { id: "BTCUSD", name: "Bitcoin", type: "Crypto" },
    { id: "ETHUSD", name: "Ethereum", type: "Crypto" },
    { id: "AAPL", name: "Apple", type: "Stock" },
    { id: "TSLA", name: "Tesla", type: "Stock" },
    { id: "RELIANCE", name: "Reliance", type: "NSE" },
    { id: "NIFTY50", name: "NIFTY 50", type: "Index" }
  ];

  useEffect(() => {
    localStorage.setItem('favoriteSymbols', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (symbolId) => {
    setFavorites(prev =>
      prev.includes(symbolId)
        ? prev.filter(s => s !== symbolId)
        : [...prev, symbolId]
    );
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          style: 1,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          style: 1,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 450,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00d4aa',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#00d4aa',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Initial data generation based on symbol
    const now = Math.floor(Date.now() / 1000);
    const initialData = [];
    const initialVolumeData = [];

    // Simple price mapper
    const basePrices = {
      BTCUSD: 65000,
      ETHUSD: 3500,
      AAPL: 180,
      TSLA: 175,
      RELIANCE: 2950,
      NIFTY50: 22000,
      USDJPY: 150.50
    };
    let curPrice = basePrices[selectedSymbol] || 1.0850;
    const variationScale = curPrice > 1000 ? 10 : curPrice > 100 ? 0.5 : 0.002;

    for (let i = 0; i < 100; i++) {
      const time = now - (100 - i) * 60;
      const open = curPrice;
      const variation = (Math.random() - 0.5) * variationScale;
      const close = open + variation;
      const high = Math.max(open, close) + Math.random() * (variationScale / 2);
      const low = Math.min(open, close) - Math.random() * (variationScale / 2);

      initialData.push({ time, open, high, low, close });
      initialVolumeData.push({
        time,
        value: Math.floor(Math.random() * 1000000 * (curPrice > 1000 ? 0.1 : 1)),
        color: close >= open ? 'rgba(0, 212, 170, 0.3)' : 'rgba(239, 68, 68, 0.3)'
      });
      curPrice = close;
    }

    candleSeries.setData(initialData);
    volumeSeries.setData(initialVolumeData);

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);
    setIsConnected(true);

    // Live update simulation
    let lastTime = now;
    let lastClose = curPrice;

    const interval = setInterval(() => {
      const currentTime = Math.floor(Date.now() / 1000);
      const open = lastClose;
      const variation = (Math.random() - 0.5) * (variationScale / 10);
      const close = open + variation;
      const high = Math.max(open, close) + Math.random() * (variationScale / 20);
      const low = Math.min(open, close) - Math.random() * (variationScale / 20);

      const isUp = close >= open;
      const volume = Math.floor(Math.random() * 200000) + 100000;

      const roundedTime = Math.floor(currentTime / 60) * 60;

      candleSeries.update({
        time: roundedTime,
        open: open,
        high: high,
        low: low,
        close: close
      });

      setLatestPrice({
        price: close,
        bid: close - (variationScale / 20),
        ask: close + (variationScale / 20),
        volume: volume,
        change: close - initialData[0].open
      });
      lastClose = close;

      volumeSeries.update({
        time: roundedTime,
        value: volume,
        color: isUp ? 'rgba(0, 212, 170, 0.3)' : 'rgba(239, 68, 68, 0.3)'
      });

      setLatestPrice({
        price: parseFloat(close.toFixed(5)),
        bid: parseFloat((close - 0.0001).toFixed(5)),
        ask: parseFloat((close + 0.0001).toFixed(5)),
        volume: volume,
        change: variation
      });

      lastClose = close;
      lastTime = roundedTime;
    }, 2000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [selectedSymbol]);

  useEffect(() => {
    localStorage.setItem('paperBalance', balance.toString());
  }, [balance]);

  const handleSetCurrentSL = () => setSl(latestPrice.price.toFixed(5));
  const handleSetCurrentTP = () => setTp(latestPrice.price.toFixed(5));

  const clearVisualLines = (posId) => {
    const lines = priceLines[posId];
    if (lines) {
      if (lines.entry) candleSeriesRef.current?.removePriceLine(lines.entry);
      if (lines.sl) candleSeriesRef.current?.removePriceLine(lines.sl);
      if (lines.tp) candleSeriesRef.current?.removePriceLine(lines.tp);
      const newLines = { ...priceLines };
      delete newLines[posId];
      setPriceLines(newLines);
    }
  };

  const createVisualLines = (posId, entry, stopLoss, takeProfit) => {
    if (!candleSeriesRef.current) return;

    const lines = {};
    lines.entry = candleSeriesRef.current.createPriceLine({
      price: entry,
      color: "#3b82f6",
      lineWidth: 2,
      lineStyle: 1,
      axisLabelVisible: true,
      title: "ENTRY",
    });

    if (stopLoss) {
      lines.sl = candleSeriesRef.current.createPriceLine({
        price: parseFloat(stopLoss),
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "SL",
      });
    }

    if (takeProfit) {
      lines.tp = candleSeriesRef.current.createPriceLine({
        price: parseFloat(takeProfit),
        color: "#00d4aa",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    setPriceLines(prev => ({ ...prev, [posId]: lines }));
  };

  const handleBuy = async () => {
    const entryPrice = latestPrice.ask;
    const posId = Date.now();
    const newPosition = {
      id: posId,
      symbol: selectedSymbol,
      direction: "LONG",
      entryPrice,
      size: quantity,
      stopLoss: sl || null,
      takeProfit: tp || null,
      openTime: new Date().toISOString(),
    };

    setPositions([...positions, newPosition]);
    createVisualLines(posId, entryPrice, sl, tp);

    // Immediate DB Sync
    try {
      const resp = await tradeService.createTrade({
        ...newPosition,
        status: "open",
        strategy: "Live Execution",
        session: "Overlap",
        tradeDate: newPosition.openTime,
        notes: `MetaTrader Style Live Execution on ${selectedSymbol}`
      });
      // Store the DB ID back to the position for later updates
      newPosition.dbId = resp.trade?.id || resp.trade?._id;
    } catch (err) {
      console.error("Failed to sync open position:", err);
    }
  };

  const handleSell = async () => {
    const entryPrice = latestPrice.bid;
    const posId = Date.now();
    const newPosition = {
      id: posId,
      symbol: selectedSymbol,
      direction: "SHORT",
      entryPrice,
      size: quantity,
      stopLoss: sl || null,
      takeProfit: tp || null,
      openTime: new Date().toISOString(),
    };

    setPositions([...positions, newPosition]);
    createVisualLines(posId, entryPrice, sl, tp);

    // Immediate DB Sync
    try {
      const resp = await tradeService.createTrade({
        ...newPosition,
        status: "open",
        strategy: "Live Execution",
        session: "Overlap",
        tradeDate: newPosition.openTime,
        notes: `MetaTrader Style Live Execution on ${selectedSymbol}`
      });
      newPosition.dbId = resp.trade?.id || resp.trade?._id;
    } catch (err) {
      console.error("Failed to sync open position:", err);
    }
  };

  const handleClosePosition = async (posId) => {
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;

    const exitPrice = pos.direction === "LONG" ? latestPrice.bid : latestPrice.ask;
    const pnl = pos.direction === "LONG"
      ? (exitPrice - pos.entryPrice) * pos.size
      : (pos.entryPrice - exitPrice) * pos.size;

    // Auto-journaling / Updating
    try {
      if (pos.dbId) {
        await tradeService.updateTrade(pos.dbId, {
          exitPrice: exitPrice,
          pnl: parseFloat(pnl.toFixed(2)),
          status: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
          exitDate: new Date().toISOString()
        });
      } else {
        // Fallback for non-synced trades
        await tradeService.createTrade({
          symbol: pos.symbol,
          direction: pos.direction,
          entryPrice: pos.entryPrice,
          exitPrice: exitPrice,
          positionSize: pos.size,
          stopLoss: pos.stopLoss,
          takeProfit: pos.takeProfit,
          pnl: parseFloat(pnl.toFixed(2)),
          status: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
          strategy: "Live Execution",
          session: "Overlap",
          tradeDate: new Date(pos.openTime).toISOString(),
          exitDate: new Date().toISOString(),
          notes: "Automatically journaled from Live Trading Chart."
        });
      }

      // Cleanup
      clearVisualLines(posId);
      setBalance(prev => prev + pnl);
      setPositions(positions.filter(p => p.id !== posId));

      // Refresh journal if it's open somewhere
      if (window.refreshJournal) window.refreshJournal();
      if (window.refreshDashboard) window.refreshDashboard();

    } catch (err) {
      console.error("Auto-journaling failed:", err);
      alert("Trade closed in simulator, but failed to auto-journal to backend.");
      // Still close locally
      setBalance(prev => prev + pnl);
      setPositions(positions.filter(p => p.id !== posId));
    }
  };

  const calculateUnrealizedPnL = (pos) => {
    const currentPrice = pos.direction === "LONG" ? latestPrice.bid : latestPrice.ask;
    return pos.direction === "LONG"
      ? (currentPrice - pos.entryPrice) * pos.size
      : (pos.entryPrice - currentPrice) * pos.size;
  };

  const formatPrice = (value) => value.toFixed(5);
  const formatVolume = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">📈 Live Trading View</div>
            <div className="card-sub">Professional candlestick chart with real-time updates</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search symbol..."
                className="form-control"
                style={{ width: "180px", fontSize: "12px", height: "32px", paddingLeft: "32px" }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>🔍</span>
              {searchTerm && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  background: "var(--surface2)",
                  border: "1px solid var(--surface3)",
                  borderRadius: "8px",
                  zIndex: 1000,
                  marginTop: "4px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}>
                  {allSymbols.filter(s => s.id.includes(searchTerm.toUpperCase()) || s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                    <div
                      key={s.id}
                      onClick={() => { setSelectedSymbol(s.id); setSearchTerm(""); }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: "12px", borderBottom: "1px solid var(--surface3)" }}
                      className="symbol-result"
                    >
                      <strong>{s.id}</strong> - <span style={{ opacity: 0.7 }}>{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => toggleFavorite(selectedSymbol)}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--surface3)",
                borderRadius: "6px",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: favorites.includes(selectedSymbol) ? "var(--accent)" : "var(--muted)"
              }}
            >
              {favorites.includes(selectedSymbol) ? "★" : "☆"}
            </button>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "6px",
              background: isConnected ? "rgba(0,212,170,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${isConnected ? "var(--accent)" : "var(--red)"}`
            }}>
              <div className={`pulse-dot ${isConnected ? "active" : ""}`} />
              <span style={{ fontSize: "12px", color: isConnected ? "var(--accent)" : "var(--red)" }}>
                {isConnected ? "Live" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>

        {/* Watchlist Section */}
        <div style={{ padding: "0 16px 16px 16px", display: "flex", gap: "10px", flexWrap: "wrap", borderBottom: "1px solid var(--surface2)" }}>
          {favorites.map(symId => {
            const sym = allSymbols.find(s => s.id === symId);
            return (
              <div
                key={symId}
                onClick={() => setSelectedSymbol(symId)}
                className="watchlist-item"
                style={{
                  padding: "4px 12px",
                  background: selectedSymbol === symId ? "rgba(0,212,170,0.1)" : "var(--surface2)",
                  border: `1px solid ${selectedSymbol === symId ? "var(--accent)" : "var(--surface3)"}`,
                  borderRadius: "6px",
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s"
                }}
              >
                <strong>{symId}</strong>
                <span
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(symId); }}
                  style={{ color: "var(--accent)", cursor: "pointer", opacity: 0.6 }}
                >×</span>
              </div>
            );
          })}
          {favorites.length === 0 && <span style={{ fontSize: "11px", opacity: 0.5 }}>Search and star symbols to build your watchlist.</span>}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "16px",
          padding: "16px",
          background: "var(--surface)",
          border: "1px solid var(--surface2)",
          borderRadius: "12px"
        }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Account Balance</div>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--accent)" }}>₹{balance.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Market Price</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: latestPrice.change >= 0 ? "var(--accent)" : "var(--red)" }}>
              {formatPrice(latestPrice.price)}
              <span style={{ fontSize: "12px", marginLeft: "6px", opacity: 0.8 }}>
                {latestPrice.change >= 0 ? "▲" : "▼"}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Bid / Ask</div>
            <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text)" }}>
              <span style={{ color: "var(--red)" }}>{formatPrice(latestPrice.bid)}</span> / <span style={{ color: "var(--accent)" }}>{formatPrice(latestPrice.ask)}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button className="btn btn-primary" onClick={handleBuy} style={{ flex: 1, height: "48px", background: "#00d4aa", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 12px rgba(0,212,170,0.2)" }}>BUY</button>
            <button className="btn btn-primary" onClick={handleSell} style={{ flex: 1, height: "48px", background: "#ef4444", fontWeight: "bold", fontSize: "16px", boxShadow: "0 4px 12px rgba(239,68,68,0.2)" }}>SELL</button>
          </div>

          {/* Order Details Row */}
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Symbol Size (Units)</div>
            <select
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="form-control"
              style={{ width: "100%", height: "36px", background: "var(--surface2)", border: "1px solid var(--surface3)" }}
            >
              <option value="100">100 (Micro)</option>
              <option value="1000">1,000 (Mini)</option>
              <option value="5000">5,000</option>
              <option value="10000">10,000 (Standard)</option>
              <option value="100000">100,000 (Lot)</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
              Stop Loss
              <span onClick={handleSetCurrentSL} style={{ color: "var(--accent)", cursor: "pointer", fontSize: "10px", fontWeight: "bold" }}>SET CUR</span>
            </div>
            <input
              type="number"
              step="0.00001"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              className="form-control"
              placeholder="None"
              style={{ width: "100%", height: "36px", background: "var(--surface2)", border: "1px solid var(--surface3)" }}
            />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
              Take Profit
              <span onClick={handleSetCurrentTP} style={{ color: "var(--accent)", cursor: "pointer", fontSize: "10px", fontWeight: "bold" }}>SET CUR</span>
            </div>
            <input
              type="number"
              step="0.00001"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              className="form-control"
              placeholder="None"
              style={{ width: "100%", height: "36px", background: "var(--surface2)", border: "1px solid var(--surface3)" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "2px" }}>Risk : Reward</div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text)" }}>
              {sl && tp ? `1 : ${(Math.abs(tp - latestPrice.price) / Math.abs(sl - latestPrice.price)).toFixed(2)}` : '--'}
            </div>
          </div>
        </div>

        <div
          ref={chartContainerRef}
          style={{
            height: "400px",
            width: "100%",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            overflow: "hidden",
            marginBottom: "20px"
          }}
        />

        {positions.length > 0 && (
          <div className="card" style={{ background: "var(--surface2)", padding: "16px" }}>
            <div className="card-title" style={{ fontSize: "14px", marginBottom: "12px" }}>Active Positions ({positions.length})</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Symbol</th><th>Dir</th><th>Entry</th><th>Size</th><th>SL</th><th>TP</th><th>Unrealized PnL</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => {
                    const upnl = calculateUnrealizedPnL(pos);
                    return (
                      <tr key={pos.id} style={{ borderLeft: pos.dbId ? "4px solid var(--accent)" : "4px solid var(--muted)" }}>
                        <td>{pos.symbol} <span style={{ fontSize: "9px", opacity: 0.5 }}>{pos.dbId ? "Synced" : "Local"}</span></td>
                        <td><span className={pos.direction === "LONG" ? "dir-long" : "dir-short"}>{pos.direction}</span></td>
                        <td>{formatPrice(pos.entryPrice)}</td>
                        <td>{pos.size.toLocaleString()}</td>
                        <td style={{ color: "var(--red)" }}>{pos.stopLoss ? formatPrice(parseFloat(pos.stopLoss)) : "--"}</td>
                        <td style={{ color: "var(--accent)" }}>{pos.takeProfit ? formatPrice(parseFloat(pos.takeProfit)) : "--"}</td>
                        <td><span className={upnl >= 0 ? "pnl-pos" : "pnl-neg"}>{upnl >= 0 ? "+" : ""}₹{upnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>
                        <td><button className="btn btn-ghost" onClick={() => handleClosePosition(pos.id)} style={{ fontSize: "11px", padding: "4px 8px", color: "var(--red)" }}>Close</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveTradingChart;
