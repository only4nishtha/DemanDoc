import { useQuery } from "@tanstack/react-query";
import { fetchRootCause } from "../../api/client";
import { useStore } from "../../store/useStore";

export default function RootCause() {
  const { category, stateLocation, dateTo, selectedDate } = useStore();
  const targetDate = selectedDate || dateTo;

  const { data, isLoading, error } = useQuery({
    queryKey: ["rootCause", targetDate, category, stateLocation],
    queryFn: () => fetchRootCause({
      date: targetDate,
      category,
      state: stateLocation
    }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-[#1D2432] rounded-lg"></div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-400 text-center py-4">Error loading anomaly root cause</div>;
  }

  // Calculate dynamic insights based on backend response
  let trendText = `Variance analysis on ${targetDate} indicates a standard operational profile.`;
  let concernText = "Maintain standard inventory levels.";

  if (data.driver === "Calendar Event") {
    trendText = `Operational variance is driven by holiday calendar events: ${data.description}`;
    concernText = "Severe risk of stockouts during major national holidays. Increase localized safety stock buffers.";
  } else if (data.driver === "SNAP Day") {
    trendText = `Operational variance is driven by monthly SNAP benefit activation: ${data.description}`;
    concernText = "SNAP activation days see high volume spikes in the Foods category. Prepare staff and logistics.";
  } else if (data.driver === "Promotion") {
    trendText = `Operational variance is driven by high-intensity weekly promotional cycle: ${data.description}`;
    concernText = "Elevated promo lift can lead to rapid SKU depleting. Align store replenishments with active price discounts.";
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-8 p-6 bg-[#1E2432]/60 border border-[#EF4444]/20 rounded-xl flex flex-col justify-between hover:border-[#EF4444]/40 transition-all">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
              Target Date: {targetDate}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 text-xs font-bold uppercase tracking-wider">
              {data.driver}
            </span>
          </div>
          <p className="text-sm text-gray-200 font-medium">{data.description}</p>
        </div>
        <div className="text-[10px] text-gray-500 italic mt-4 border-t border-[#252B38] pt-2">
          * Click a data point on the Revenue Trend line to instantly dissect another date's anomalies.
        </div>
      </div>
      <div className="col-span-12 xl:col-span-4 flex flex-col justify-center space-y-4 bg-[#1E2432]/40 p-4 rounded-xl border border-[#252B38] h-fit">
        <div>
          <h4 className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider mb-1">
            🔍 Variance Trend
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{trendText}</p>
        </div>
        <div className="border-t border-[#252B38] pt-3">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
            ⚠️ Stockout Concern
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{concernText}</p>
        </div>
      </div>
    </div>
  );
}
