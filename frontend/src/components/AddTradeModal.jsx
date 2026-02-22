import { useState, useRef } from "react";
import { tradeService } from "../services/tradeService";
import { strategies, sessions, emotions } from "../data/constants";

function AddTradeModal({ onClose }) {
  const [form, setForm] = useState({
    symbol: "", direction: "LONG", entry: "", exit: "", stopLoss: "", takeProfit: "",
    size: "", strategy: "Breakout", session: "London", emotionBefore: "Neutral",
    emotionAfter: "Neutral", notes: "", tradeDate: new Date().toISOString().split('T')[0],
    screenshotUrl: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const up = (k, v) => {
    console.log('Form update:', k, v ? 'has value' : 'empty');
    if (k === 'screenshotUrl') {
      console.log('Screenshot URL set, length:', v?.length || 0);
      console.log('Screenshot URL starts with:', v?.substring(0, 50) + '...');
    }
    setForm(f => ({ ...f, [k]: v }));
  };
  const pnl = form.entry && form.exit ? ((parseFloat(form.exit) - parseFloat(form.entry)) * (form.direction === "LONG" ? 1 : -1) * parseFloat(form.size || 1)).toFixed(2) : "—";
  const rr = form.entry && form.exit && form.stopLoss ?
    (Math.abs(parseFloat(form.exit) - parseFloat(form.entry)) / Math.abs(parseFloat(form.entry) - parseFloat(form.stopLoss))).toFixed(2) : "—";

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, file.type, file.size);

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // In a real app, you would upload to a service like Cloudinary
      // For now, we'll simulate the upload and create a local URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        console.log('FileReader completed, data URL length:', dataUrl.length);
        console.log('Data URL starts with:', dataUrl.substring(0, 50) + '...');
        up('screenshotUrl', dataUrl);
        setIsUploading(false);
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        alert('Failed to read file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload screenshot');
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const tradeData = {
        symbol: form.symbol,
        direction: form.direction,
        entryPrice: parseFloat(form.entry),
        exitPrice: parseFloat(form.exit) || null,
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
        positionSize: parseFloat(form.size),
        strategy: form.strategy,
        session: form.session,
        emotionBefore: form.emotionBefore,
        emotionAfter: form.emotionAfter,
        notes: form.notes,
        tradeDate: new Date(form.tradeDate).toISOString(),
        screenshotUrl: form.screenshotUrl,
      };

      console.log('Submitting trade with screenshot:', tradeData.screenshotUrl ? 'Yes' : 'No');
      console.log('Screenshot URL length:', tradeData.screenshotUrl?.length || 0);
      console.log('Trade data being sent:', JSON.stringify(tradeData, null, 2));
      console.log('tradeService object:', tradeService);
      console.log('tradeService.createTrade function:', tradeService.createTrade);

      const result = await tradeService.createTrade(tradeData);
      console.log('Trade created successfully:', result);
      onClose();
    } catch (error) {
      console.error('Failed to save trade:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Log Trade</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <div className="form-group">
              <label>Symbol</label>
              <input placeholder="e.g., EURUSD" value={form.symbol} onChange={e => up("symbol", e.target.value.toUpperCase())} />
            </div>
            <div className="form-group">
              <label>Direction</label>
              <select value={form.direction} onChange={e => up("direction", e.target.value)}>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
            <div className="form-group">
              <label>Entry</label>
              <input type="number" step="0.00001" placeholder="1.0850" value={form.entry} onChange={e => up("entry", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Exit</label>
              <input type="number" step="0.00001" placeholder="1.0890" value={form.exit} onChange={e => up("exit", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Stop Loss</label>
              <input type="number" step="0.00001" placeholder="1.0820" value={form.stopLoss} onChange={e => up("stopLoss", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Take Profit</label>
              <input type="number" step="0.00001" placeholder="1.0900" value={form.takeProfit} onChange={e => up("takeProfit", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Position Size</label>
              <input type="number" step="0.01" placeholder="1.0" value={form.size} onChange={e => up("size", e.target.value)} />
            </div>
            <div className="form-group">
              <label>Strategy</label>
              <select value={form.strategy} onChange={e => up("strategy", e.target.value)}>
                {strategies.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Session</label>
              <select value={form.session} onChange={e => up("session", e.target.value)}>
                {sessions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Emotion Before</label>
              <select value={form.emotionBefore} onChange={e => up("emotionBefore", e.target.value)}>
                {emotions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Emotion After</label>
              <select value={form.emotionAfter} onChange={e => up("emotionAfter", e.target.value)}>
                {emotions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Trade Date</label>
              <input
                type="date"
                value={form.tradeDate}
                onChange={e => up("tradeDate", e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--surface2)", borderRadius: 10, padding: "14px", marginTop: "16px" }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Estimated PnL</div>
              <div style={{ fontSize: 22, fontFamily: "var(--font-mono)", fontWeight: 700, color: parseFloat(pnl) >= 0 ? "var(--accent)" : "var(--red)" }}>{pnl !== "—" ? `$${pnl}` : "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Risk:Reward</div>
              <div style={{ fontSize: 22, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text)" }}>{rr !== "—" ? `${rr}R` : "—"}</div>
            </div>
          </div>

          <div className="form-group full" style={{ marginTop: "16px" }}>
            <label>Screenshot</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              {!form.screenshotUrl ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ width: "100%", padding: "20px", borderStyle: "dashed", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "24px" }}>📷</span>
                  <span>{isUploading ? "Uploading..." : "Click to Upload Screenshot"}</span>
                </button>
              ) : (
                <div style={{ position: "relative" }}>
                  <img
                    src={form.screenshotUrl}
                    alt="Trade screenshot"
                    style={{
                      width: "100%",
                      maxHeight: "300px",
                      objectFit: "contain",
                      borderRadius: "8px",
                      border: "1px solid var(--border)"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => up('screenshotUrl', '')}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(239, 68, 68, 0.8)",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      cursor: "pointer",
                      backdropFilter: "blur(4px)"
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group full" style={{ marginTop: "16px" }}>
            <label>Notes</label>
            <textarea placeholder="Trade rationale, market context, lessons learned..." value={form.notes} onChange={e => up("notes", e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            🤖 Save & Analyze with AI
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddTradeModal;
