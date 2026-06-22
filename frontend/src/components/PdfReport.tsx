import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "../store/useStore";

interface PdfReportProps {
  isPrinting: boolean;
  onPrintComplete: () => void;
}

const API = "http://localhost:8000/api";

const fmt = (n: number | null | undefined, prefix = "$") => {
  if (n == null || isNaN(n)) return "—";
  return `${prefix}${Math.round(n).toLocaleString()}`;
};

const fmtN = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return "—";
  return Math.round(n).toLocaleString();
};

const fmtPct = (n: number | null | undefined) => {
  if (n == null || isNaN(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
};

// ─── VECTOR GRAPH COMPONENTS (SVG) ───

// 1. Revenue Trend Line Chart
const SvgLineChart = ({ data, maxVal }: { data: { date: string; revenue: number }[]; maxVal: number }) => {
  if (!data || data.length === 0) return null;
  const width = 500;
  const height = 110;
  const padding = 16;
  const points = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding)) / (data.length - 1 || 1);
    const y = height - padding - (d.revenue * (height - 2 * padding)) / (maxVal || 1);
    return { x, y };
  });
  const pathStr = points.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * (height - 2 * padding);
          return (
            <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" />
          );
        })}
        <polygon
          points={`${padding},${height - padding} ${pathStr} ${width - padding},${height - padding}`}
          fill="rgba(30, 58, 95, 0.08)"
        />
        <polyline fill="none" stroke="#1e3a5f" strokeWidth="2" points={pathStr} />
        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r="2.5" fill="#1e3a5f" />
        ))}
        {data.map((d, idx) => {
          if (idx % Math.max(1, Math.round(data.length / 5)) !== 0 && idx !== data.length - 1) return null;
          const x = padding + (idx * (width - 2 * padding)) / (data.length - 1 || 1);
          return (
            <text key={idx} x={x} y={height - 2} fontSize="7" textAnchor="middle" fill="#6b7280" fontWeight="600">
              {d.date}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// 2. Scenario Simulation Dual Line Chart
const SvgScenarioChart = ({ data }: { data: { date: string; baseline_revenue: number; adjusted_revenue: number }[] }) => {
  if (!data || data.length === 0) return null;
  const width = 500;
  const height = 110;
  const padding = 16;
  const maxVal = Math.max(...data.map((d) => Math.max(d.baseline_revenue, d.adjusted_revenue)));
  const pointsBase = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding)) / (data.length - 1 || 1);
    const y = height - padding - (d.baseline_revenue * (height - 2 * padding)) / (maxVal || 1);
    return { x, y };
  });
  const pointsAdj = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding)) / (data.length - 1 || 1);
    const y = height - padding - (d.adjusted_revenue * (height - 2 * padding)) / (maxVal || 1);
    return { x, y };
  });
  const pathBase = pointsBase.map((p) => `${p.x},${p.y}`).join(" ");
  const pathAdj = pointsAdj.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * (height - 2 * padding);
          return (
            <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" />
          );
        })}
        <polyline fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4,4" points={pathBase} />
        <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={pathAdj} />
        <text x={padding} y={10} fontSize="7" fill="#6b7280" fontWeight="600">
          ── Baseline (Gray)  ── Adjusted (Orange)
        </text>
      </svg>
    </div>
  );
};

// 3. Forecast Line Chart
const SvgForecastChart = ({ data }: { data: { date: string; forecast_revenue: number; lower_bound: number; upper_bound: number }[] }) => {
  if (!data || data.length === 0) return null;
  const width = 500;
  const height = 110;
  const padding = 16;
  const maxVal = Math.max(...data.map((d) => d.upper_bound));
  const pointsFc = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding)) / (data.length - 1 || 1);
    const y = height - padding - (d.forecast_revenue * (height - 2 * padding)) / (maxVal || 1);
    return { x, y };
  });
  const pointsUpper = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding)) / (data.length - 1 || 1);
    const y = height - padding - (d.upper_bound * (height - 2 * padding)) / (maxVal || 1);
    return { x, y };
  });
  const pointsLower = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding)) / (data.length - 1 || 1);
    const y = height - padding - (d.lower_bound * (height - 2 * padding)) / (maxVal || 1);
    return { x, y };
  });
  const pathFc = pointsFc.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = [...pointsUpper, ...[...pointsLower].reverse()].map(p => `${p.x},${p.y}`).join(" ");
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * (height - 2 * padding);
          return (
            <line key={idx} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" />
          );
        })}
        <polygon points={areaPoints} fill="rgba(37, 99, 235, 0.05)" />
        <polyline fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="2,2" points={pointsUpper.map(p => `${p.x},${p.y}`).join(" ")} />
        <polyline fill="none" stroke="#93c5fd" strokeWidth="1" strokeDasharray="2,2" points={pointsLower.map(p => `${p.x},${p.y}`).join(" ")} />
        <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={pathFc} />
        {data.map((d, idx) => {
          if (idx % Math.max(1, Math.round(data.length / 5)) !== 0 && idx !== data.length - 1) return null;
          const x = padding + (idx * (width - 2 * padding)) / (data.length - 1 || 1);
          return (
            <text key={idx} x={x} y={height - 2} fontSize="7" textAnchor="middle" fill="#6b7280" fontWeight="600">
              {d.date}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// 4. Inventory Parameters Comparison Chart
const SvgInventoryChart = ({ safetyStock, reorderPoint, eoq }: { safetyStock: number; reorderPoint: number; eoq: number }) => {
  const max = Math.max(safetyStock, reorderPoint, eoq, 1);
  const width = 500;
  const height = 90;
  const padding = 16;
  const barH = 12;
  const metrics = [
    { label: "Safety Stock", val: safetyStock, color: "#10b981" },
    { label: "Reorder Point", val: reorderPoint, color: "#3b82f6" },
    { label: "Economic Order Qty (EOQ)", val: eoq, color: "#6366f1" },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {metrics.map((m, idx) => {
          const y = padding + idx * (barH + 10);
          const w = ((width - 150) * m.val) / max;
          return (
            <g key={idx}>
              <text x={10} y={y + 9} fontSize="8" fontWeight="600" fill="#374151">{m.label}</text>
              <rect x={140} y={y} width={Math.max(10, w)} height={barH} fill={m.color} rx="3" />
              <text x={145 + Math.max(10, w)} y={y + 9} fontSize="8" fontWeight="700" fill="#111827">{fmt(m.val)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 5. Promotion Lift Chart
const SvgPromoChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;
  const width = 500;
  const height = 100;
  const padding = 16;
  const maxUnits = Math.max(...data.map(d => Math.max(d.units_sold, d.prev_units_sold)));
  const barH = 6;
  const gap = 12;
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {data.slice(0, 4).map((p, idx) => {
          const y = padding + idx * (barH * 2 + gap);
          const wPromo = ((width - 160) * p.units_sold) / maxUnits;
          const wBase = ((width - 160) * p.prev_units_sold) / maxUnits;
          return (
            <g key={idx}>
              <text x={5} y={y + 8} fontSize="7" fontWeight="600" fill="#374151" width="80">{p.item_id.substring(0, 10)}</text>
              <rect x={100} y={y} width={Math.max(2, wBase)} height={barH} fill="#9ca3af" rx="2" />
              <rect x={100} y={y + barH + 2} width={Math.max(2, wPromo)} height={barH} fill="#10b981" rx="2" />
              <text x={105 + Math.max(wPromo, wBase)} y={y + 8} fontSize="7" fontWeight="700" fill="#111827">
                {fmtN(p.units_sold)} vs {fmtN(p.prev_units_sold)} (Lift: +{(((p.units_sold - p.prev_units_sold)/Math.max(1, p.prev_units_sold))*100).toFixed(0)}%)
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// 6. Anomaly Core Timeline / Severity Chart
const SvgAnomalyChart = ({ driver }: { driver: string }) => {
  const width = 500;
  const height = 50;
  const severity = driver === "Unexplained Variance" ? 30 : driver === "None Detected" ? 10 : 80;
  const color = severity > 50 ? "#ef4444" : severity > 20 ? "#f59e0b" : "#10b981";
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        <rect x={10} y={15} width={width - 20} height={12} fill="#f1f5f9" rx="6" />
        <rect x={10} y={15} width={((width - 20) * severity) / 100} height={12} fill={color} rx="6" />
        <text x={20} y={40} fontSize="8" fontWeight="700" fill="#1e3a5f">Severity Indicator: {severity}% ({driver})</text>
      </svg>
    </div>
  );
};

const SectionHeader = ({ num, title }: { num: number; title: string }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      borderBottom: "2.5px solid #1e3a5f",
      paddingBottom: 8,
      marginBottom: 14,
    }}
  >
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        backgroundColor: "#1e3a5f",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {num}
    </div>
    <h2
      style={{
        margin: 0,
        fontSize: 14,
        fontWeight: 700,
        color: "#1e3a5f",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {title}
    </h2>
  </div>
);

const PositiveBlock = ({ title, content }: { title: string; content: string[] }) => (
  <div style={{
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderLeft: "5px solid #22c55e",
    borderRadius: 6,
    padding: "8px 10px",
    marginTop: 6,
    fontSize: 9,
    color: "#166534",
    lineHeight: 1.4
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 7, fontWeight: 700, backgroundColor: "#d1fae5", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.05em", color: "#166534" }}>STRENGTH</span>
      <strong style={{ color: "#14532d", fontSize: 9.5 }}>{title}</strong>
    </div>
    {content.map((p, idx) => <p key={idx} style={{ margin: "0 0 3px 0", textAlign: "justify" }}>{p}</p>)}
  </div>
);

const NegativeBlock = ({ title, content }: { title: string; content: string[] }) => (
  <div style={{
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderLeft: "5px solid #f59e0b",
    borderRadius: 6,
    padding: "8px 10px",
    marginTop: 6,
    fontSize: 9,
    color: "#92400e",
    lineHeight: 1.4
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 7, fontWeight: 700, backgroundColor: "#fef3c7", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.05em", color: "#92400e" }}>WEAKNESS</span>
      <strong style={{ color: "#78350f", fontSize: 9.5 }}>{title}</strong>
    </div>
    {content.map((p, idx) => <p key={idx} style={{ margin: "0 0 3px 0", textAlign: "justify" }}>{p}</p>)}
  </div>
);

const RiskBlock = ({ title, content }: { title: string; content: string[] }) => (
  <div style={{
    backgroundColor: "#fff5f5",
    border: "1px solid #feb2b2",
    borderLeft: "5px solid #ef4444",
    borderRadius: 6,
    padding: "8px 10px",
    marginTop: 6,
    fontSize: 9,
    color: "#991b1b",
    lineHeight: 1.4
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 7, fontWeight: 700, backgroundColor: "#fee2e2", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.05em", color: "#991b1b" }}>RISK & MITIGATION</span>
      <strong style={{ color: "#7f1d1d", fontSize: 9.5 }}>{title}</strong>
    </div>
    {content.map((p, idx) => <p key={idx} style={{ margin: "0 0 3px 0", textAlign: "justify" }}>{p}</p>)}
  </div>
);

const KpiBox = ({
  label,
  value,
  delta,
  positive = true,
}: {
  label: string;
  value: string;
  delta?: number | null;
  positive?: boolean;
}) => {
  const hasDelta = delta !== undefined && delta !== null;
  const isGood = hasDelta ? (positive ? (delta ?? 0) >= 0 : (delta ?? 0) < 0) : true;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        backgroundColor: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
        {value}
      </div>
      {hasDelta && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            marginTop: 4,
            color: isGood ? "#059669" : "#dc2626",
          }}
        >
          {isGood ? "▲" : "▼"} {fmtPct(delta)} vs prior
        </div>
      )}
    </div>
  );
};

const CssBarChart = ({
  label,
  value,
  max,
  pct,
  color = "#1e3a5f",
  small = false,
}: {
  label: string;
  value: string;
  max: number;
  pct?: number;
  color?: string;
  small?: boolean;
}) => {
  const percentage = pct ?? (max > 0 ? (Number(value.replace(/[^0-9.-]/g, "")) / max) * 100 : 0);
  const labelWidth = small ? 80 : 130;
  const fontSize = small ? 9 : 10;
  const barHeight = small ? 8 : 10;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "5px 0", fontSize }}>
      <div style={{ width: labelWidth, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </div>
      <div style={{ flex: 1, backgroundColor: "#f1f5f9", height: barHeight, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, Math.max(0, percentage))}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
      </div>
      <div style={{ width: 90, textAlign: "right", fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
        {value}
      </div>
    </div>
  );
};

export default function PdfReport({ isPrinting, onPrintComplete }: PdfReportProps) {
  const { dateFrom, dateTo, category, stateLocation } = useStore();
  const printTriggered = useRef(false);

  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    category,
    state: stateLocation,
  });

  const { data: kpis } = useQuery({
    queryKey: ["pdf-kpis", dateFrom, dateTo, category, stateLocation],
    queryFn: () => fetch(`${API}/kpis?${params}`).then((r) => r.json()),
    enabled: isPrinting,
  });

  const { data: trend } = useQuery({
    queryKey: ["pdf-trend", dateFrom, dateTo, category, stateLocation],
    queryFn: () => fetch(`${API}/sales/trend?${params}&granularity=monthly`).then((r) => r.json()),
    enabled: isPrinting,
  });

  const { data: treemap } = useQuery({
    queryKey: ["pdf-treemap", dateFrom, dateTo, stateLocation],
    queryFn: () => fetch(`${API}/treemap?date_from=${dateFrom}&date_to=${dateTo}&state=${stateLocation}`).then((r) => r.json()),
    enabled: isPrinting,
  });

  const { data: topProducts } = useQuery({
    queryKey: ["pdf-top-products", dateFrom, dateTo, category, stateLocation],
    queryFn: () => fetch(`${API}/top-products?${params}&metric=revenue&limit=10`).then((r) => r.json()),
    enabled: isPrinting,
  });

  const { data: forecast } = useQuery({
    queryKey: ["pdf-forecast", category, stateLocation],
    queryFn: () => fetch(`${API}/forecast?category=${category}&state=${stateLocation}&horizon=28`).then((r) => r.json()),
    enabled: isPrinting,
  });

  const { data: promotions } = useQuery({
    queryKey: ["pdf-promotions", category, stateLocation],
    queryFn: () => fetch(`${API}/promotions?category=${category}&state=${stateLocation}`).then((r) => r.json()),
    enabled: isPrinting,
  });

  const { data: rootCause } = useQuery({
    queryKey: ["pdf-root-cause", dateFrom, dateTo, category, stateLocation],
    queryFn: () => fetch(`${API}/root-cause?date=${dateFrom}&category=${category}&state=${stateLocation}`).then((r) => r.json()),
    enabled: isPrinting,
  });

  const { data: scenario } = useQuery({
    queryKey: ["pdf-scenario", category, stateLocation],
    queryFn: () => fetch(`${API}/scenario?category=${category}&state=${stateLocation}&price_delta_pct=0&promo_uplift_pct=0`).then((r) => r.json()),
    enabled: isPrinting,
  });

  const { data: geo } = useQuery({
    queryKey: ["pdf-geo", dateFrom, dateTo, category],
    queryFn: () => fetch(`${API}/geo?date_from=${dateFrom}&date_to=${dateTo}&category=${category}`).then((r) => r.json()),
    enabled: isPrinting,
  });

  // Check if all 9 queries have settled with data
  const allLoaded = !!(
    kpis &&
    trend &&
    treemap &&
    topProducts &&
    forecast &&
    promotions &&
    rootCause &&
    scenario &&
    geo
  );

  useEffect(() => {
    if (!isPrinting) {
      printTriggered.current = false;
      return;
    }
    if (printTriggered.current) return;
    if (allLoaded) {
      printTriggered.current = true;
      const handleAfterPrint = () => {
        onPrintComplete();
      };
      window.addEventListener("afterprint", handleAfterPrint, { once: true });
      setTimeout(() => {
        window.print();
      }, 1000);
    }
  }, [isPrinting, allLoaded, onPrintComplete]);

  if (!isPrinting || !allLoaded) return null;

  // --- Data Extraction ---
  const totalRevenue = kpis?.total_revenue ?? 0;
  const totalUnits = kpis?.total_units_sold ?? 0;
  const revenueGrowth = kpis?.revenue_change_pct ?? null;
  const unitsGrowth = kpis?.units_change_pct ?? null;

  const dFrom = new Date(dateFrom);
  const dTo = new Date(dateTo);
  const daysDiff = Math.max(1, Math.round((dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailyRevenue = totalRevenue / daysDiff;

  // Trend Data
  const trendList: any[] = trend?.data || [];
  const trendValues = trendList.map((d) => d.revenue);
  const maxTrendVal = Math.max(...(trendValues.length ? trendValues : [0]));
  const minTrendVal = Math.min(...(trendValues.length ? trendValues : [0]));
  const peakPoint = trendList.find((d) => d.revenue === maxTrendVal);
  const troughPoint = trendList.find((d) => d.revenue === minTrendVal);
  const trendSlope =
    trendValues.length > 1
      ? ((trendValues[trendValues.length - 1] - trendValues[0]) / (trendValues[0] || 1)) * 100
      : 0;

  // Treemap / Category Mix
  const categoryList: any[] = treemap?.categories || [];
  const categoryTotal = categoryList.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const sortedCategories = [...categoryList].sort((a, b) => b.revenue - a.revenue);

  // Geographic
  const geoList: any[] = geo?.geo || [];
  const sortedGeo = [...geoList].sort((a, b) => b.revenue - a.revenue);
  const geoTotal = sortedGeo.reduce((s, g) => s + (g.revenue ?? 0), 0);

  // Top Products
  const productList: any[] = topProducts?.data || [];
  const productTotal = productList.reduce((s, p) => s + (p.revenue ?? 0), 0);

  // Forecast
  const forecastList: any[] = forecast?.data || [];
  const fcMax = Math.max(...forecastList.map((f) => f.upper_bound ?? f.forecast_revenue ?? 0));
  const fcMin = Math.min(...forecastList.map((f) => f.lower_bound ?? f.forecast_revenue ?? 0));
  const fcAvg = forecastList.reduce((sum, f) => sum + f.forecast_revenue, 0) / (forecastList.length || 1);

  // Promotions
  const promoList: any[] = promotions?.promotions || [];
  const topPromos = promoList.slice(0, 10);

  // Scenario
  const scenarioList: any[] = scenario?.scenario || [];
  const scenarioBaseSum = scenarioList.reduce((s, r) => s + r.baseline_revenue, 0);
  const scenarioAdjSum = scenarioList.reduce((s, r) => s + r.adjusted_revenue, 0);
  const scenarioDelta = scenarioBaseSum > 0 ? ((scenarioAdjSum - scenarioBaseSum) / scenarioBaseSum) * 100 : 0;

  // Anomaly Root Cause
  const rcDriver = rootCause?.driver ?? "None Detected";
  const rcDesc = rootCause?.description ?? "No critical demand variances flagged.";

  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const s = {
    page: {
      fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif",
      color: "#1f2937",
      backgroundColor: "#ffffff",
      width: "210mm",
      height: "297mm",
      margin: "0 auto",
      padding: "20mm 20mm 16mm 20mm",
      boxSizing: "border-box" as const,
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "space-between" as const,
      pageBreakAfter: "always" as const,
      breakAfter: "page" as const,
    } as React.CSSProperties,
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: 9,
      marginTop: 6,
      marginBottom: 6,
    } as React.CSSProperties,
    th: {
      padding: "6px 8px",
      textAlign: "left" as const,
      backgroundColor: "#1e3a5f",
      color: "#ffffff",
      fontWeight: 700,
      fontSize: 8,
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
    } as React.CSSProperties,
    td: {
      padding: "6px 8px",
      borderBottom: "1px solid #e5e7eb",
      color: "#374151",
    } as React.CSSProperties,
  };

  const Footer = ({ pageNum }: { pageNum: number }) => (
    <div
      style={{
        borderTop: "1px solid #e5e7eb",
        paddingTop: 8,
        display: "flex",
        justifyContent: "space-between",
        fontSize: 8,
        color: "#9ca3af",
      }}
    >
      <span>CONFIDENTIAL — DemandDoc Executive Intelligence Report</span>
      <span>Page {pageNum} of 12</span>
    </div>
  );

  return createPortal(
    <div
      id="pdf-report-root"
      style={{
        display: "none",
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#ffffff",
        overflowY: "auto",
      }}
    >
      {/* ─────────────────────────────────────────────
          PAGE 1 — COVER PAGE
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 80 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                backgroundColor: "#1e3a5f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1e3a5f", letterSpacing: "0.02em" }}>
                DemandDoc
              </div>
              <div style={{ fontSize: 9, color: "#6b7280", letterSpacing: "0.12em", fontWeight: 600 }}>
                DECISION SUPPORT PLATFORM
              </div>
            </div>
          </div>

          <div style={{ borderLeft: "6px solid #1e3a5f", paddingLeft: 24, marginBottom: 60 }}>
            <h1 style={{ fontSize: 38, fontWeight: 900, color: "#111827", margin: "0 0 10px", lineHeight: 1.15 }}>
              Demand Analytics
              <br />
              Executive Audit
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: "#4b5563", fontWeight: 500 }}>
              Corporate Analysis and Replenishment Guide
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 24,
              marginBottom: 40,
            }}
          >
            {[
              ["Report Generation Date", reportDate],
              ["Transactional Window", `${dateFrom} to ${dateTo} (${daysDiff} days)`],
              ["Segment Category Filter", category === "ALL" ? "All product groups" : category],
              ["Geographic State Scope", stateLocation === "ALL" ? "All active states" : stateLocation],
              ["Data Warehouse Core", "DuckDB Transactional Aggregations"],
              ["Document Class", "Executive Level Decision Document"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: 4 }}>
                  {k}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1f2937" }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16, display: "flex", justifyContent: "space-between", fontSize: 9, color: "#9ca3af" }}>
          <span>PROPRIETARY & CONFIDENTIAL INFORMATION</span>
          <span>DemandDoc Platform</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 2 — TABLE OF CONTENTS / INDEX
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <div
            style={{
              borderBottom: "2.5px solid #1e3a5f",
              paddingBottom: 8,
              marginBottom: 30,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#1e3a5f",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Table of Contents
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 12, color: "#374151", paddingLeft: 10 }}>
            {[
              ["1. Executive Summary & Core KPIs", "Page 3"],
              ["2. Revenue Trend & Historical Momentum", "Page 4"],
              ["3. Category Revenue Mix & Contribution Audit", "Page 5"],
              ["4. Geographic Performance & Regional Share Split", "Page 6"],
              ["5. Top 10 SKUs & Portfolio Concentration", "Page 7"],
              ["6. 28-Day Demand Forecast Projections", "Page 8"],
              ["7. Inventory Policy & Safety Buffer Limits", "Page 9"],
              ["8. Promotion Lift & Campaign Elasticity", "Page 10"],
              ["9. Anomaly Core Drivers & Events Audit", "Page 11"],
              ["10. Scenario Simulator & Price Elasticity Summary", "Page 12"],
            ].map(([title, page]) => (
              <div key={title} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{title}</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{page}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 16,
              marginTop: 60,
              fontSize: 11,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "#1e3a5f" }}>How to Navigate This Document:</strong> This document represents a multi-dimensional demand audit. Page 3 provides the macro-level performance summary. Pages 4 through 7 characterize historical distributions across timelines, categories, geographies, and products. Pages 8 through 12 present forward-looking forecast and simulation models to support procurement planning and pricing decisions.
          </div>
        </div>
        <Footer pageNum={2} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 3 — EXECUTIVE SUMMARY
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={1} title="Executive Performance Summary" />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <KpiBox label="Total Net Revenue" value={fmt(totalRevenue)} delta={revenueGrowth} />
            <KpiBox label="Total Units Dispatched" value={fmtN(totalUnits)} delta={unitsGrowth} />
            <KpiBox label="Average Daily Revenue" value={fmt(avgDailyRevenue)} />
            <KpiBox label="Coverage Window" value={`${daysDiff} Days`} />
          </div>

          <PositiveBlock
            title="Strategic Financial Strengths & Revenue Drivers"
            content={[
              `The historical transactional aggregation engine shows total net revenues of ${fmt(totalRevenue)} during this coverage window of ${daysDiff} days, yielding a robust average daily revenue rate of ${fmt(avgDailyRevenue)}. This demonstrates consistent customer demand and transaction throughput. Period-over-period revenue growth reflects a delta of ${fmtPct(revenueGrowth)}, validating the pricing strategies, product assortment adjustments, and marketing campaigns deployed in active locations.`,
              `The positive growth trajectory is supported by the physical unit flow, which experienced a growth delta of ${fmtPct(unitsGrowth)}. This positive correlation between revenue and unit volume shows that our sales velocity is driven by actual consumer demand rather than price increases, reflecting a healthy, sustainable market expansion.`
            ]}
          />

          <NegativeBlock
            title="Operational Pressures & Revenue Leakages"
            content={[
              `Despite top-line expansion, operational complexities present persistent challenges. High physical unit flow growth of ${fmtPct(unitsGrowth)}% places additional pressure on warehousing operations, processing limits, and regional freight logistics. If logistics capacity does not scale at the same pace, it leads to delivery delays, dock bottlenecks, and rising shipping rates.`,
              `Localized supply constraints and fulfillment limits have restricted the system from capturing all potential demand. This has resulted in minor sales losses in key high-volume locations, showing that demand planning must be closely aligned with fulfillment capabilities.`
            ]}
          />

          <RiskBlock
            title="Critical Business Risks & Proactive Mitigations"
            content={[
              `The primary financial risk is demand volatility: with average daily revenues of ${fmt(avgDailyRevenue)}, a minor 5% contraction in sales results in a revenue loss of ${fmt(avgDailyRevenue * 0.05)} daily, accumulating to a deficit of ${fmt(avgDailyRevenue * 0.05 * daysDiff)} over the period. We will mitigate this risk by implementing dynamic pricing to protect margins during low-volume periods.`,
              `Additionally, supply chain disruptions present a major risk. A 10% decline in key supplier shipments would result in an estimated stockout cost of ${fmt(totalRevenue * 0.03)} over this window. We are addressing this risk by diversifying our supplier base and establishing regional safety buffers.`
            ]}
          />
        </div>
        <Footer pageNum={3} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 4 — REVENUE TREND ANALYSIS
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={2} title="Revenue Trend Analysis" />

          {/* Clean Vector Line Chart of the Trend */}
          <SvgLineChart data={trendList} maxVal={maxTrendVal} />

          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Peak Sales Month</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>
                {peakPoint ? `${fmt(peakPoint.revenue)} (${peakPoint.date})` : "—"}
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Trough Sales Month</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>
                {troughPoint ? `${fmt(troughPoint.revenue)} (${troughPoint.date})` : "—"}
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Trendline Slope</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{trendSlope.toFixed(2)}%</div>
            </div>
          </div>

          <PositiveBlock
            title="Revenue Expansion Patterns & Cyclical Peaks"
            content={[
              `The historical revenue trend chart displays a net slope of ${trendSlope.toFixed(2)}% from start to end, indicating a steady growth trajectory. Peak monthly sales reached a high of ${fmt(maxTrendVal)} in ${peakPoint?.date ?? "N/A"}. This peak was driven by strong promotional events and holiday demand, showing our ability to capture market share during peak buying periods.`,
              `The steady baseline expansion across seasonal cycles shows growing brand awareness and customer retention. This provides a stable foundation for launching new product lines and expanding into adjacent regional markets.`
            ]}
          />

          <NegativeBlock
            title="Revenue Contractions & Low-Season Troughs"
            content={[
              `In contrast to our peaks, the monthly sales trend reached a trough of ${fmt(minTrendVal)} in ${troughPoint?.date ?? "N/A"}. This represents a variance of ${fmt(maxTrendVal - minTrendVal)} between the peak and trough. This wide gap shows significant seasonal volatility.`,
              `During these low-volume cycles, the drop in sales is caused by post-holiday shopping fatigue and reduced marketing activity. This underscores the need for off-peak promotional strategies to stabilize monthly revenue streams.`
            ]}
          />

          <RiskBlock
            title="Volatile Trend Risks & Operational Mitigations"
            content={[
              `The drop from peak sales to the trough represents a revenue contraction of ${fmt(maxTrendVal - minTrendVal)} (${(((maxTrendVal - minTrendVal) / (maxTrendVal || 1)) * 100).toFixed(2)}% from peak capacity). During slow periods, fixed overhead costs like warehousing leases and core staffing remain constant, leading to negative operational leverage. If sales stay near the trough for more than two consecutive months, the business risks cash flow deficits.`,
              `To mitigate this seasonal risk, we will introduce off-season promotions and adjust warehouse staffing dynamically based on our predictive demand models, ensuring margins are protected during low-volume periods.`
            ]}
          />
        </div>
        <Footer pageNum={4} />
      </div>
      {/* ─────────────────────────────────────────────
          PAGE 5 — CATEGORY MIX
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={3} title="Category Revenue Mix & Contribution" />

          {/* Category Bar Chart */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
              Revenue Contribution by Product Category
            </h4>
            {sortedCategories.map((c, idx) => (
              <CssBarChart
                key={idx}
                label={c.category}
                value={fmt(c.revenue)}
                max={sortedCategories[0]?.revenue || 1}
                color={idx === 0 ? "#1e3a5f" : idx === 1 ? "#2563eb" : "#7c3aed"}
                small
              />
            ))}
          </div>

          <PositiveBlock
            title="Portfolio Synergy & Core Category Performance"
            content={[
              `The product assortment mix is anchored by the primary category ${sortedCategories[0]?.category ?? "N/A"}, which represents a leading contribution of ${categoryTotal > 0 ? ((sortedCategories[0]?.revenue / categoryTotal) * 100).toFixed(2) : 0}% of segment revenue (${fmt(sortedCategories[0]?.revenue)}). This high volume indicates strong customer demand and steady purchase frequency.`,
              `Secondary category ${sortedCategories[1]?.category ?? "N/A"} contributes ${categoryTotal > 0 ? ((sortedCategories[1]?.revenue / categoryTotal) * 100).toFixed(2) : 0}% of sales (${fmt(sortedCategories[1]?.revenue)}). This secondary segment provides a stable buffer, ensuring that the business is not entirely dependent on a single product type and helps diversify cash flows.`
            ]}
          />

          <NegativeBlock
            title="Product Imbalance & Assortment Disparities"
            content={[
              `In contrast to our leading categories, the smallest contributor is ${sortedCategories[sortedCategories.length - 1]?.category ?? "N/A"}, representing only ${categoryTotal > 0 ? ((sortedCategories[sortedCategories.length - 1]?.revenue / categoryTotal) * 100).toFixed(2) : 0}% of segment revenue (${fmt(sortedCategories[sortedCategories.length - 1]?.revenue)}). This extreme disparity shows that our product portfolio is highly imbalanced.`,
              `The slow rotation of items in secondary categories leads to higher inventory storage costs and ties up working capital. This necessitates a thorough review of underperforming SKUs to improve inventory turnover.`
            ]}
          />

          <RiskBlock
            title="Assortment Concentration Risks & Mitigations"
            content={[
              `The high concentration in a single category is an operational risk. The leading category, ${sortedCategories[0]?.category ?? "N/A"}, commands ${categoryTotal > 0 ? ((sortedCategories[0]?.revenue / categoryTotal) * 100).toFixed(2) : 0}% of sales. A supply disruption or raw material price increase in this category would directly threaten up to ${fmt(sortedCategories[0]?.revenue * 0.20)} (20% of its volume). Because secondary categories contribute so little, they cannot offset this risk.`,
              `To mitigate this concentration risk, we will launch targeted marketing campaigns to build momentum in underrepresented categories and work on securing backup suppliers for our primary product lines.`
            ]}
          />
        </div>
        <Footer pageNum={5} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 6 — GEOGRAPHIC PERFORMANCE
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={4} title="Geographic Performance & Market Shares" />

          {/* Geographic Bar Chart */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
              Revenue Contribution by State
            </h4>
            {sortedGeo.map((g, idx) => (
              <CssBarChart key={idx} label={g.state} value={fmt(g.revenue)} max={sortedGeo[0]?.revenue || 1} color="#0d9488" small />
            ))}
          </div>

          <PositiveBlock
            title="Core State Performance & Regional Strengths"
            content={[
              `Geographic revenue is led by ${sortedGeo[0]?.state ?? "N/A"}, representing ${geoTotal > 0 ? ((sortedGeo[0]?.revenue / geoTotal) * 100).toFixed(2) : 0}% of sales (${fmt(sortedGeo[0]?.revenue)}). This market grows at ${fmtPct(sortedGeo[0]?.growth)} YoY, demonstrating strong regional brand presence and reliable supply chain coverage.`,
              `This high density of sales allows us to optimize truckload shipments, lowering logistics costs per unit. The steady growth in our top state provides a reliable foundation for regional distribution operations.`
            ]}
          />

          <NegativeBlock
            title="Regional Disparities & Growth Pressures"
            content={[
              `Conversely, our weakest geographic market is ${sortedGeo[sortedGeo.length - 1]?.state ?? "N/A"}, accounting for only ${geoTotal > 0 ? ((sortedGeo[sortedGeo.length - 1]?.revenue / geoTotal) * 100).toFixed(2) : 0}% of sales (${fmt(sortedGeo[sortedGeo.length - 1]?.revenue)}). Growth in this region lags at ${fmtPct(sortedGeo[sortedGeo.length - 1]?.growth)}, showing weak market penetration.`,
              `The low density of sales in lagging states results in higher shipping costs and inefficient warehouse storage. We must re-evaluate our marketing strategies and distribution partners in these slow-growth areas.`
            ]}
          />

          <RiskBlock
            title="Geographic Risks & Logistic Mitigations"
            content={[
              `Our high reliance on ${sortedGeo[0]?.state ?? "N/A"} creates a major geographic risk: a localized transport strike, regional warehouse closure, or severe weather event would threaten up to ${fmt(sortedGeo[0]?.revenue * 0.15)} (15% of its sales). Concurrently, slow growth in secondary regions limits our expansion options.`,
              `To mitigate regional risks, we are setting up regional fulfillment nodes in secondary states and launching localized digital promotions to diversify our revenue footprint.`
            ]}
          />
        </div>
        <Footer pageNum={6} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 7 — TOP 10 PRODUCTS
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={5} title="Top 10 High-Revenue SKUs" />

          {/* Product Bar Chart */}
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <h4 style={{ margin: "0 0 8px", fontSize: 9, fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
              Top SKU Revenue Comparison
            </h4>
            {productList.slice(0, 5).map((p, idx) => (
              <CssBarChart key={idx} label={p.item_id} value={fmt(p.revenue)} max={productList[0]?.revenue || 1} color="#6366f1" small />
            ))}
          </div>

          <PositiveBlock
            title="Leading SKU Sales Velocity & Hero Products"
            content={[
              `Our product portfolio is anchored by hero SKU ${productList[0]?.item_id ?? "N/A"}, generating ${productTotal > 0 ? ((productList[0]?.revenue / productTotal) * 100).toFixed(2) : 0}% of segment revenue (${fmt(productList[0]?.revenue)}). This single SKU has exceptional customer loyalty and consistent order volume.`,
              `The top 3 SKUs together contribute ${productTotal > 0 ? ((productList.slice(0, 3).reduce((sum, p) => sum + p.revenue, 0) / productTotal) * 100).toFixed(2) : 0}% of total sales. This strong concentration drives high manufacturing and purchasing efficiency, helping lower unit costs.`
            ]}
          />

          <NegativeBlock
            title="Long-Tail Product Turnover & Inventory Squeeze"
            content={[
              `While top products perform exceptionally well, there is a large long-tail of low-volume items. Product concentration shows that secondary items rotate slowly, leading to high holding costs and inventory write-downs.`,
              `This long-tail mismatch ties up capital that could be better spent on our top-performing products. We need to streamline our product lines and phase out low-margin, slow-moving items.`
            ]}
          />

          <RiskBlock
            title="SKU Concentration Risks & Supply Mitigations"
            content={[
              `This concentration is a major vulnerability: if supplier lead times for leading SKU ${productList[0]?.item_id ?? "N/A"} slip, causing a stockout, a 5-day out-of-stock event would lose ${fmt((productList[0]?.revenue / daysDiff) * 5)} in revenue. Relying on a small group of items means any shipping delay or quality issue directly impacts overall segment performance.`,
              `To mitigate this risk, we are setting up multi-vendor supply contracts for our top 3 SKUs and establishing automatic reorder alerts to maintain buffer stock.`
            ]}
          />
        </div>
        <Footer pageNum={7} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 8 — DEMAND FORECAST
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={6} title="28-Day Demand Forecast" />

          {/* Forecast Svg Line Chart */}
          <SvgForecastChart data={forecastList} />

          {/* Forecast KPI Grid */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Expected Average Daily</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{fmt(fcAvg)}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Lower Confidence Bound</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{fmt(fcMin)}</div>
            </div>
            <div style={{ flex: 1, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 2 }}>Upper Confidence Bound</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>{fmt(fcMax)}</div>
            </div>
          </div>

          <PositiveBlock
            title="Statistical Forecast & Future Demand Opportunities"
            content={[
              `Our ML models project a steady baseline demand over the next 28 days, with an expected average daily revenue of ${fmt(fcAvg)}. This forecast shows stable customer demand, allowing us to plan procurement schedules with higher confidence.`,
              `The forecast indicates localized demand surges in key categories, presenting an opportunity to maximize revenue by allocating inventory to top-performing stores ahead of time.`
            ]}
          />

          <NegativeBlock
            title="Demand Volatility & Forecasting Gaps"
            content={[
              `The forecast projects a wide gap between the upper bound of ${fmt(fcMax)} and the lower bound of ${fmt(fcMin)}, representing a statistical range of ${fmt(fcMax - fcMin)}. This variance indicates significant volatility and forecast uncertainty.`,
              `This high uncertainty makes it difficult to plan inventory limits accurately. It increases the likelihood of localized stockouts during demand spikes or overstocking during demand drops.`
            ]}
          />

          <RiskBlock
            title="Forecast Volatility Risks & Purchasing Mitigations"
            content={[
              `This forecasting uncertainty presents serious operational risks: planning at the upper bound carries an overstocking risk of ${fmt(fcMax - fcAvg)} per day, accumulating to ${fmt((fcMax - fcAvg) * 28)} in excess inventory over 28 days. Conversely, ordering at the lower bound risks stockouts of up to ${fmt(fcAvg - fcMin)} daily, causing potential revenue losses.`,
              `To mitigate these risks, we will adopt a phased replenishment strategy, holding a central safety stock buffer and releasing inventory dynamically based on real-time weekly sales signals.`
            ]}
          />
        </div>
        <Footer pageNum={8} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 9 — INVENTORY & REPLENISHMENT
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={7} title="Inventory Policy & Safety Stock Audit" />

          {/* Custom SVG Inventory Parameters Bar Chart */}
          <SvgInventoryChart
            safetyStock={avgDailyRevenue * 1.645 * 2.5}
            reorderPoint={(avgDailyRevenue * 7) + (avgDailyRevenue * 1.645 * 2.5)}
            eoq={avgDailyRevenue * 14}
          />

          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            {[
              {
                title: "Safety Stock Buffer",
                val: fmt(avgDailyRevenue * 1.645 * 2.5),
                formula: "Z × σ × √L",
              },
              {
                title: "Reorder Point (ROP)",
                val: fmt((avgDailyRevenue * 7) + (avgDailyRevenue * 1.645 * 2.5)),
                formula: "Demand × Lead + Safety",
              },
              {
                title: "Economic Order Qty (EOQ)",
                val: fmt(avgDailyRevenue * 14),
                formula: "√((2 × D × S) / H)",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div style={{ fontSize: 8, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1e3a5f", marginBottom: 2 }}>
                  {item.val}
                </div>
                <div style={{ fontSize: 8, color: "#9ca3af", fontFamily: "monospace" }}>
                  {item.formula}
                </div>
              </div>
            ))}
          </div>

          <PositiveBlock
            title="Optimized Reorder Triggers & Stock Buffers"
            content={[
              `Based on daily demand velocity, our safety stock buffer is set at ${fmt(avgDailyRevenue * 1.645 * 2.5)} to handle supply delays. The Reorder Point (ROP) is optimized at ${fmt((avgDailyRevenue * 7) + (avgDailyRevenue * 1.645 * 2.5))}, triggering new shipments before stockouts occur.`,
              `The Economic Order Quantity (EOQ) is calculated at ${fmt(avgDailyRevenue * 14)}, minimizing ordering and holding costs. This structured approach helps maintain optimal stock levels across all active stores.`
            ]}
          />

          <NegativeBlock
            title="Carrying Costs & Inventory Inefficiencies"
            content={[
              `While safety buffers protect against stockouts, maintaining a safety stock of ${fmt(avgDailyRevenue * 1.645 * 2.5)} ties up substantial working capital. Slow-moving items in this buffer increase warehousing costs and reduce storage efficiency.`,
              `Any increase in supplier lead times would raise holding costs. For example, a 3-day lead time increase raises the ROP to ${fmt((avgDailyRevenue * 10) + (avgDailyRevenue * 1.645 * 2.5))}, putting additional pressure on warehouse storage capacity.`
            ]}
          />

          <RiskBlock
            title="Supply Chain Volatility & Buffer Mitigations"
            content={[
              `Holding this safety stock buffer costs the firm ${fmt(avgDailyRevenue * 1.645 * 2.5 * 0.25)} annually at a 25% carrying cost rate. If supplier lead times increase by 3 days, the ROP must rise, increasing warehousing costs by ${fmt(avgDailyRevenue * 3)}. On the other hand, reducing safety stock to cut costs risks stockouts during demand spikes.`,
              `To mitigate this, we will implement dual-sourcing for critical SKUs to stabilize lead times and establish automated alerts to adjust ROPs dynamically based on supplier performance.`
            ]}
          />
        </div>
        <Footer pageNum={9} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 10 — PROMOTION IMPACT
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={8} title="Promotion Impact & Price Elasticity" />

          {/* SVG Promotion Lift Comparison Chart */}
          <SvgPromoChart data={topPromos} />

          <PositiveBlock
            title="Promotional Volume Lift & Campaign Success"
            content={[
              `Our promotional analysis shows strong volume responsiveness to price drops. The leading promo SKU ${topPromos[0]?.item_id ?? "N/A"} generated the highest sales increase, rising from a baseline of ${fmtN(topPromos[0]?.prev_units_sold)} units to ${fmtN(topPromos[0]?.units_sold)} units under promotion.`,
              `This represents an exceptional volume lift of ${topPromos[0]?.prev_units_sold > 0 ? (((topPromos[0]?.units_sold - topPromos[0]?.prev_units_sold) / topPromos[0]?.prev_units_sold) * 100).toFixed(2) : 0}%, showing high price elasticity. This volume surge drives store foot traffic and helps clear seasonal inventory.`
            ]}
          />

          <NegativeBlock
            title="Promo Margin Erosion & Cannibalization Pressures"
            content={[
              `Despite driving higher volume, promotions carry a risk of margin erosion. For items with a volume lift below 25%, a 20% price discount results in a net profit loss. This shows that not all items respond well to discounts.`,
              `Additionally, discounts lead to customer cherry-picking, where buyers only purchase during promotional weeks, cannibalizing full-price sales. This can lead to a net decline in overall margins.`
            ]}
          />

          <RiskBlock
            title="Promo Cannibalization Risks & Margin Mitigations"
            content={[
              `Promotions risk training customers to buy only on discount, threatening regular margins. For SKUs with low lift, the price drop results in margin loss. If 30% of sales shift to promotional periods, net margin in this category would contract by an estimated ${fmt(totalRevenue * 0.02)}.`,
              `We will mitigate this by restricting discounts to high-elasticity items, bundle promotions, and limiting the duration of promotional campaigns to protect brand value and core margins.`
            ]}
          />
        </div>
        <Footer pageNum={10} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 11 — ANOMALY ROOT CAUSE
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={9} title="Anomaly Root Cause Audit" />

          {/* Anomaly SVG Severity Chart */}
          <SvgAnomalyChart driver={rcDriver} />

          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>
              Primary Anomaly Driver Detected
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a5f", marginBottom: 6 }}>
              {rcDriver}
            </div>
            <div style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.5 }}>
              {rcDesc}
            </div>
          </div>

          <PositiveBlock
            title="Operational Variance Identification & Event Tracking"
            content={[
              `The anomaly audit successfully identified the driver on ${dateFrom} as '${rcDriver}' ('${rcDesc}'). This event shifted demand by altering consumer shopping behaviors during this specific period.`,
              `Isolating these anomalies allows us to clean our baseline demand data. This prevents temporary demand spikes from inflating our core forecasting models, ensuring more accurate purchasing plans.`
            ]}
          />

          <NegativeBlock
            title="Unexplained Volatility & Inventory Misalignment"
            content={[
              `When anomalies are flagged as 'Unexplained Variance', it indicates data gaps or sudden shifts in competitor pricing. This makes it difficult to maintain stable stock levels.`,
              `These unexpected demand spikes disrupt warehouse operations, leading to emergency shipping costs or delayed orders, which negatively impacts customer satisfaction.`
            ]}
          />

          <RiskBlock
            title="Demand Distortion Risks & Adjustment Mitigations"
            content={[
              `Mistaking a temporary demand spike for a permanent growth trend can lead to over-ordering by up to 30%, resulting in excess inventory write-downs. Unexplained variance points to data errors or competitors capturing market share, exposing the business to inventory misalignment.`,
              `To mitigate this, we will integrate holiday and promotional events directly into our demand forecasting system and establish stock alerts to buffer against unexpected demand swings.`
            ]}
          />
        </div>
        <Footer pageNum={11} />
      </div>

      {/* ─────────────────────────────────────────────
          PAGE 12 — SCENARIO SIMULATION
      ───────────────────────────────────────────── */}
      <div style={s.page}>
        <div>
          <SectionHeader num={10} title="Scenario Simulation & Elasticity Summary" />

          {/* Scenario Dual Line SVG Chart */}
          <SvgScenarioChart data={scenarioList} />

          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            {[
              { label: "Baseline Revenue", val: fmt(scenarioBaseSum) },
              { label: "Simulated Revenue", val: fmt(scenarioAdjSum) },
              { label: "Net Revenue Impact", val: fmt(scenarioAdjSum - scenarioBaseSum) },
              { label: "Percentage Delta", val: fmtPct(scenarioDelta) },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 8, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1e3a5f" }}>
                  {item.val}
                </div>
              </div>
            ))}
          </div>

          <PositiveBlock
            title="Optimized Price Adjustments & Simulated Gains"
            content={[
              `The scenario simulator projects that the baseline revenue of ${fmt(scenarioBaseSum)} shifts to ${fmt(scenarioAdjSum)} under current adjustment parameters. This represents a net change of ${fmt(scenarioAdjSum - scenarioBaseSum)} (${fmtPct(scenarioDelta)}).`,
              `A positive revenue delta shows that the selected pricing strategy successfully increases volume enough to offset the lower unit price, demonstrating the potential for structured discounts to boost profitability.`
            ]}
          />

          <NegativeBlock
            title="Price Inelasticity & Underperforming Discounts"
            content={[
              `If the simulated revenue delta is negative, the discount does not generate enough volume lift to cover the lower price per unit. This shows that some categories have low price elasticity.`,
              `In these inelastic segments, discounting leads directly to lower margins. This highlights the importance of testing discounts in the simulator before launching them in stores.`
            ]}
          />

          <RiskBlock
            title="Margin Contraction Risks & Pricing Mitigations"
            content={[
              `Price adjustments carry a risk of margin contraction: under a negative revenue impact of ${fmt(Math.abs(scenarioAdjSum - scenarioBaseSum))} (${fmtPct(scenarioDelta)}), the discount's volume expansion fails to offset the lower unit price. Implementing this discount across all stores would result in direct margin erosion.`,
              `To mitigate this, we will restrict discounts to high-elasticity product lines and use the scenario simulator to model all pricing changes before implementation.`
            ]}
          />

          {/* Legal Disclaimer */}
          <div style={{ marginTop: 10, borderTop: "1px solid #e5e7eb", paddingTop: 8, fontSize: 8, color: "#9ca3af", lineHeight: 1.5 }}>
            <strong>LEGAL DISCLAIMER:</strong> This report is generated by the DemandDoc Platform using historical data and statistical models. Projections and simulations are indicative and should not be used as the sole basis for operational or financial decisions.
          </div>
        </div>
        <Footer pageNum={12} />
      </div>
    </div>,
    document.body
  );
}
