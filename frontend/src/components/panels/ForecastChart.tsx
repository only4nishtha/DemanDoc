import { useQuery } from "@tanstack/react-query";
import ReactECharts from "echarts-for-react";
import { fetchForecast } from "../../api/client";
import { useStore } from "../../store/useStore";

interface ForecastPoint {
  date: string;
  actual_revenue: number | null;
  forecast_revenue: number;
  lower_bound: number;
  upper_bound: number;
}

export default function ForecastChart() {
  const { category, stateLocation } = useStore();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["forecast", category, stateLocation],
    queryFn: () => fetchForecast({
      category,
      state: stateLocation,
      horizon: "28"
    }),
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500 animate-pulse">
        Running Prophet Forecasting Engine...
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="h-[300px] flex items-center justify-center text-red-400">
        Error generating forecast
      </div>
    );
  }

  const forecastData: ForecastPoint[] = response.data || [];
  const dates = forecastData.map((d) => d.date);
  const actuals = forecastData.map((d) => d.actual_revenue !== null ? Math.round(d.actual_revenue) : null);
  const predictions = forecastData.map((d) => Math.round(d.forecast_revenue));
  const lowerBands = forecastData.map((d) => Math.round(d.lower_bound));
  const upperBands = forecastData.map((d) => Math.round(d.upper_bound));

  // Calculate dynamic forecast insights
  let trendText = "Forecasting future demand...";
  let concernText = "Monitoring model variance.";

  const futurePoints = forecastData.filter((d) => d.actual_revenue === null);
  if (futurePoints.length > 0) {
    const totalForecast = futurePoints.reduce((acc, curr) => acc + curr.forecast_revenue, 0);
    const minLower = Math.min(...futurePoints.map((d) => d.lower_bound));
    
    trendText = `Prophet projects a total of $${totalForecast.toLocaleString(undefined, { maximumFractionDigits: 0 })} in sales revenue over the upcoming 28-day horizon.`;
    concernText = `Confidence Interval Warning: The projected daily revenue floor could drop to $${minLower.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Maintain adequate inventory levels.`;
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
      data: ["Actual Revenue", "Forecasted Revenue", "Confidence Bounds"],
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
        rotate: 30, // Rotate dates to prevent overlaps
        fontSize: 10
      },
    },
    yAxis: {
      type: "value",
      name: "Revenue ($)",
      axisLine: { lineStyle: { color: "#374151" } },
      axisLabel: { color: "#9CA3AF" },
      splitLine: { lineStyle: { color: "#1F2937" } },
    },
    series: [
      {
        name: "Actual Revenue",
        type: "line",
        data: actuals,
        smooth: true,
        itemStyle: { color: "#2DD4BF" },
        lineStyle: { width: 2 },
      },
      {
        name: "Forecasted Revenue",
        type: "line",
        data: predictions,
        smooth: true,
        itemStyle: { color: "#F59E0B" },
        lineStyle: { width: 3 },
      },
      {
        name: "Confidence Upper",
        type: "line",
        data: upperBands,
        lineStyle: { opacity: 0 },
        stack: "confidence-band",
        symbol: "none",
      },
      {
        name: "Confidence Lower",
        type: "line",
        data: lowerBands,
        lineStyle: { opacity: 0 },
        stack: "confidence-band",
        symbol: "none",
        areaStyle: {
          color: "#F59E0B",
          opacity: 0.1,
        },
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
          <h4 className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider mb-1">
            28-Day Forecast
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{trendText}</p>
        </div>
        <div className="border-t border-[#252B38] pt-3">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
            Safety Floor
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{concernText}</p>
        </div>
      </div>
    </div>
  );
}
