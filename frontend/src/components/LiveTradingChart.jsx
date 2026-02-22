import { useState, useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from "lightweight-charts";

function LiveTradingChart() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [isConnected, setIsConnected] = useState(false);
  const [latestPrice, setLatestPrice] = useState({
    price: 1.0850,
    bid: 1.0849,
    ask: 1.0851,
    volume: 750000,
    change: 0
  });

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

    // Initial data
    const now = Math.floor(Date.now() / 1000);
    const initialData = [];
    const initialVolumeData = [];
    let curPrice = 1.0850;

    for (let i = 0; i < 100; i++) {
      const time = now - (100 - i) * 60;
      const open = curPrice;
      const variation = (Math.random() - 0.5) * 0.002;
      const close = open + variation;
      const high = Math.max(open, close) + Math.random() * 0.0005;
      const low = Math.min(open, close) - Math.random() * 0.0005;

      const isUp = close >= open;

      initialData.push({ time, open, high, low, close });
      initialVolumeData.push({
        time,
        value: Math.floor(Math.random() * 1000000) + 500000,
        color: isUp ? 'rgba(0, 212, 170, 0.3)' : 'rgba(239, 68, 68, 0.3)'
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
      const variation = (Math.random() - 0.5) * 0.0004; // Smaller variation for ticks
      const close = open + variation;
      const high = Math.max(open, close) + Math.random() * 0.0001;
      const low = Math.min(open, close) - Math.random() * 0.0001;

      const isUp = close >= open;
      const volume = Math.floor(Math.random() * 200000) + 100000;

      // Update the current bar (using the same minute)
      const roundedTime = Math.floor(currentTime / 60) * 60;

      candleSeries.update({
        time: roundedTime,
        open: open, // In real app, we'd keep track of the bar's initial open
        high: high,
        low: low,
        close: close
      });

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
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="form-control"
              style={{ width: "auto", minWidth: "120px" }}
            >
              <option value="EURUSD">EUR/USD</option>
              <option value="GBPUSD">GBP/USD</option>
              <option value="USDJPY">USD/JPY</option>
              <option value="AUDUSD">AUD/USD</option>
            </select>
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

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "16px",
          padding: "16px",
          background: "var(--surface)",
          borderRadius: "8px"
        }}>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Price</div>
            <div style={{ fontSize: "20px", fontWeight: "700", color: latestPrice.change >= 0 ? "var(--accent)" : "var(--red)" }}>
              {formatPrice(latestPrice.price)}
              <span style={{ fontSize: "12px", marginLeft: "6px", opacity: 0.8 }}>
                {latestPrice.change >= 0 ? "▲" : "▼"}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Bid</div>
            <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text)" }}>{formatPrice(latestPrice.bid)}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Ask</div>
            <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text)" }}>{formatPrice(latestPrice.ask)}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "4px" }}>Volume</div>
            <div style={{ fontSize: "16px", fontWeight: "500", color: "var(--text)" }}>{formatVolume(latestPrice.volume)}</div>
          </div>
        </div>

        <div
          ref={chartContainerRef}
          style={{
            height: "450px",
            width: "100%",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px",
            overflow: "hidden"
          }}
        />
      </div>
    </div>
  );
}

export default LiveTradingChart;
