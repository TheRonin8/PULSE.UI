import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/axiosInstance";
import { getSensorByUser } from "../api/sensorsapi";

// ─── KPI API calls ──────────────────────────────────────────────────────────
const createKPI      = (payload) =>
  api.post("/api/KPIs", {
    KPIName: payload.name,
    KPIFormula: payload.formula,
    Frequency: payload.frequency || "5min",
  });

const fetchKPIs        = (createdByMe)     => api.get(createdByMe ? "/api/KPIs?createdbyMe=true" : "/api/KPIs");
const fetchKPILatest   = (kpiId)           => api.get(`/api/KPIs/${kpiId}/latest`);
// Batch fetch: POST /api/KPIs/latest-batch  { kpiIds: [1,2,6,7] }
// Returns [{ kpiId, value, resultValue, calculatedAt, error }, ...]
const fetchKPILatestBatch = (kpiIds)       => api.post("/api/KPIs/latest-batch", { kpiIds });
const fetchKPITrend    = (kpiId, interval) => api.get(`/api/KPIs/${kpiId}/trend?interval=${interval}`);
const updateKPI        = (kpiId, payload)  => api.put(`/api/KPIs/${kpiId}`, payload);
const softDeleteKPI    = (kpiId)           => api.delete(`/api/KPIs/${kpiId}`);
const restoreKPI       = (kpiId)           => api.patch(`/api/KPIs/${kpiId}/restore`);
const hardDeleteKPI    = (kpiId)           => api.delete(`/api/KPIs/${kpiId}/hard`);
const fetchDeletedKPIs = ()                => api.get("/api/KPIs/deleted");

// ─── Trend interval options ──────────────────────────────────────────────────
const TREND_INTERVALS = [
  { label: "30m",  param: "30min"  },
  { label: "1h",   param: "1hr"    },
  { label: "3h",   param: "3hr"    },
  { label: "6h",   param: "6hr"    },
  { label: "12h",  param: "12hr"   },
  
  { label: "1d",   param: "1day"   },
  { label: "2d",   param: "2days"  },
  { label: "1w",   param: "1week"  },
  { label: "2w",   param: "2weeks" },
  { label: "1mo",  param: "1month" },
];

// ─── Utilities ───────────────────────────────────────────────────────────────
const FREQ_MS = {
  "1min": 60_000, "5min": 300_000, "15min": 900_000,
  "30min": 1_800_000, "1hr": 3_600_000, "6hr": 21_600_000,
  "12hr": 43_200_000,
};
const freqToMs = (f) => FREQ_MS[f] ?? 300_000;

