import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { fetchTrend } from "../../api/client";
import { useStore } from "../../store/useStore";

interface TrendPoint {
  date: string;
  revenue: number;
  units: number;
  forecast_revenue?: number | null;
}

export default function RevenueTrend() {
  const { category, stateLocation, granularity, dateFrom, dateTo } = useStore();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["trend", category, stateLocation, granularity, dateFrom, dateTo],
    queryFn: () => fetchTrend({
      category,
      state: stateLocation,
      granularity,
      date_from: dateFrom,
      date_to: dateTo
    }),
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 animate-pulse">
        Loading Trend Chart...
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="h-[300px] flex items-center justify-center text-red-400">
        Error loading trend data
      </div>
    );
  }

  const list: TrendPoint[] = response.data || [];
  const dates = list.map((d) => d.date);
  const revenues = list.map((d) => d.revenue);
  const units = list.map((d) => d.units);
  const forecasts = list.map((d) => d.forecast_revenue || null);

  // Generate dynamic insights
  let trendInsight = "No historical sales data found.";
  let concernInsight = "Stagnant sales profile.";

  if (list.length >= 2) {
    const firstVal = list[0].revenue;
    const lastVal = list[list.length - 1].revenue;
    const slope = lastVal - firstVal;
    const pct = (slope / firstVal) * 100;
    
    if (slope > 0) {
      trendInsight = `Revenue displays strong upward momentum, expanding by +${pct.toFixed(1)}% over this timeframe.`;
    } else {
      trendInsight = `Revenue displays downward contraction, sliding by ${pct.toFixed(1)}% over this timeframe.`;
    }

    // Find anomaly or drop
    const minPoint = list.reduce((prev, curr) => (prev.revenue < curr.revenue ? prev : curr));
    const maxPoint = list.reduce((prev, curr) => (prev.revenue > curr.revenue ? prev : curr));
    concernInsight = `Revenue bottomed out on ${minPoint.date} at $${minPoint.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Contrast with peak on ${maxPoint.date}.`;
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      backgroundColor: "#1F2937",
      borderWidth: 0,
      textStyle: { color: "#fff" },
    },
    legend: {
      data: ["Actual Revenue", "Forecasted Revenue", "Units Sold"],
      textStyle: { color: "#9CA3AF" },
      bottom: "0%"
    },
    grid: {
      left: "3%",
      right: "3%",
      bottom: "15%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { lineStyle: { color: "#374151" } },
      axisLabel: { 
        color: "#9CA3AF",
        rotate: dates.length > 12 ? 30 : 0, // rotate if labels are dense
        fontSize: 10
      },
    },
    yAxis: [
      {
        type: "value",
        name: "Revenue ($)",
        axisLine: { lineStyle: { color: "#374151" } },
        axisLabel: { color: "#9CA3AF" },
        splitLine: { lineStyle: { color: "#1F2937" } },
      },
      {
        type: "value",
        name: "Units",
        axisLine: { lineStyle: { color: "#374151" } },
        axisLabel: { color: "#9CA3AF" },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Actual Revenue",
        type: "line",
        smooth: true,
        data: revenues,
        itemStyle: { color: "#2DD4BF" },
        areaStyle: {
          opacity: 0.05,
          color: "#2DD4BF",
        },
      },
      {
        name: "Forecasted Revenue",
        type: "line",
        smooth: true,
        data: forecasts,
        itemStyle: { color: "#F59E0B" },
        lineStyle: { type: "dashed", width: 2 },
      },
      {
        name: "Units Sold",
        type: "bar",
        yAxisIndex: 1,
        data: units,
        itemStyle: { color: "#06B6D4", opacity: 0.3 },
      },
    ],
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-9">
        <ReactECharts option={option} style={{ height: "300px" }} theme="dark" />
      </div>
      <div className="col-span-12 xl:col-span-3 flex flex-col justify-center space-y-4 bg-[#1E2432]/40 p-4 rounded-xl border border-[#252B38]">
        <div>
          <h4 className="text-[10px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-1">
            📈 Sales Trend
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{trendInsight}</p>
        </div>
        <div className="border-t border-[#252B38] pt-3">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
            ⚠️ Demand Warning
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{concernInsight}</p>
        </div>
      </div>
    </div>
  );
}
