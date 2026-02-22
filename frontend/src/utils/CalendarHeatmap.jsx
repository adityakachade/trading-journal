import { useState, useEffect } from "react";
import { analyticsService } from "../services/analyticsService";

function CalendarHeatmap() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [tooltips, setTooltips] = useState([]);
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const month = now.getMonth() + 1; // JavaScript months are 0-indexed
        const year = now.getFullYear();
        
        const response = await analyticsService.getCalendarHeatmap(month, year);
        console.log('Calendar heatmap response:', response);
        setCalendarData(response);
        
        // Create 35 days array with actual data, starting from Sunday
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Find the first day of the month and its day of week (0 = Sunday, 6 = Saturday)
        const firstDay = new Date(currentYear, currentMonth, 1);
        const firstDayOfWeek = firstDay.getDay();
        
        const days = Array.from({ length: 35 }, (_, i) => {
          const dayNum = i - firstDayOfWeek + 1; // Adjust for week start
          const dayData = response.find(d => d._id && new Date(d._id).getDate() === dayNum);
          
          // Only show days within the current month
          if (dayNum < 1 || dayNum > new Date(currentYear, currentMonth + 1, 0).getDate()) {
            return "heat-empty";
          }
          
          if (!dayData || dayData.trades === 0) return "heat-0";
          
          const pnl = dayData.pnl || 0;
          if (pnl > 0) {
            // Win day - intensity based on profit amount
            if (pnl > 500) return "heat-3";
            if (pnl > 200) return "heat-2";
            return "heat-1";
          } else if (pnl < 0) {
            // Loss day
            return "heat-loss";
          }
          return "heat-0";
        });
        
        // Update tooltip to show actual date info
        const tooltips = Array.from({ length: 35 }, (_, i) => {
          const dayNum = i - firstDayOfWeek + 1;
          
          // Only show tooltips for days within the current month
          if (dayNum < 1 || dayNum > new Date(currentYear, currentMonth + 1, 0).getDate()) {
            return "";
          }
          
          const dayData = response.find(d => d._id && new Date(d._id).getDate() === dayNum);
          if (!dayData) return `Day ${dayNum}: No trades`;
          return `Day ${dayNum}: ${dayData.trades} trades, PnL: ₹${dayData.pnl.toFixed(2)}`;
        });
        
        setHeatmapData(days);
        setTooltips(tooltips);
      } catch (error) {
        console.error('Failed to fetch calendar data:', error);
        // Fallback to random data
        setHeatmapData(Array.from({ length: 35 }, (_, i) => {
          const r = Math.random();
          if (r < 0.3) return "heat-0";
          if (r < 0.4) return "heat-loss";
          if (r < 0.55) return "heat-1";
          if (r < 0.75) return "heat-2";
          return "heat-3";
        }));
        setTooltips(Array.from({ length: 35 }, (_, i) => `Day ${i + 1}: Sample data`));
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, []);

  const days = ["S", "M", "T", "W", "T", "F", "S"];
  
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "120px" }}>
        <div>Loading calendar...</div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div className="heat-labels">{days.map((d, i) => <div key={i} className="heat-day-label">{d}</div>)}</div>
      <div className="heatmap">
        {heatmapData.map((c, i) => {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          const firstDay = new Date(currentYear, currentMonth, 1);
          const firstDayOfWeek = firstDay.getDay();
          const dayNum = i - firstDayOfWeek + 1;
          
          // Only show date numbers for days within the current month
          const showDate = dayNum >= 1 && dayNum <= new Date(currentYear, currentMonth + 1, 0).getDate();
          
          // Get day data for PnL display
          const dayData = calendarData.find(d => d._id && new Date(d._id).getDate() === dayNum);
          
          return (
            <div 
              key={i} 
              className={`heat-cell ${c === "heat-empty" ? "heat-empty" : c}`} 
              title={tooltips[i] || (showDate ? `Day ${dayNum}: No trades` : "")}
            >
              {showDate && (
                <div style={{ 
                  fontSize: window.innerWidth <= 768 ? "7px" : "8px", 
                  color: "rgba(255,255,255,0.7)", 
                  textAlign: "center",
                  lineHeight: "1",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center"
                }}>
                  <div>{dayNum}</div>
                  {c !== "heat-0" && c !== "heat-empty" && dayData && (
                    <div style={{ 
                      fontSize: window.innerWidth <= 768 ? "5px" : "6px", 
                      fontWeight: "bold",
                      marginTop: "1px"
                    }}>
                      ₹{Math.abs(dayData.pnl).toFixed(0)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: window.innerWidth <= 768 ? 8 : 12, marginTop: 12, fontSize: window.innerWidth <= 768 ? 9 : 10, color: "var(--muted)", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--surface2)" }} />No trades</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(239,68,68,0.3)" }} />Loss day</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(0,212,170,0.6)" }} />Win day</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(0,212,170,0.9)" }} />Big win day</span>
      </div>
    </div>
  );
}

export default CalendarHeatmap;
