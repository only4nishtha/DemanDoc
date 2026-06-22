import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { fetchPromotions } from "../../api/client";
import { useStore } from "../../store/useStore";

interface PromotionImpact {
  item_id: string;
  category: string;
  state: string;
  week_start_date: string;
  week_end_date: string;
  units_sold: number;
  prev_units_sold: number;
}

export default function PromotionAnalysis() {
  const { category, stateLocation } = useStore();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["promotions", category, stateLocation],
    queryFn: () => fetchPromotions({
      category,
      state: stateLocation
    }),
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 animate-pulse">
        Calculating Promotion Lift...
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="h-[300px] flex items-center justify-center text-red-400">
        Error loading promotions data
      </div>
    );
  }

  const promoList: PromotionImpact[] = (response.promotions || []).slice(0, 10);
  const items = promoList.map((p) => p.item_id);
  const unitsSold = promoList.map((p) => p.units_sold);
  const prevUnits = promoList.map((p) => p.prev_units_sold);

  // Calculate dynamic insights
  let promoTrend = "No active promotions matching filters.";
  let promoConcern = "Monitoring price changes.";

  if (promoList.length > 0) {
    const leadPromo = promoList[0];
    const liftPct = ((leadPromo.units_sold - leadPromo.prev_units_sold) / leadPromo.prev_units_sold) * 100;
    
    promoTrend = `Promotional campaign for SKU ${leadPromo.item_id} generated a sales volume spike of +${liftPct.toFixed(1)}% lift, moving ${leadPromo.units_sold} units vs ${leadPromo.prev_units_sold} baseline.`;
    promoConcern = `High promotional dependency: Assess whether these margin reductions are cannibalizing standard pricing periods or actually generating net-positive profit.`;
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1F2937",
      borderWidth: 0,
      textStyle: { color: "#fff" },
    },
    legend: {
      data: ["Units During Promotion", "Baseline Units"],
      textStyle: { color: "#9CA3AF" },
      bottom: "0%"
    },
    grid: {
      left: "3%",
      right: "3%",
      bottom: "18%",
      top: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: items,
      axisLine: { lineStyle: { color: "#374151" } },
      axisLabel: {
        color: "#9CA3AF",
        rotate: 30, // Rotate labels
        fontSize: 9
      },
    },
    yAxis: {
      type: "value",
      name: "Weekly Units",
      axisLine: { lineStyle: { color: "#374151" } },
      axisLabel: { color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#1F2937" } },
    },
    series: [
      {
        name: "Units During Promotion",
        type: "bar",
        data: unitsSold,
        itemStyle: { color: "#2DD4BF" },
      },
      {
        name: "Baseline Units",
        type: "bar",
        data: prevUnits,
        itemStyle: { color: "#9CA3AF", opacity: 0.3 },
      },
    ],
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-9">
        <ReactECharts option={option} style={{ height: "300px" }} theme="dark" />
      </div>
      <div className="col-span-12 xl:col-span-3 flex flex-col justify-center space-y-4 bg-[#1E2432]/40 p-4 rounded-xl border border-[#252B38] h-fit">
        <div>
          <h4 className="text-[10px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-1">
            Promotional Impact
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{promoTrend}</p>
        </div>
        <div className="border-t border-[#252B38] pt-3">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
            Cannibalization Risk
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{promoConcern}</p>
        </div>
      </div>
    </div>
  );
}