const formatCountdown = (secs) => {
  if (secs >= 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${secs}s`;
};

const formatRelTime = (date) => {
  if (!date) return null;
  const diff = Math.round((Date.now() - date) / 1000);
  if (diff < 5)    return "just now";
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const parseApiValue = (raw) => {
  const candidate =
    raw?.value ?? raw?.kpiValue ?? raw?.kpi_value ?? raw?.latestValue ??
    raw?.latest_value ?? raw?.result ??
    (Array.isArray(raw) && raw.length > 0
      ? (raw[0]?.value ?? raw[0]?.kpiValue ?? raw[0])
      : undefined) ??
    (typeof raw === "number" ? raw : null);
  if (candidate === null || candidate === undefined || isNaN(parseFloat(candidate))) return null;
  return Number(parseFloat(candidate).toFixed(2));
};

const formatChartLabel = (isoString, intervalParam) => {
  const d = new Date(isoString);
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const shortIntervals = ["30min", "1hr", "3hr"];
  if (shortIntervals.includes(intervalParam)) {
    // time only — single line
    return timeStr;
  }
  // date + time — two parts separated by space so TrendChart can split them
  const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
  return `${dateStr} ${timeStr}`;
};

const COLOR_MAP   = ["#00c6ae","#0f8fd4","#7b5ea7","#f39c12","#e74c3c","#2ecc71","#e91e63"];
const ICON_MAP    = {
  availability: "bi-check2-circle", performance: "bi-speedometer2",
  quality: "bi-award", oee: "bi-graph-up", downtime: "bi-clock-history",
};
const FX_FUNCS    = ["SUM","AVG","MAX","MIN","COUNT"];
const FREQUENCIES = ["1min","5min","15min","30min","1hr","6hr","12hr",];
const MAX_HISTORY = 120;

// ─── TrendChart canvas ───────────────────────────────────────────────────────
const TrendChart = ({ data, color, labels, rawDates }) => {
  const ref        = useRef(null);
  const wrapRef    = useRef(null);
  const tooltipRef = useRef(null);

  // ── draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas || !data.length) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth  || 540;
    const cssH = canvas.clientHeight || 240;
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const W = cssW, H = cssH;

    // Padding: left wide for Y labels, bottom tall for 2-line X labels
    const PL = 62, PR = 20, PT = 22, PB = 52;
    const pw = W - PL - PR, ph = H - PT - PB;
    const n  = data.length;
    const minV = Math.min(...data), maxV = Math.max(...data);
    const rng  = maxV - minV || 1;

    const xOf = (i) => PL + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
    const yOf = (v) => PT + ph - ((v - minV) / rng) * ph;

    ctx.clearRect(0, 0, W, H);

    // ── Y grid lines + labels ──────────────────────────────────────────────
    const Y_TICKS = 5;
    for (let i = 0; i <= Y_TICKS; i++) {
      const val = minV + (rng * i) / Y_TICKS;
      const y   = PT + ph - (ph * i) / Y_TICKS;

      // grid line
      ctx.strokeStyle = "rgba(140,140,140,0.10)";
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PL + pw, y); ctx.stroke();
      ctx.setLineDash([]);

      // label — compact number formatting
      const absVal = Math.abs(val);
      let label;
      if (absVal >= 1_000_000)     label = (val / 1_000_000).toFixed(1) + "M";
      else if (absVal >= 1_000)    label = (val / 1_000).toFixed(1)     + "K";
      else if (Number.isInteger(val) || absVal >= 100) label = val.toFixed(0);
      else                         label = val.toFixed(2);

      ctx.font      = "bold 10px -apple-system, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(120,120,130,0.95)";
      ctx.fillText(label, PL - 8, y + 3.5);
    }

    // ── X axis tick selection ──────────────────────────────────────────────
    // Decide max ticks that fit without overlap (~55px each)
    const maxTicks = Math.max(2, Math.min(n, Math.floor(pw / 72)));
    const step     = n <= maxTicks ? 1 : Math.ceil((n - 1) / (maxTicks - 1));
    const tickIdxs = [];
    for (let i = 0; i < n; i += step) tickIdxs.push(i);
    if (tickIdxs[tickIdxs.length - 1] !== n - 1) tickIdxs.push(n - 1);

    // ── X vertical guide lines ────────────────────────────────────────────
    tickIdxs.forEach(idx => {
      const x = xOf(idx);
      ctx.strokeStyle = "rgba(140,140,140,0.07)";
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PT + ph); ctx.stroke();
      ctx.setLineDash([]);
    });

    // ── Axes ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(140,140,140,0.20)";
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PL, PT); ctx.lineTo(PL, PT + ph); ctx.lineTo(PL + pw, PT + ph);
    ctx.stroke();

    // ── Gradient fill ─────────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(0, PT, 0, PT + ph);
    grad.addColorStop(0, color + "45");
    grad.addColorStop(0.7, color + "12");
    grad.addColorStop(1, color + "02");

    // ── Line path ─────────────────────────────────────────────────────────
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = xOf(i), y = yOf(v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.2;
    ctx.lineJoin    = "round";
    ctx.lineCap     = "round";
    ctx.stroke();

    // ── Fill area ─────────────────────────────────────────────────────────
    ctx.lineTo(xOf(n - 1), PT + ph);
    ctx.lineTo(xOf(0),     PT + ph);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Small dots at every data point ────────────────────────────────────
    if (n <= 40) {
      data.forEach((v, i) => {
        const x = xOf(i), y = yOf(v);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color + "90";
        ctx.fill();
      });
    }

    // ── Glow dot at last point ────────────────────────────────────────────
    const lx = xOf(n - 1), ly = yOf(data[n - 1]);
    ctx.shadowColor = color;
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;
    // white ring
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // ── X axis labels (2-line: date + time) ──────────────────────────────
    ctx.textAlign = "center";
    tickIdxs.forEach(idx => {
      const x     = xOf(idx);
      const label = labels[idx] || "";
      // split on space: "4/22 15:08" → ["4/22", "15:08"]
      const parts = label.split(" ");
      const line1 = parts[0] || "";
      const line2 = parts[1] || "";

      // tick mark
      ctx.strokeStyle = "rgba(140,140,140,0.30)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, PT + ph); ctx.lineTo(x, PT + ph + 5);
      ctx.stroke();

      if (line2) {
        // date line (smaller, muted)
        ctx.font      = "10px -apple-system, system-ui, sans-serif";
        ctx.fillStyle = "rgba(140,140,150,0.75)";
        ctx.fillText(line1, x, PT + ph + 18);
        // time line (bolder)
        ctx.font      = "bold 10.5px -apple-system, system-ui, sans-serif";
        ctx.fillStyle = "rgba(80,80,100,0.90)";
        ctx.fillText(line2, x, PT + ph + 32);
      } else {
        // single-line label (time only for short intervals)
        ctx.font      = "bold 10.5px -apple-system, system-ui, sans-serif";
        ctx.fillStyle = "rgba(80,80,100,0.90)";
        ctx.fillText(line1, x, PT + ph + 22);
      }
    });
  }, [data, color, labels]);

  // redraw on data change
  useEffect(() => { draw(); }, [draw]);

  // redraw on resize
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  // ── hover tooltip ─────────────────────────────────────────────────────────
  const handleMouseMove = (e) => {
    const canvas = ref.current;
    const tip    = tooltipRef.current;
    if (!canvas || !tip || !data.length) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const PL   = 62, PR = 20;
    const pw   = rect.width - PL - PR;
    const n    = data.length;
    const rel  = (mx - PL) / pw;
    const idx  = Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1))));
    tip.style.display = "block";
    tip.style.left    = Math.min(mx + 12, rect.width - 120) + "px";
    tip.style.top     = "12px";
    tip.innerHTML     = `<div style="font-size:10px;color:rgba(120,120,130,0.9);margin-bottom:2px">${labels[idx] || ""}</div><div style="font-size:13px;font-weight:800;color:${color}">${data[idx]}</div>`;
  };
  const handleMouseLeave = () => {
    const tip = tooltipRef.current;
    if (tip) tip.style.display = "none";
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: 240 }}>
      <canvas
        ref={ref}
        style={{ display: "block", width: "100%", height: "100%" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      <div
        ref={tooltipRef}
        style={{
          display: "none", position: "absolute", pointerEvents: "none",
          background: "var(--sb-white)", border: "1px solid var(--sb-border)",
          borderRadius: 8, padding: "6px 10px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          minWidth: 90,
        }}
      />
    </div>
  );
};

// ─── TrendPopup — real /trend API ─────────────────────────────────────────────
const TrendPopup = ({ kpi, onClose }) => {
  const [selected, setSelected] = useState(TREND_INTERVALS[6]); // "1d" default
  const [trendData, setTrendData]     = useState([]);
  const [trendLabels, setTrendLabels] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const loadTrend = useCallback(async (interval) => {
    setLoading(true);
    setError(null);
    try {
      const res    = await fetchKPITrend(kpi.id, interval.param);
      const raw    = Array.isArray(res.data) ? res.data : [];
      if (!raw.length) { setTrendData([]); setTrendLabels([]); setLoading(false); return; }
      // API returns newest-first → reverse for chronological display
      const sorted  = [...raw].reverse();
      const values  = sorted.map(r => Number(parseFloat(r.resultValue).toFixed(2)));
      const labels  = sorted.map(r => formatChartLabel(r.calculatedAt, interval.param));
      setTrendData(values);
      setTrendLabels(labels);
    } catch { setError("Failed to load trend data."); }
    finally { setLoading(false); }
  }, [kpi.id]);

  useEffect(() => { loadTrend(selected); }, [selected, loadTrend]);

  const min = trendData.length ? Math.min(...trendData).toFixed(2) : "—";
  const max = trendData.length ? Math.max(...trendData).toFixed(2) : "—";
  const avg = trendData.length
    ? (trendData.reduce((s, v) => s + v, 0) / trendData.length).toFixed(2)
    : "—";

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.52)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}
    >
      <div
        style={{ width:"100%", maxWidth:600, background:"var(--sb-white)", border:"1px solid var(--sb-border)", borderRadius:22, padding:26, boxShadow:"0 28px 72px rgba(0,0,0,0.24)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:kpi.color+"1e", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <i className={`bi ${kpi.icon}`} style={{ color:kpi.color, fontSize:"1.2rem" }} />
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:"var(--sb-text)", letterSpacing:"-0.3px" }}>{kpi.name}</div>
              <div style={{ fontSize:11, color:"var(--sb-muted)", marginTop:1 }}>
                Trend Analysis &nbsp;·&nbsp; Real data from backend
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background:"var(--sb-light-bg)", border:"1px solid var(--sb-border)", borderRadius:9, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--sb-muted)", fontSize:20, fontWeight:700, lineHeight:1 }}
          >×</button>
        </div>

        {/* Live value bar */}
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:16, padding:"12px 18px", background:kpi.color+"0e", borderRadius:13, border:`1px solid ${kpi.color}26` }}>
          <span style={{ fontSize:34, fontWeight:900, color:kpi.color, lineHeight:1, letterSpacing:"-1.5px", fontVariantNumeric:"tabular-nums" }}>
            {kpi._liveVal ?? "—"}
          </span>
          {kpi.unit && <span style={{ fontSize:15, color:"var(--sb-muted)", fontWeight:500 }}>{kpi.unit}</span>}
          <span style={{ marginLeft:"auto", fontSize:11, color:"var(--sb-muted)", fontFamily:"monospace", background:"var(--sb-light-bg)", padding:"3px 9px", borderRadius:7, border:"1px solid var(--sb-border)" }}>
            fx: {kpi.formula}
          </span>
        </div>

        {/* Interval pills */}
        <div style={{ display:"flex", gap:5, marginBottom:13, flexWrap:"wrap" }}>
          {TREND_INTERVALS.map(iv => (
            <button
              key={iv.param}
              onClick={() => setSelected(iv)}
              style={{
                flex: "0 0 auto",
                fontSize: 11,
                padding: "5px 11px",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
                border: "1.5px solid",
                transition: "all 0.15s",
                background:   selected.param === iv.param ? kpi.color : "var(--sb-light-bg)",
                color:        selected.param === iv.param ? "#fff"     : "var(--sb-muted)",
                borderColor:  selected.param === iv.param ? kpi.color  : "var(--sb-border)",
              }}
            >{iv.label}</button>
          ))}
        </div>

        {/* Chart */}
        <div style={{ borderRadius:13, background:"var(--sb-light-bg)", border:"1px solid var(--sb-border)", padding:"14px 12px 10px", minHeight:280, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {loading ? (
            <div style={{ textAlign:"center", color:"var(--sb-muted)", padding:"24px 0" }}>
              <div className="spinner-border" style={{ color:kpi.color, width:"1.8rem", height:"1.8rem" }} />
              <div style={{ fontSize:12, marginTop:8 }}>Loading trend data…</div>
            </div>
          ) : error ? (
            <div style={{ textAlign:"center", color:"#e53e3e", fontSize:13, padding:"24px 0" }}>
              <i className="bi bi-exclamation-circle" style={{ fontSize:"1.6rem", display:"block", marginBottom:8 }} />
              {error}
            </div>
          ) : trendData.length === 0 ? (
            <div style={{ textAlign:"center", color:"var(--sb-muted)", fontSize:13, padding:"24px 0" }}>
              <i className="bi bi-bar-chart" style={{ fontSize:"2rem", display:"block", marginBottom:10, opacity:0.3 }} />
              No data available for this interval.
            </div>
          ) : (
            <TrendChart data={trendData} color={kpi.color} labels={trendLabels} />
          )}
        </div>

        {/* Min / Avg / Max */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:14, padding:"12px 18px", background:"var(--sb-light-bg)", borderRadius:12, border:"1px solid var(--sb-border)" }}>
          {[["Min", min, "var(--sb-text)"], ["Avg", avg, kpi.color], ["Max", max, "var(--sb-text)"]].map(([label, val, col]) => (
            <div key={label} style={{ textAlign:"center", flex:1 }}>
              <div style={{ fontSize:10, color:"var(--sb-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.7px" }}>{label}</div>
              <div style={{ fontSize:20, fontWeight:900, color:col, marginTop:3, letterSpacing:"-0.5px" }}>{val}</div>
              <div style={{ fontSize:9, color:"var(--sb-muted)", marginTop:2 }}>{trendData.length} data pts</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Edit KPI Modal ───────────────────────────────────────────────────────────
const EditKPIModal = ({ kpi, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name:      kpi.name      || "",
    formula:   kpi.formula   || "",
    frequency: kpi.frequency || "5min",
    isActive:  kpi.isActive  !== false,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "KPI name is required.";
    if (!form.formula.trim()) e.formula = "Formula is required.";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setErrMsg("");
    try {
      await updateKPI(kpi.id, {
        kpiName:    form.name.trim(),
        kpiFormula: form.formula.trim(),
        frequency:  form.frequency,
        isActive:   form.isActive,
      });
      onSaved(form);
    } catch (ex) {
      setErrMsg(ex?.response?.data?.message || "Failed to update KPI.");
    } finally {
      setSaving(false);
    }
  };

  // reuse the same field styles as the Add form
  const fieldStyle = (hasErr) => ({
    width: "100%", background: "var(--sb-light-bg)",
    border: `1px solid ${hasErr ? "#e53e3e" : "var(--sb-border)"}`,
    borderRadius: 8, padding: "7px 11px",
    color: "var(--sb-text)", fontSize: "0.85rem",
    outline: "none", fontFamily: "inherit", transition: "border-color 0.2s",
  });
  const labelStyle = {
    fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.8px",
    textTransform: "uppercase", color: "var(--sb-muted)",
    marginBottom: 4, display: "block",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1055,
        background: "rgba(0,0,0,0.48)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--sb-white)", borderRadius: 18,
          boxShadow: "0 20px 56px rgba(0,0,0,0.16)", overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "16px 22px 14px", borderBottom: "1px solid var(--sb-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h5 style={{ margin: 0, fontWeight: 800, color: "var(--sb-text)", fontSize: "1rem" }}>
              <i className="bi bi-pencil-square me-2" style={{ color: "var(--sb-accent)" }} />
              Edit KPI
            </h5>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--sb-muted)", marginTop: 2 }}>
              Editing: <strong>{kpi.name}</strong>
            </p>
          </div>
          <button className="btn-close" onClick={onClose} />
        </div>

        {/* Body */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {errMsg && (
            <div style={{
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.25)",
              fontSize: "0.78rem", color: "#e53e3e", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <i className="bi bi-exclamation-circle-fill" />{errMsg}
            </div>
          )}

          {/* KPI Name */}
          <div>
            <label style={labelStyle}>KPI Name *</label>
            <input
              style={fieldStyle(errors.name)}
              placeholder="e.g. Machine Efficiency"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(v => ({ ...v, name: "" })); }}
            />
            {errors.name && <p style={{ fontSize: "0.66rem", color: "#e53e3e", margin: "3px 0 0" }}>{errors.name}</p>}
          </div>

          {/* Formula */}
          <div>
            <label style={labelStyle}>Formula *</label>
            <input
              style={fieldStyle(errors.formula)}
              placeholder="e.g. AVG(sensor_1)"
              value={form.formula}
              onChange={e => { setForm(f => ({ ...f, formula: e.target.value })); setErrors(v => ({ ...v, formula: "" })); }}
            />
            {errors.formula && <p style={{ fontSize: "0.66rem", color: "#e53e3e", margin: "3px 0 0" }}>{errors.formula}</p>}
          </div>

          {/* Frequency */}
          <div>
            <label style={labelStyle}>Frequency</label>
            <select
              style={{ ...fieldStyle(false), cursor: "pointer" }}
              value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
            >
              {FREQUENCIES.map(freq => <option key={freq} value={freq}>{freq}</option>)}
            </select>
          </div>

          {/* isActive toggle row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "11px 14px", borderRadius: 10,
            background: form.isActive ? "rgba(0,198,174,0.07)" : "var(--sb-light-bg)",
            border: `1px solid ${form.isActive ? "rgba(0,198,174,0.22)" : "var(--sb-border)"}`,
            transition: "all 0.2s",
          }}>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--sb-text)" }}>Active</div>
              <div style={{ fontSize: "0.72rem", color: "var(--sb-muted)", marginTop: 1 }}>
                KPI will be calculated on schedule when active
              </div>
            </div>
            <div
              onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              style={{
                width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                background: form.isActive ? "#00c6ae" : "var(--sb-border)",
                position: "relative", cursor: "pointer", transition: "background 0.25s",
                boxShadow: form.isActive ? "0 0 0 3px rgba(0,198,174,0.22)" : "none",
              }}
            >
              <div style={{
                position: "absolute", top: 2, left: form.isActive ? 22 : 2,
                width: 20, height: 20, borderRadius: "50%",
                background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
                transition: "left 0.22s cubic-bezier(.4,0,.2,1)",
              }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px", borderTop: "1px solid var(--sb-border)",
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button
            style={{
              padding: "7px 18px", borderRadius: 8,
              border: "1.5px solid var(--sb-border)", background: "none",
              color: "var(--sb-text)", fontWeight: 600, cursor: "pointer", fontSize: "0.87rem",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn sb-connect-btn"
            style={{ borderRadius: 8, padding: "7px 20px", fontWeight: 600, fontSize: "0.87rem" }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</>
              : <><i className="bi bi-check2 me-2" />Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ kpi, lastRefreshed, isRefreshing, isAdmin, isOperator, onDelete, onShowTrend, onEdit }) => {
  const [relTime, setRelTime]             = useState(() => formatRelTime(lastRefreshed));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setRelTime(formatRelTime(lastRefreshed));
    const t = setInterval(() => setRelTime(formatRelTime(lastRefreshed)), 10_000);
    return () => clearInterval(t);
  }, [lastRefreshed]);

  const val       = kpi._liveVal;
  const noData    = val === null || val === undefined || !kpi.formula?.trim();
  const isDeleted = kpi.isDeleted;

  // Card backgrounds: green gradient for active, red gradient for no data
  const cardBg = isDeleted
    ? "var(--sb-white)"
    : noData
    ? "linear-gradient(145deg, rgba(229,62,62,0.12) 0%, rgba(255,248,248,0.98) 60%, rgba(255,255,255,1) 100%)"
    : "linear-gradient(145deg, rgba(0,198,174,0.10) 0%, rgba(240,255,253,0.98) 60%, rgba(255,255,255,1) 100%)";

  const topBar   = isDeleted ? "#ccc" : noData ? "#e53e3e" : kpi.color;
  const iconCol  = isDeleted ? "#aaa" : noData ? "#e53e3e" : kpi.color;

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 18,
        border: isDeleted
          ? "1.5px dashed #ddd"
          : noData
          ? "1.5px solid rgba(229,62,62,0.22)"
          : "1.5px solid rgba(0,198,174,0.22)",
        padding: "22px 20px 16px",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.2s, transform 0.2s",
        opacity: isDeleted ? 0.62 : 1,
        position: "relative",
        overflow: "hidden",
        minHeight: 220,
      }}
      onMouseEnter={e => { if (!isDeleted) { e.currentTarget.style.boxShadow="0 10px 32px rgba(0,0,0,0.11)"; e.currentTarget.style.transform="translateY(-3px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow=""; e.currentTarget.style.transform=""; }}
    >
      {/* Top colour bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:topBar, borderRadius:"18px 18px 0 0" }} />

      

      {/* Header row: icon + name + badge */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14, marginTop:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:iconCol+"1c", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <i className={`bi ${kpi.icon}`} style={{ color:iconCol, fontSize:"1.15rem" }} />
          </div>
          <div>
            <h3 style={{ fontSize:"1.02rem", fontWeight:800, color:"var(--sb-text)", margin:0, lineHeight:1.2, letterSpacing:"-0.3px" }}>{kpi.name}</h3>
            <span style={{ fontSize:"0.68rem", color:"var(--sb-muted)" }}>Every {kpi.frequency}</span>
          </div>
        </div>

        {/* Status badge */}
        {isDeleted ? (
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.68rem", fontWeight:700, padding:"3px 10px", borderRadius:50, background:"rgba(150,150,150,0.10)", color:"#999", border:"1px solid #ddd", whiteSpace:"nowrap" }}>
            <i className="bi bi-trash3" style={{ fontSize:"0.6rem" }} />Deleted
          </span>
        ) : noData ? (
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.68rem", fontWeight:700, padding:"3px 10px", borderRadius:50, background:"rgba(229,62,62,0.10)", color:"#e53e3e", border:"1px solid rgba(229,62,62,0.22)", whiteSpace:"nowrap" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#e53e3e", display:"inline-block" }} />No Data
          </span>
        ) : (
          <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.68rem", fontWeight:700, padding:"3px 10px", borderRadius:50, background:"rgba(0,198,174,0.10)", color:"#00c6ae", border:"1px solid rgba(0,198,174,0.22)", whiteSpace:"nowrap" }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#00c6ae", display:"inline-block", animation:"pulseDot 2s infinite" }} />Active
          </span>
        )}
      </div>

      {/* ── BIG VALUE / ERROR BOX ── */}
      <div style={{
        marginBottom: 14,
        padding: "16px 18px",
        borderRadius: 13,
        flex: 1,
        display: "flex",
        alignItems: "center",
        background: noData
          ? "rgba(229,62,62,0.07)"
          : isDeleted
          ? "rgba(150,150,150,0.06)"
          : "rgba(0,198,174,0.07)",
        border: `1px solid ${noData ? "rgba(229,62,62,0.14)" : isDeleted ? "#eee" : "rgba(0,198,174,0.14)"}`,
      }}>
        {isDeleted ? (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <i className="bi bi-trash3" style={{ color:"#bbb", fontSize:"1.5rem" }} />
            <span style={{ fontSize:"0.82rem", color:"#aaa", fontWeight:600 }}>This KPI has been deleted</span>
          </div>
        ) : noData ? (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ color:"#e53e3e", fontSize:"1.6rem", flexShrink:0 }} />
            <div>
              <div style={{ fontSize:"0.82rem", color:"#e53e3e", fontWeight:700, lineHeight:1.3 }}>
                {!kpi.formula?.trim() ? "No formula configured" : "Data not Available"}
              </div>
              <div style={{ fontSize:"0.68rem", color:"rgba(229,62,62,0.65)", marginTop:3 }}>
                Check Sensor Data
              </div>
            </div>
          </div>
        ) : (
          <div style={{ width:"100%" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:7 }}>
              {/* ── BIG NUMBER ── */}
              <span style={{
                fontSize: "3.2rem",
                fontWeight: 900,
                color: kpi.color,
                lineHeight: 1,
                letterSpacing: "-2.5px",
                fontVariantNumeric: "tabular-nums",
              }}>{val}</span>
              {kpi.unit && (
                <span style={{ fontSize:"1.05rem", color:"var(--sb-muted)", fontWeight:500 }}>{kpi.unit}</span>
              )}
            </div>
            {isRefreshing && (
              <div style={{ marginTop:6, display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.68rem", color:"var(--sb-accent)", fontWeight:600 }}>
                <i className="bi bi-arrow-repeat spinning" style={{ fontSize:"0.68rem" }} />Refreshing…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Formula tag */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <span style={{ fontSize:"0.62rem", fontWeight:800, padding:"1px 6px", borderRadius:5, background:iconCol+"1c", color:iconCol, flexShrink:0 }}>fx</span>
        <span style={{ fontSize:"0.71rem", fontFamily:"monospace", color:"var(--sb-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={kpi.formula || "No formula"}>
          {kpi.formula ? (kpi.formula.length > 32 ? kpi.formula.slice(0,32)+"…" : kpi.formula) : "—"}
        </span>
      </div>

      {/* Updated time */}
      {!noData && !isDeleted && relTime && (
        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2, fontSize:"0.65rem", color:"var(--sb-muted)" }}>
          <i className="bi bi-clock" style={{ fontSize:"0.63rem" }} />
          Updated {relTime}
          {(kpi._history?.length ?? 0) > 0 &&
            <span style={{ color:"var(--sb-accent)", fontWeight:600 }}>· {kpi._history.length} readings</span>}
        </div>
      )}

      {/* Divider + action row */}
      <div style={{ borderTop:"1px solid var(--sb-border)", paddingTop:11, marginTop:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        {!isDeleted && !noData ? (
          <button
            onClick={() => onShowTrend(kpi)}
            style={{ display:"inline-flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"var(--sb-accent)", fontSize:"0.8rem", fontWeight:700, padding:0 }}
            onMouseEnter={e => e.currentTarget.style.opacity="0.7"}
            onMouseLeave={e => e.currentTarget.style.opacity="1"}
          >
            <i className="bi bi-bar-chart-line" style={{ fontSize:"0.8rem" }} />View Trend
          </button>
        ) : <span />}

        {(isAdmin || isOperator) && (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {!isDeleted && !confirmDelete && (
              <>
                <button
                  onClick={() => onEdit(kpi)}
                  style={{ display:"inline-flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", color:"var(--sb-accent)", fontSize:"0.8rem", fontWeight:700, padding:0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity="0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity="1"}
                >
                  <i className="bi bi-pencil" style={{ fontSize:"0.78rem" }} />Edit
                </button>
                <span style={{ width:1, height:14, background:"var(--sb-border)", display:"inline-block" }} />
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ display:"inline-flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", color:"#e53e3e", fontSize:"0.8rem", fontWeight:700, padding:0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity="0.7"}
                  onMouseLeave={e => e.currentTarget.style.opacity="1"}
                >
                  <i className="bi bi-trash3" style={{ fontSize:"0.78rem" }} />Delete
                </button>
              </>
            )}
            {!isDeleted && confirmDelete && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:"0.7rem", color:"#e53e3e", fontWeight:700 }}>Sure?</span>
                <button onClick={() => { onDelete(kpi); setConfirmDelete(false); }}
                  style={{ padding:"3px 10px", borderRadius:7, border:"1px solid #e53e3e", background:"#e53e3e", color:"#fff", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>Yes</button>
                <button onClick={() => setConfirmDelete(false)}
                  style={{ padding:"3px 10px", borderRadius:7, border:"1px solid var(--sb-border)", background:"var(--sb-light-bg)", color:"var(--sb-text)", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>No</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Restore Deleted Modal ────────────────────────────────────────────────────
const RestoreDeletedModal = ({ onClose, onRestored, isAdmin }) => {
  const [deletedKpis, setDeletedKpis]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [msg, setMsg]                     = useState("");

  useEffect(() => {
    fetchDeletedKPIs()
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setDeletedKpis(data.map((k, i) => ({
          id: k.kpiId, name: k.kpiName, formula: k.kpiFormula,
          frequency: k.frequency, color: COLOR_MAP[i % COLOR_MAP.length],
          icon: ICON_MAP[k.kpiName?.toLowerCase()] || "bi-graph-up",
        })));
      })
      .catch(() => setMsg("Failed to load deleted KPIs."))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async (kpi) => {
    setActionLoading(kpi.id + "_restore");
    try {
      await restoreKPI(kpi.id);
      setDeletedKpis(prev => prev.filter(k => k.id !== kpi.id));
      setMsg(`"${kpi.name}" restored successfully.`);
      onRestored();
      setTimeout(() => setMsg(""), 2500);
    } catch { setMsg("Restore failed."); }
    finally { setActionLoading(null); }
  };

  const handleHardDelete = async (kpi) => {
    setActionLoading(kpi.id + "_hard");
    try {
      await hardDeleteKPI(kpi.id);
      setDeletedKpis(prev => prev.filter(k => k.id !== kpi.id));
      setMsg(`"${kpi.name}" permanently deleted.`);
      setTimeout(() => setMsg(""), 2500);
    } catch { setMsg("Permanent delete failed."); }
    finally { setActionLoading(null); }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(0,0,0,0.48)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ width:"100%", maxWidth:560, background:"var(--sb-white)", borderRadius:20, border:"1px solid var(--sb-border)", boxShadow:"0 24px 64px rgba(0,0,0,0.18)", overflow:"hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:"16px 22px", borderBottom:"1px solid var(--sb-border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h5 style={{ margin:0, fontWeight:700, color:"var(--sb-text)", fontSize:"1rem" }}>
              <i className="bi bi-arrow-counterclockwise me-2" style={{ color:"#f39c12" }} />Deleted KPIs
            </h5>
            <p style={{ margin:0, fontSize:"0.72rem", color:"var(--sb-muted)", marginTop:2 }}>Restore or permanently remove deleted KPIs</p>
          </div>
          <button onClick={onClose} style={{ background:"var(--sb-light-bg)", border:"1px solid var(--sb-border)", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--sb-muted)", fontSize:16 }}>×</button>
        </div>
        <div style={{ padding:"16px 22px", maxHeight:"60vh", overflowY:"auto" }}>
          {msg && <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(0,198,174,0.08)", border:"1px solid rgba(0,198,174,0.2)", color:"#00c6ae", fontSize:"0.8rem", fontWeight:600, marginBottom:12 }}>{msg}</div>}
          {loading ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}><div className="spinner-border spinner-border-sm" style={{ color:"var(--sb-accent)" }} /></div>
          ) : deletedKpis.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"var(--sb-muted)" }}>
              <i className="bi bi-check2-circle" style={{ fontSize:"2rem", display:"block", marginBottom:8 }} />No deleted KPIs found.
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {deletedKpis.map(kpi => (
                <div key={kpi.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:12, border:"1.5px dashed var(--sb-border)", background:"var(--sb-light-bg)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:kpi.color+"22", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <i className={`bi ${kpi.icon}`} style={{ color:kpi.color, fontSize:"0.9rem" }} />
                    </div>
                    <div>
                      <div style={{ fontSize:"0.88rem", fontWeight:700, color:"var(--sb-text)" }}>{kpi.name}</div>
                      <div style={{ fontSize:"0.72rem", color:"var(--sb-muted)", fontFamily:"monospace" }}>{kpi.formula || "No formula"}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => handleRestore(kpi)} disabled={!!actionLoading}
                      style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"5px 12px", borderRadius:8, border:"1px solid rgba(0,198,174,0.35)", background:"rgba(0,198,174,0.08)", color:"#00c6ae", fontSize:"0.76rem", fontWeight:700, cursor:"pointer" }}>
                      {actionLoading===kpi.id+"_restore"?<span className="spinner-border spinner-border-sm"/>:<><i className="bi bi-arrow-counterclockwise"/>Restore</>}
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleHardDelete(kpi)} disabled={!!actionLoading}
                        style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"5px 12px", borderRadius:8, border:"1px solid rgba(185,28,28,0.3)", background:"rgba(185,28,28,0.07)", color:"#b91c1c", fontSize:"0.76rem", fontWeight:700, cursor:"pointer" }}>
                        {actionLoading===kpi.id+"_hard"?<span className="spinner-border spinner-border-sm"/>:<><i className="bi bi-trash3-fill"/>Delete</>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── KPIManagement (main) ────────────────────────────────────────────────────
const KPIManagement = () => {
  const userId   = localStorage.getItem("sb_userId");
  const userRole = localStorage.getItem("sb_role") || "";
  const isAdmin    = userRole.toLowerCase() === "admin";
  const isOperator = userRole.toLowerCase() === "operator";

  const [kpis, setKpis]                       = useState([]);
  const [loadingKpis, setLoadingKpis]         = useState(true);
  const [kpiLatestValues, setKpiLatestValues] = useState({});
  const [kpiHistory, setKpiHistory]           = useState({});
  const kpiHistoryRef                         = useRef({});
  const kpisRef                               = useRef([]);

  const [refreshFreq, setRefreshFreq]     = useState("5min");
  const [countdown, setCountdown]         = useState(null);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [createdByMe, setCreatedByMe]   = useState(false);

  const [showForm, setShowForm]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [form, setForm]                 = useState({ name:"", formula:"", unit:"", frequency:"5min", icon:"bi-graph-up", color:"#00c6ae" });
  const [errors, setErrors]             = useState({});
  const [successMsg, setSuccessMsg]     = useState("");
  const [errMsg, setErrMsg]             = useState("");
  const [sensors, setSensors]           = useState([]);
  const [sensorSearch, setSensorSearch] = useState("");
  const [kpiSearch, setKpiSearch]       = useState("");
  const [showCalc, setShowCalc]         = useState(false);
  const [trendKpi, setTrendKpi]         = useState(null);
  const [editKpi, setEditKpi]           = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  useEffect(() => { kpisRef.current = kpis; }, [kpis]);

  const loadKPIs = async (filterByMe) => {
    const useMyFilter = filterByMe !== undefined ? filterByMe : createdByMe;
    if (!userId) { setLoadingKpis(false); return; }
    setLoadingKpis(true);
    try {
      const res  = await fetchKPIs(useMyFilter);
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const mapped = data
        .filter(k => !k.isDeleted)
        .map((k, i) => ({
          id: k.kpiId, name: k.kpiName, formula: k.kpiFormula, frequency: k.frequency,
          isActive: k.isActive, isDeleted: false, createdAt: k.createdAt,
          icon: ICON_MAP[k.kpiName?.toLowerCase()] || "bi-graph-up",
          color: COLOR_MAP[i % COLOR_MAP.length], unit: "", fromApi: true,
        }));
      setKpis(mapped);

      // Single batch request instead of N parallel requests
      const batchRes = await fetchKPILatestBatch(mapped.map(k => k.id));
      const batchData = Array.isArray(batchRes.data) ? batchRes.data : [];
      const entries = batchData.map(item => {
        const kpiId = item.kpiId;
        const num   = item.error ? null : parseApiValue(item);
        if (num !== null) {
          if (!kpiHistoryRef.current[kpiId]) kpiHistoryRef.current[kpiId] = [];
          kpiHistoryRef.current[kpiId].push(num);
        }
        return [kpiId, num];
      });
      setKpiLatestValues(Object.fromEntries(entries));
      setKpiHistory({ ...kpiHistoryRef.current });
      setLastRefreshed(new Date());
    } catch (e) {
      setErrMsg(e?.response?.data?.message || "Failed to load KPIs.");
      setTimeout(() => setErrMsg(""), 4000);
    } finally { setLoadingKpis(false); }
  };

  useEffect(() => { loadKPIs(); }, [userId]);
  useEffect(() => { if (userId) loadKPIs(createdByMe); }, [createdByMe]);

  const refreshLatestValues = useCallback(async () => {
    const cur = kpisRef.current;
    if (!cur.length) return;
    setIsRefreshing(true);
    try {
      // Single batch request instead of N parallel requests
      const batchRes  = await fetchKPILatestBatch(cur.map(k => k.id));
      const batchData = Array.isArray(batchRes.data) ? batchRes.data : [];
      const newVals = {};
      batchData.forEach(item => {
        const kpiId = item.kpiId;
        const num   = item.error ? null : parseApiValue(item);
        newVals[kpiId] = num ?? (kpiHistoryRef.current[kpiId]?.slice(-1)[0] ?? null);
        if (num !== null) {
          if (!kpiHistoryRef.current[kpiId]) kpiHistoryRef.current[kpiId] = [];
          kpiHistoryRef.current[kpiId].push(num);
          if (kpiHistoryRef.current[kpiId].length > MAX_HISTORY)
            kpiHistoryRef.current[kpiId].shift();
        }
      });
      setKpiLatestValues(prev => ({ ...prev, ...newVals }));
      setKpiHistory({ ...kpiHistoryRef.current });
      setLastRefreshed(new Date());
    } finally { setIsRefreshing(false); }
  }, []);

  useEffect(() => {
    const totalSecs = Math.round(freqToMs(refreshFreq) / 1000);
    setCountdown(totalSecs);
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { refreshLatestValues(); return totalSecs; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [refreshFreq, refreshLatestValues]);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        const res  = await getSensorByUser(userId);
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        setSensors(list.map(s => ({ id:s.sensorId??s.id, name:s.sensorName??s.name, quantity:s.quantity, unit:s.unit })));
      } catch (e) { console.error("Sensor load failed:", e?.message); }
    };
    load();
  }, [userId]);

  const insertToFormula  = (text) => setForm(f => ({ ...f, formula: f.formula + text }));
  const insertFunction   = (fn)   => setForm(f => ({ ...f, formula: f.formula + `${fn}(` }));
  const backspaceFormula = ()     => setForm(f => ({ ...f, formula: f.formula.trimEnd().replace(/.$/, "") }));

  const handleAddKpi = async () => {
    const errs = {};
    if (!form.name.trim())    errs.name    = "KPI name is required.";
    if (!form.formula.trim()) errs.formula = "Formula is required.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await createKPI(form);
      setForm({ name:"", formula:"", unit:"", frequency:"5min", icon:"bi-graph-up", color:"#00c6ae" });
      setShowForm(false); setSensorSearch(""); setErrors({}); setShowCalc(false);
      setSuccessMsg(`KPI "${form.name}" created successfully!`);
      setTimeout(() => setSuccessMsg(""), 3500);
      await loadKPIs();
    } catch (e) {
      setErrMsg(e?.response?.data?.message || "Failed to create KPI.");
      setTimeout(() => setErrMsg(""), 4000);
    } finally { setSaving(false); }
  };

  const handleDeleteKpi = async (kpi) => {
    try {
      await softDeleteKPI(kpi.id);
      setKpis(prev => prev.filter(k => k.id !== kpi.id));
      setSuccessMsg(`KPI "${kpi.name}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      setErrMsg(e?.response?.data?.message || "Failed to delete KPI.");
      setTimeout(() => setErrMsg(""), 4000);
    }
  };

  const handleEditSaved = (updatedForm) => {
    setKpis(prev => prev.map(k =>
      k.id === editKpi.id
        ? { ...k, name: updatedForm.name, formula: updatedForm.formula, frequency: updatedForm.frequency, isActive: updatedForm.isActive }
        : k
    ));
    setEditKpi(null);
    setSuccessMsg(`KPI "${updatedForm.name}" updated successfully!`);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const enrichedKpis    = kpis.map(k => {
    const latest = kpiLatestValues[k.id];
    return { ...k, _liveVal: latest != null ? String(latest) : null, _history: kpiHistory[k.id] ?? [] };
  });
  const filteredKpis    = enrichedKpis.filter(k => k.name.toLowerCase().includes(kpiSearch.toLowerCase()));
  const filteredSensors = sensors.filter(s => s.name?.toLowerCase().includes(sensorSearch.toLowerCase()));

  return (
    <div>
      <style>{`
        @keyframes pulseDot   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes spin        { to{transform:rotate(360deg);} }
        @keyframes calcSlideIn { from{opacity:0;transform:translateY(-6px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .fn-btn{padding:4px 11px;border-radius:20px;border:1px solid var(--sb-border);background:var(--sb-light-bg);color:var(--sb-accent);font-size:0.76rem;font-weight:700;cursor:pointer;font-family:monospace;transition:background 0.15s;white-space:nowrap;}
        .fn-btn:hover{background:var(--sb-accent);color:#fff;border-color:var(--sb-accent);}
        .sensor-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:var(--sb-light-bg);border:1px solid var(--sb-border);color:var(--sb-text);font-size:0.74rem;font-weight:600;cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .sensor-chip:hover{background:var(--sb-accent);color:#fff;border-color:var(--sb-accent);}
        .kpi-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1050;padding:16px;}
        .kpi-modal-box{width:100%;max-width:680px;background:var(--sb-white);border-radius:18px;box-shadow:0 20px 56px rgba(0,0,0,0.15);overflow:hidden;}
        .kpi-modal-header{padding:16px 22px 14px;border-bottom:1px solid var(--sb-border);display:flex;align-items:center;justify-content:space-between;}
        .kpi-modal-body{padding:16px 22px;display:grid;grid-template-columns:1fr 1fr;gap:16px;max-height:72vh;overflow-y:auto;}
        .kpi-modal-footer{padding:12px 22px;border-top:1px solid var(--sb-border);display:flex;justify-content:flex-end;gap:8px;}
        .field-label{font-size:0.67rem;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--sb-muted);margin-bottom:4px;display:block;}
        .field-input{width:100%;background:var(--sb-light-bg);border:1px solid var(--sb-border);border-radius:8px;padding:7px 11px;color:var(--sb-text);font-size:0.85rem;outline:none;font-family:inherit;transition:border-color 0.2s;}
        .field-input:focus{border-color:var(--sb-accent);background:var(--sb-white);}
        .field-input.err{border-color:#e53e3e;}
        .field-select{width:100%;background:var(--sb-light-bg);border:1px solid var(--sb-border);border-radius:8px;padding:7px 11px;color:var(--sb-text);font-size:0.85rem;outline:none;font-family:inherit;transition:border-color 0.2s;cursor:pointer;}
        .field-select:focus{border-color:var(--sb-accent);background:var(--sb-white);}
        .kpi-search-input{background:var(--sb-light-bg);border:1px solid var(--sb-border);border-radius:50px;padding:7px 14px 7px 34px;color:var(--sb-text);font-size:0.83rem;outline:none;width:200px;transition:border-color 0.2s;}
        .kpi-search-input:focus{border-color:var(--sb-accent);background:var(--sb-white);}
        .formula-display-box{background:var(--sb-light-bg);border-radius:8px;padding:8px 12px;min-height:42px;font-family:monospace;font-size:0.85rem;color:var(--sb-text);word-break:break-all;display:flex;align-items:center;gap:6px;flex-wrap:wrap;cursor:pointer;transition:border-color 0.2s,background 0.2s,box-shadow 0.15s;position:relative;border:1.5px solid var(--sb-border);}
        .formula-display-box:hover{border-color:var(--sb-accent);box-shadow:0 0 0 3px rgba(0,198,174,0.08);}
        .formula-display-box.active{border-color:var(--sb-accent);background:var(--sb-white);box-shadow:0 0 0 3px rgba(0,198,174,0.10);}
        .formula-display-box.err{border-color:#e53e3e;}
        .calc-popup{animation:calcSlideIn 0.15s ease;}
        .calc-btn:hover{filter:brightness(0.93);transform:scale(0.97);}
        .freq-pill{padding:4px 9px;border-radius:20px;font-size:0.7rem;font-weight:700;border:1px solid var(--sb-border);background:var(--sb-light-bg);color:var(--sb-muted);cursor:pointer;transition:all 0.15s;white-space:nowrap;}
        .freq-pill.active{background:var(--sb-accent);color:#fff;border-color:var(--sb-accent);}
        .freq-pill:hover:not(.active){border-color:var(--sb-accent);color:var(--sb-accent);}
        .spinning{animation:spin 0.9s linear infinite;}
        .fx-bar{display:flex;align-items:center;background:var(--sb-light-bg);border:1.5px solid var(--sb-border);border-radius:8px;padding:6px 12px;transition:border-color 0.2s;}
        .fx-bar:focus-within{border-color:var(--sb-accent);background:var(--sb-white);}
        .fx-bar input{flex:1;background:none;border:none;outline:none;color:var(--sb-text);font-family:monospace;font-size:0.88rem;}
      `}</style>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 mb-2" style={{ borderBottom:"1px solid var(--sb-border)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <h5 style={{ margin:0, fontWeight:800, fontSize:"1.3rem", color:"var(--sb-text)", display:"flex", alignItems:"center", gap:8 }}>
              <i className="bi bi-graph-up-arrow" style={{ color:"var(--sb-accent)" }} />KPI Management
            </h5>
            <p style={{ margin:0, fontSize:"0.82rem", color:"var(--sb-muted)", marginTop:2 }}>Monitor and manage your key performance indicators.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowRestoreModal(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 18px", borderRadius:50, border:"1.5px solid #f39c12", background:"transparent", color:"#f39c12", fontSize:"0.83rem", fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(243,156,18,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              <i className="bi bi-arrow-counterclockwise" />Restore Deleted
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-3" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, padding:"6px 13px", borderRadius:50, background:"var(--sb-light-bg)", border:"1px solid var(--sb-border)", fontSize:"0.75rem", color:"var(--sb-muted)", whiteSpace:"nowrap" }}>
            {isRefreshing
              ? <><i className="bi bi-arrow-repeat spinning" style={{ color:"var(--sb-accent)", fontSize:"0.85rem" }} /><span style={{ color:"var(--sb-accent)", fontWeight:700 }}>Refreshing…</span></>
              : <><span style={{ width:7, height:7, borderRadius:"50%", background:"#00c6ae", display:"inline-block", animation:"pulseDot 2s infinite", flexShrink:0 }} /><span>Next in <strong style={{ color:"var(--sb-text)" }}>{countdown !== null ? formatCountdown(countdown) : "—"}</strong></span></>
            }
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", border:"1px solid var(--sb-border)", borderRadius:50, background:"var(--sb-light-bg)", flexWrap:"wrap" }}>
            <i className="bi bi-clock" style={{ fontSize:"0.75rem", color:"var(--sb-muted)" }} />
            {FREQUENCIES.map(f => (
              <button key={f} className={`freq-pill${refreshFreq===f?" active":""}`} onClick={() => setRefreshFreq(f)}>{f}</button>
            ))}
          </div>
          <button title="Refresh now" onClick={refreshLatestValues} disabled={isRefreshing}
            style={{ width:34, height:34, borderRadius:"50%", border:"1px solid var(--sb-border)", background:"var(--sb-light-bg)", color:"var(--sb-muted)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <i className={`bi bi-arrow-clockwise${isRefreshing?" spinning":""}`} style={{ fontSize:"0.9rem" }} />
          </button>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {isAdmin && (
            <button
              onClick={() => setCreatedByMe(v => !v)}
              style={{
                display:"inline-flex", alignItems:"center", gap:6,
                padding:"7px 14px", borderRadius:50, fontSize:"0.78rem", fontWeight:700,
                cursor:"pointer", transition:"all 0.15s",
                border: createdByMe ? "1.5px solid var(--sb-accent)" : "1.5px solid var(--sb-border)",
                background: createdByMe ? "rgba(0,198,174,0.10)" : "var(--sb-light-bg)",
                color: createdByMe ? "var(--sb-accent)" : "var(--sb-muted)",
              }}
              title="Show only KPIs you created"
            >
              <i className={`bi ${createdByMe ? "bi-person-fill-check" : "bi-person-check"}`} />
              Created by Me
            </button>
          )}
          <div style={{ position:"relative" }}>
            <i className="bi bi-search" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"var(--sb-muted)", fontSize:"0.83rem" }} />
            <input type="text" className="kpi-search-input" placeholder="Search KPIs…" value={kpiSearch} onChange={e => setKpiSearch(e.target.value)} />
          </div>
          {(isAdmin || isOperator) && (
            <button
              onClick={() => setShowForm(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 20px", borderRadius:50, border:"none", background:"var(--sb-accent)", color:"#fff", fontSize:"0.85rem", fontWeight:700, cursor:"pointer", transition:"opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity="0.87"}
              onMouseLeave={e => e.currentTarget.style.opacity="1"}
            >
              <i className="bi bi-plus-circle-fill" />Add KPI
            </button>
          )}
        </div>
      </div>

      {/* Toasts */}
      {(successMsg || errMsg) && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
          {successMsg && <div className="alert alert-success shadow border-0 d-flex align-items-center gap-2 mb-0"><i className="bi bi-check-circle-fill" />{successMsg}</div>}
          {errMsg     && <div className="alert alert-danger  shadow border-0 d-flex align-items-center gap-2 mb-0"><i className="bi bi-exclamation-circle-fill" />{errMsg}</div>}
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="container-fluid px-4 pb-4">
        {loadingKpis ? (
          <div style={{ textAlign:"center", padding:"48px 0" }}>
            <div className="spinner-border" style={{ color:"var(--sb-accent)" }} />
            <p style={{ marginTop:10, color:"var(--sb-muted)", fontSize:"0.85rem" }}>Loading KPIs…</p>
          </div>
        ) : kpis.length === 0 ? (
          <div style={{ textAlign:"center", padding:"64px 0", color:"var(--sb-muted)" }}>
            <i className="bi bi-graph-up" style={{ fontSize:"2.8rem", display:"block", marginBottom:12, opacity:0.3 }} />
            <p style={{ fontWeight:600, fontSize:"1rem", marginBottom:4 }}>No KPIs configured yet</p>
            <p style={{ fontSize:"0.83rem" }}>Click <strong>Add KPI</strong> to create your first one.</p>
          </div>
        ) : filteredKpis.length === 0 ? (
          <div style={{ textAlign:"center", padding:"48px 0", color:"var(--sb-muted)" }}>
            <i className="bi bi-search" style={{ fontSize:"2rem", display:"block", marginBottom:10, opacity:0.3 }} />
            <p>No KPIs match <strong>"{kpiSearch}"</strong>.</p>
          </div>
        ) : (
          <div className="row g-3">
            {filteredKpis.map(kpi => (
              <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={kpi.id}>
                <KPICard
                  kpi={kpi}
                  lastRefreshed={lastRefreshed}
                  isRefreshing={isRefreshing}
                  isAdmin={isAdmin}
                  isOperator={isOperator}
                  onDelete={handleDeleteKpi}
                  onShowTrend={k => setTrendKpi(k)}
                  onEdit={k => setEditKpi(k)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {trendKpi && <TrendPopup kpi={trendKpi} onClose={() => setTrendKpi(null)} />}

      {editKpi && (
        <EditKPIModal
          kpi={editKpi}
          onClose={() => setEditKpi(null)}
          onSaved={handleEditSaved}
        />
      )}

      {showRestoreModal && (
        <RestoreDeletedModal
          onClose={() => setShowRestoreModal(false)}
          onRestored={loadKPIs}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Add KPI Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="kpi-modal-overlay">
          <div className="kpi-modal-box">
            <div className="kpi-modal-header">
              <div>
                <h5 style={{ margin:0, fontWeight:700, color:"var(--sb-text)", fontSize:"1rem" }}><i className="bi bi-function me-2" style={{ color:"var(--sb-accent)" }} />New KPI Formula</h5>
                <p style={{ margin:0, fontSize:"0.72rem", color:"var(--sb-muted)", marginTop:2 }}>Build a formula using functions and sensor variables</p>
              </div>
              <button className="btn-close" onClick={() => { setShowForm(false); setErrors({}); setShowCalc(false); }} />
            </div>

            <div className="kpi-modal-body">
              {/* LEFT */}
              <div>
                <div className="d-flex gap-2 mb-3">
                  <div style={{ flex:2 }}>
                    <label className="field-label">KPI Name *</label>
                    <input className={`field-input${errors.name?" err":""}`} placeholder="e.g. Machine Efficiency" value={form.name}
                      onChange={e => { setForm(f=>({...f,name:e.target.value})); setErrors(v=>({...v,name:""})); }} />
                    {errors.name && <p style={{ fontSize:"0.66rem",color:"#e53e3e",margin:"3px 0 0" }}>{errors.name}</p>}
                  </div>
                  <div style={{ flex:1 }}>
                    <label className="field-label">Unit</label>
                    <input className="field-input" placeholder="%, hrs" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="field-label">Frequency</label>
                  <select className="field-select" value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
                    {FREQUENCIES.map(freq=><option key={freq} value={freq}>{freq}</option>)}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="field-label">Functions</label>
                  <div className="d-flex gap-1 flex-wrap">
                    {FX_FUNCS.map(fn=><button key={fn} type="button" className="fn-btn" onClick={()=>insertFunction(fn)}>{fn}()</button>)}
                    <button type="button" className="fn-btn" style={{ color:"#0f8fd4",borderColor:"rgba(15,143,212,0.3)",background:"rgba(15,143,212,0.07)" }} onClick={()=>insertToFormula(")")}>close )</button>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="field-label">Formula *</label>
                  <div style={{ position:"relative" }}>
                    <div className={`formula-display-box${showCalc?" active":""}${errors.formula?" err":""}`} onClick={()=>setShowCalc(v=>!v)}>
                      <span style={{ fontSize:"0.68rem",fontWeight:800,padding:"1px 6px",borderRadius:5,background:"var(--sb-accent)",color:"#fff",flexShrink:0 }}>fx</span>
                      <span style={{ flex:1,color:form.formula?"var(--sb-text)":"var(--sb-muted)",fontStyle:form.formula?"normal":"italic",fontSize:"0.82rem" }}>{form.formula||"Click to open calculator…"}</span>
                      <span style={{ color:"var(--sb-accent)",fontSize:"0.78rem",flexShrink:0 }}><i className={`bi bi-${showCalc?"chevron-up":"calculator"}`}/></span>
                      {form.formula&&<button type="button" onClick={e=>{e.stopPropagation();setForm(f=>({...f,formula:""}));setErrors(er=>({...er,formula:""}));}} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--sb-muted)",fontSize:13,lineHeight:1,padding:"1px 3px",borderRadius:4 }}><i className="bi bi-x-circle"/></button>}
                    </div>
                    {showCalc&&(
                      <div style={{ position:"fixed",inset:0,zIndex:5000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.25)" }} onClick={e=>{e.stopPropagation();setShowCalc(false);}}>
                        <div className="calc-popup" style={{ background:"var(--sb-white)",border:"1.5px solid var(--sb-border)",borderRadius:16,padding:14,boxShadow:"0 20px 56px rgba(0,0,0,0.18)",width:220 }} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                            <span style={{ fontSize:"0.65rem",fontWeight:700,color:"var(--sb-muted)",textTransform:"uppercase",letterSpacing:"0.6px" }}>Calculator</span>
                            <button onClick={e=>{e.stopPropagation();setShowCalc(false);}} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--sb-muted)",fontSize:14,lineHeight:1,padding:"2px 4px",borderRadius:4 }}>×</button>
                          </div>
                          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5 }}>
                            {[{l:"7",v:"7",t:"num"},{l:"8",v:"8",t:"num"},{l:"9",v:"9",t:"num"},{l:"+",v:" + ",t:"op"},
                              {l:"4",v:"4",t:"num"},{l:"5",v:"5",t:"num"},{l:"6",v:"6",t:"num"},{l:"−",v:" - ",t:"op"},
                              {l:"1",v:"1",t:"num"},{l:"2",v:"2",t:"num"},{l:"3",v:"3",t:"num"},{l:"×",v:" * ",t:"op"},
                              {l:"(",v:"(",t:"bracket"},{l:"0",v:"0",t:"num"},{l:")",v:")",t:"bracket"},{l:"÷",v:" / ",t:"op"},
                              {l:".",v:".",t:"num"},{l:"00",v:"00",t:"num"}].map(({l,v,t})=>(
                              <button key={l} type="button" className="calc-btn" onClick={e=>{e.stopPropagation();insertToFormula(v);}}
                                style={{ height:34,borderRadius:7,border:"1px solid",fontSize:t==="num"?"0.86rem":"0.9rem",fontWeight:t==="op"?800:600,cursor:"pointer",transition:"all 0.1s",
                                  ...(t==="op"?{background:"rgba(0,198,174,0.10)",borderColor:"rgba(0,198,174,0.3)",color:"var(--sb-accent)"}
                                  :t==="bracket"?{background:"rgba(15,143,212,0.08)",borderColor:"rgba(15,143,212,0.25)",color:"#0f8fd4"}
                                  :{background:"var(--sb-light-bg)",borderColor:"var(--sb-border)",color:"var(--sb-text)"})}}>{l}</button>
                            ))}
                            <button type="button" className="calc-btn" onClick={e=>{e.stopPropagation();backspaceFormula();}}
                              style={{ gridColumn:"span 2",height:34,borderRadius:7,border:"1px solid #e53e3e44",background:"rgba(229,62,62,0.07)",color:"#e53e3e",fontWeight:700,fontSize:"0.76rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
                              <i className="bi bi-backspace" style={{ fontSize:"0.82rem" }}/> Del
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {errors.formula&&<p style={{ fontSize:"0.66rem",color:"#e53e3e",margin:"3px 0 6px" }}><i className="bi bi-exclamation-triangle me-1"/>{errors.formula}</p>}
                {form.formula.trim()&&<div style={{ marginTop:4,padding:"6px 10px",background:"rgba(0,198,174,0.07)",borderRadius:7,fontSize:"0.76rem",border:"1px solid #00c6ae35",display:"flex",alignItems:"center",gap:5 }}><i className="bi bi-info-circle" style={{ color:"#00c6ae" }}/>KPI will be calculated from real sensor data after creation</div>}

                <div className="d-flex gap-2 mt-3">
                  <div style={{ flex:1 }}>
                    <label className="field-label">Color</label>
                    <input type="color" className="field-input p-1" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} style={{ height:"35px" }}/>
                  </div>
                  <div style={{ flex:2 }}>
                    <label className="field-label">Icon class</label>
                    <input className="field-input" placeholder="bi-graph-up" value={form.icon} onChange={e=>setForm(f=>({...f,icon:e.target.value}))}/>
                  </div>
                </div>
              </div>

              {/* RIGHT — sensors */}
              <div style={{ borderLeft:"1px solid var(--sb-border)",paddingLeft:16 }}>
                <label className="field-label">Sensor Variables</label>
                <p style={{ fontSize:"0.71rem",color:"var(--sb-muted)",marginBottom:8,lineHeight:1.4 }}>
                  Click a sensor to insert its variable.<br/>
                  <span style={{ color:"var(--sb-accent)",fontWeight:600 }}>Tip:</span> function → sensor → <code>)</code>
                </p>
                <div className="fx-bar mb-2" style={{ padding:"5px 10px" }}>
                  <i className="bi bi-search me-2" style={{ color:"var(--sb-muted)",fontSize:"0.78rem" }}/>
                  <input placeholder="Search sensors…" value={sensorSearch} onChange={e=>setSensorSearch(e.target.value)}
                    style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:"0.81rem",color:"var(--sb-text)" }}/>
                </div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:5,maxHeight:"230px",overflowY:"auto" }}>
                  {filteredSensors.length===0
                    ? <p style={{ fontSize:"0.76rem",color:"var(--sb-muted)",width:"100%",textAlign:"center",paddingTop:16 }}>
                        <i className="bi bi-broadcast me-1"/>{sensors.length===0?"No sensors connected.":"No sensors match your search."}
                      </p>
                    : filteredSensors.map(s=>(
                        <button key={s.id} type="button" className="sensor-chip" onClick={()=>insertToFormula(`sensor_${s.id}`)}>
                          <i className="bi bi-broadcast" style={{ fontSize:"0.62rem",color:"var(--sb-accent)" }}/>
                          sensor_{s.id}
                          {s.name&&<span style={{ opacity:0.6,fontSize:"0.68rem" }}>· {s.name}</span>}
                        </button>
                      ))
                  }
                </div>
              </div>
            </div>

            <div className="kpi-modal-footer">
              <button style={{ padding:"7px 18px",borderRadius:"8px",border:"1.5px solid var(--sb-border)",background:"none",color:"var(--sb-text)",fontWeight:600,cursor:"pointer",fontSize:"0.87rem" }}
                onClick={()=>{setShowForm(false);setErrors({});setShowCalc(false);}}>Cancel</button>
              <button className="btn sb-connect-btn" style={{ borderRadius:"8px",padding:"7px 20px",fontWeight:600,fontSize:"0.87rem" }} onClick={handleAddKpi} disabled={saving}>
                {saving?<><span className="spinner-border spinner-border-sm me-2"/>Saving…</>:<><i className="bi bi-plus-circle me-2"/>Save KPI</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIManagement;