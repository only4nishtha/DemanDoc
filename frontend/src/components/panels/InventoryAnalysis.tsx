import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrend } from "../../api/client";
import { useStore } from "../../store/useStore";

interface TrendPoint {
  date: string;
  revenue: number;
  units: number;
  forecast_revenue: number | null;
}

export default function InventoryAnalysis() {
  const { category, stateLocation, dateFrom, dateTo } = useStore();
  const [leadTime, setLeadTime] = useState<number>(7); // Lead time in days
  const [serviceLevel, setServiceLevel] = useState<number>(95); // Service level percentage

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["inventoryTrend", category, stateLocation, dateFrom, dateTo],
    queryFn: () =>
      fetchTrend({
        category,
        state: stateLocation,
        date_from: dateFrom,
        date_to: dateTo,
        granularity: "daily",
      }),
  });

  if (isLoading) {
    return (
      <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4 animate-pulse">
        <div className="h-6 bg-[#1F2937] rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#1F2937] rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
        Error loading replenishment metrics
      </div>
    );
  }

  const points: TrendPoint[] = response.data || [];
  const unitSales = points.map((p) => p.units).filter((u) => u !== null && !isNaN(u));

  // If no unit sales are available, fall back to safe default calculations
  let avgDailyDemand = 0;
  let stdDevDemand = 0;

  if (unitSales.length > 0) {
    const totalUnits = unitSales.reduce((acc, val) => acc + val, 0);
    avgDailyDemand = totalUnits / unitSales.length;

    const variance =
      unitSales.reduce((acc, val) => acc + Math.pow(val - avgDailyDemand, 2), 0) /
      unitSales.length;
    stdDevDemand = Math.sqrt(variance);
  }

  // Z-value mapping
  const zValues: Record<number, number> = {
    90: 1.28,
    95: 1.65,
    99: 2.33,
  };
  const Z = zValues[serviceLevel] || 1.65;

  // Inventory logic
  const safetyStock = Z * stdDevDemand * Math.sqrt(leadTime);
  const reorderPoint = avgDailyDemand * leadTime + safetyStock;

  return (
    <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#252B38] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Replenishment & Safety Stock Planning
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Statistical recommendations based on standard deviation of daily demand
          </p>
        </div>

        {/* Inputs */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Lead Time (L):</span>
            <select
              value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value))}
              className="bg-[#1C2230] border border-[#252B38] text-xs text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-[#2DD4BF]"
            >
              {[3, 5, 7, 10, 14, 21].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Service Level:</span>
            <div className="flex bg-[#1C2230] border border-[#252B38] rounded p-0.5">
              {[90, 95, 99].map((sl) => (
                <button
                  key={sl}
                  onClick={() => setServiceLevel(sl)}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
                    serviceLevel === sl
                      ? "bg-[#2DD4BF] text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {sl}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1C2230]/40 p-4 rounded-xl border border-[#252B38] space-y-1">
          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
            Daily Demand Std Dev (σ)
          </span>
          <p className="text-2xl font-extrabold text-white">
            {stdDevDemand.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </p>
          <span className="text-[10px] text-gray-500 block">Variance in daily sales</span>
        </div>

        <div className="bg-[#1C2230]/40 p-4 rounded-xl border border-[#252B38] space-y-1">
          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
            Avg Daily Demand (d)
          </span>
          <p className="text-2xl font-extrabold text-white">
            {avgDailyDemand.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </p>
          <span className="text-[10px] text-gray-500 block">Daily average units</span>
        </div>

        <div className="bg-[#1C2230]/40 p-4 rounded-xl border border-[#252B38] space-y-1 border-l-2 border-l-[#2DD4BF]">
          <span className="text-[#2DD4BF] text-[10px] font-bold uppercase tracking-wider">
            Safety Stock
          </span>
          <p className="text-2xl font-extrabold text-white">
            {Math.ceil(safetyStock).toLocaleString()}
          </p>
          <span className="text-[10px] text-gray-500 block">Z ({Z}) × σ_d × √L</span>
        </div>

        <div className="bg-[#1C2230]/40 p-4 rounded-xl border border-[#252B38] space-y-1 border-l-2 border-l-cyan-400">
          <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
            Reorder Point (ROP)
          </span>
          <p className="text-2xl font-extrabold text-white">
            {Math.ceil(reorderPoint).toLocaleString()}
          </p>
          <span className="text-[10px] text-gray-500 block">(d × L) + Safety Stock</span>
        </div>
      </div>

      {/* Contextual Narrative */}
      <div className="bg-[#1C2230]/20 p-4 rounded-lg border border-[#252B38] text-xs text-gray-300 space-y-2">
        <p className="leading-relaxed">
          <strong className="text-white">Replenishment Action Trigger:</strong> Place a new purchase order
          for safety replenishment when the current inventory level falls below{" "}
          <strong className="text-[#2DD4BF]">{Math.ceil(reorderPoint).toLocaleString()} units</strong>.
          This buffer prevents stockouts due to demand spikes with a{" "}
          <strong className="text-white">{serviceLevel}%</strong> statistical confidence interval during
          the <strong className="text-white">{leadTime}-day</strong> supplier fulfillment lead time.
        </p>
      </div>
    </div>
  );
}
