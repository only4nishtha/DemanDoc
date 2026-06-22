import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { fetchGeo } from "../../api/client";
import { useStore } from "../../store/useStore";

interface GeoPoint {
  state: string;
  revenue: number;
  units: number;
  growth: number;
}

export default function GeographicInsights() {
  const { category, dateFrom, dateTo } = useStore();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["geo", category, dateFrom, dateTo],
    queryFn: () => fetchGeo({
      category,
      date_from: dateFrom,
      date_to: dateTo
    }),
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 animate-pulse">
        Loading Geographic Insights...
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="h-[300px] flex items-center justify-center text-red-400">
        Error loading geographic insights
      </div>
    );
  }

  const rawData: GeoPoint[] = response.geo || [];
  // Sort states by revenue for better visualization
  const sortedData = [...rawData].sort((a, b) => a.revenue - b.revenue);

  const states = sortedData.map((item) => {
    const sign = item.growth >= 0 ? "+" : "";
    return `${item.state} (${sign}${item.growth.toFixed(1)}% YoY)`;
  });
  
  const revenues = sortedData.map((item) => item.revenue);

  // Calculate dynamic insights
  let topState = "N/A";
  let growthState = "N/A";
  let trendText = "Calculating geographic splits...";
  let concernText = "Monitoring all local states.";

  if (rawData.length > 0) {
    const sortedByRevenue = [...rawData].sort((a, b) => b.revenue - a.revenue);
    const sortedByGrowth = [...rawData].sort((a, b) => b.growth - a.growth);
    
    topState = sortedByRevenue[0].state;
    growthState = sortedByGrowth[0].state;
    
    const lowestGrowthState = sortedByGrowth[sortedByGrowth.length - 1];
    
    trendText = `${topState} leads regional contribution. State of ${growthState} shows the strongest YoY growth momentum at +${sortedByGrowth[0].growth.toFixed(1)}% YoY.`;
    concernText = `State of ${lowestGrowthState.state} shows the weakest growth momentum at ${lowestGrowthState.growth.toFixed(1)}% YoY. Check localized pricing strategy.`;
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: "{b}: ${c}",
      backgroundColor: "#1F2937",
      borderWidth: 0,
      textStyle: { color: "#fff" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "5%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#374151" } },
      axisLabel: { color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#1F2937" } },
    },
    yAxis: {
      type: "category",
      data: states,
      axisLine: { lineStyle: { color: "#374151" } },
      axisLabel: { color: "#9CA3AF" },
    },
    series: [
      {
        name: "Revenue by State",
        type: "bar",
        data: revenues,
        itemStyle: { color: "#2DD4BF" },
        barWidth: "40%",
      },
    ],
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-8">
        <ReactECharts option={option} style={{ height: "300px" }} theme="dark" />
      </div>
      <div className="col-span-12 xl:col-span-4 flex flex-col justify-center space-y-4 bg-[#1E2432]/40 p-4 rounded-xl border border-[#252B38] h-fit">
        <div>
          <h4 className="text-[10px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-1">
            Regional Splitting
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{trendText}</p>
        </div>
        <div className="border-t border-[#252B38] pt-3">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
            Local Stagnation
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{concernText}</p>
        </div>
      </div>
    </div>
  );
}
