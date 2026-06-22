import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { fetchScenario } from "../../api/client";
import { useStore } from "../../store/useStore";

interface ScenarioPoint {
  date: string;
  baseline_revenue: number;
  adjusted_revenue: number;
}

export default function ScenarioSimulator() {
  const { category, stateLocation } = useStore();
  const [priceChange, setPriceChange] = useState<number>(0);
  const [promoUplift, setPromoUplift] = useState<number>(0);

  const { data: response, isLoading } = useQuery({
    queryKey: ["scenario", category, stateLocation, priceChange, promoUplift],
    queryFn: () => fetchScenario({
      category,
      state: stateLocation,
      price_delta_pct: priceChange.toString(),
      promo_uplift_pct: promoUplift.toString()
    }),
  });

  const list: ScenarioPoint[] = response?.scenario || [];
  const dates = list.map((d) => d.date);
  const baseline = list.map((d) => Math.round(d.baseline_revenue));
  const adjusted = list.map((d) => Math.round(d.adjusted_revenue));

  // Compute metrics summary
  const totalBase = baseline.reduce((a, b) => a + b, 0);
  const totalAdj = adjusted.reduce((a, b) => a + b, 0);
  const revDiff = totalAdj - totalBase;
  const revDiffPct = totalBase > 0 ? (revDiff / totalBase) * 100 : 0.0;

  // Calculate dynamic insights based on simulated outcomes
  let simTrend = "Adjust the sliders to simulate pricing elasticity outcomes.";
  let simConcern = "Assess changes in margins vs units sold.";

  if (totalBase > 0) {
    if (revDiff > 0) {
      simTrend = `Simulated adjustments yield a net revenue expansion of +$${revDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })} (+${revDiffPct.toFixed(2)}% above baseline).`;
      simConcern = `Although revenue grows, verify that price increases don't alienate long-term customer demand.`;
    } else if (revDiff < 0) {
      simTrend = `Simulated adjustments yield a net revenue contraction of -$${Math.abs(revDiff).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${revDiffPct.toFixed(2)}% below baseline).`;
      simConcern = `Margin Alert: The discount's volume expansion fails to offset the lower unit price. Strategy is margin-negative.`;
    } else {
      simTrend = "Simulated outcome matches baseline revenue.";
      simConcern = "No change in financial metrics.";
    }
  }

  const chartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1F2937",
      borderWidth: 0,
      textStyle: { color: "#fff" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { lineStyle: { color: "#374151" } },
      axisLabel: { show: false },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#374151" } },
      axisLabel: { color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#1F2937" } },
    },
    series: [
      {
        name: "Baseline Revenue",
        type: "line",
        data: baseline,
        smooth: true,
        itemStyle: { color: "#9CA3AF" },
        lineStyle: { width: 1.5 },
      },
      {
        name: "Adjusted Revenue",
        type: "line",
        data: adjusted,
        smooth: true,
        itemStyle: { color: "#F59E0B" },
        lineStyle: { width: 2 },
        areaStyle: {
          color: "#F59E0B",
          opacity: 0.05,
        },
      },
    ],
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Price Slider */}
          <div className="bg-[#1D2432]/50 p-4 rounded-xl border border-[#252B38]">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Price Change: {priceChange >= 0 ? `+${priceChange}` : priceChange}%
            </label>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={priceChange}
              onChange={(e) => setPriceChange(Number(e.target.value))}
              className="w-full h-1.5 bg-[#252B38] rounded-lg appearance-none cursor-pointer accent-[#2DD4BF]"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>-30% (Discount)</span>
              <span>0% (Baseline)</span>
              <span>+30% (Markup)</span>
            </div>
          </div>

          {/* Promo Uplift Slider */}
          <div className="bg-[#1D2432]/50 p-4 rounded-xl border border-[#252B38]">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Promo Uplift: +{promoUplift}%
            </label>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={promoUplift}
              onChange={(e) => setPromoUplift(Number(e.target.value))}
              className="w-full h-1.5 bg-[#252B38] rounded-lg appearance-none cursor-pointer accent-[#2DD4BF]"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0% (No Promo)</span>
              <span>+50% (High Uplift)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="p-4 bg-[#1E2638] rounded-xl border border-[#252B38] flex flex-col justify-between h-28">
            <div>
              <h4 className="text-gray-400 text-xs font-medium uppercase">Revenue Impact</h4>
              <p className="text-2xl font-bold text-white mt-1">
                ${totalAdj.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className={`text-xs font-semibold mt-2 ${revDiff >= 0 ? "text-[#2DD4BF]" : "text-red-400"}`}>
              {revDiff >= 0 ? "+" : ""}${revDiff.toLocaleString(undefined, { maximumFractionDigits: 0 })} ({revDiff >= 0 ? "+" : ""}{revDiffPct.toFixed(2)}%)
            </div>
          </div>

          <div className="h-28 bg-[#1D2432]/20 border border-[#252B38] rounded-xl overflow-hidden p-2">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">Calculating...</div>
            ) : (
              <ReactECharts option={chartOption} style={{ height: "100%" }} />
            )}
          </div>
        </div>
      </div>

      <div className="col-span-12 xl:col-span-4 flex flex-col justify-center space-y-4 bg-[#1E2432]/40 p-4 rounded-xl border border-[#252B38] h-fit">
        <div>
          <h4 className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider mb-1">
            Simulated Outcome
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{simTrend}</p>
        </div>
        <div className="border-t border-[#252B38] pt-3">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
            Profitability Concern
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{simConcern}</p>
        </div>
      </div>
    </div>
  );
}
