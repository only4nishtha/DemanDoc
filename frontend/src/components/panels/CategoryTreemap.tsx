import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { fetchTreemap } from "../../api/client";
import { useStore } from "../../store/useStore";

interface CategoryMix {
  category: string;
  revenue: number;
  revenue_growth_pct: number;
}

export default function CategoryTreemap() {
  const { stateLocation, dateFrom, dateTo } = useStore();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["treemap", stateLocation, dateFrom, dateTo],
    queryFn: () => fetchTreemap({
      state: stateLocation,
      date_from: dateFrom,
      date_to: dateTo
    }),
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 animate-pulse">
        Loading Category Mix...
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="h-[300px] flex items-center justify-center text-red-400">
        Error loading category mix
      </div>
    );
  }

  const rawList: CategoryMix[] = response.categories || [];
  const chartData = rawList.map((item) => {
    const sign = item.revenue_growth_pct >= 0 ? "+" : "";
    return {
      name: `${item.category}\n(${sign}${item.revenue_growth_pct.toFixed(1)}%)`,
      value: item.revenue,
    };
  });

  // Calculate dynamic insights
  let leadingCategory = "N/A";
  let laggingCategory = "N/A";
  let trendText = "Calculating category mix...";
  let concernText = "Monitoring all category segments.";

  if (rawList.length > 0) {
    const sortedByRevenue = [...rawList].sort((a, b) => b.revenue - a.revenue);
    const sortedByGrowth = [...rawList].sort((a, b) => b.revenue_growth_pct - a.revenue_growth_pct);
    
    leadingCategory = sortedByRevenue[0].category;
    laggingCategory = sortedByRevenue[sortedByRevenue.length - 1].category;

    trendText = `${leadingCategory} drives the largest share of sales volume. ${sortedByGrowth[0].category} is the fastest-growing sector at +${sortedByGrowth[0].revenue_growth_pct.toFixed(1)}% YoY.`;
    concernText = `${laggingCategory} represents the weakest performance segment, growing at ${sortedByRevenue[sortedByRevenue.length - 1].revenue_growth_pct.toFixed(1)}% YoY. Watch for overall volume dilution.`;
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      formatter: "{b}: ${c}",
      backgroundColor: "#1F2937",
      borderWidth: 0,
      textStyle: { color: "#fff" },
    },
    series: [
      {
        type: "treemap",
        data: chartData,
        leafDepth: 1,
        levels: [
          {
            itemStyle: {
              borderColor: "#151922",
              borderWidth: 2,
              gapWidth: 2,
            },
          },
          {
            color: ["#2DD4BF", "#06B6D4", "#3B82F6"],
            colorMappingBy: "value",
          },
        ],
        label: {
          show: true,
          formatter: "{b}",
          fontSize: 11,
        },
      },
    ],
  };

  return (
    <div className="flex flex-col space-y-4">
      <ReactECharts option={option} style={{ height: "200px" }} theme="dark" />
      <div className="bg-[#1E2432]/40 p-4 rounded-xl border border-[#252B38] space-y-3.5">
        <div>
          <h4 className="text-[10px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-0.5">
            📊 Category Trend
          </h4>
          <p className="text-[11px] text-gray-300 leading-normal">{trendText}</p>
        </div>
        <div className="border-t border-[#252B38] pt-2">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">
            ⚠️ Product Concern
          </h4>
          <p className="text-[11px] text-gray-300 leading-normal">{concernText}</p>
        </div>
      </div>
    </div>
  );
}
