import { useQuery } from "@tanstack/react-query";
import { fetchKpis } from "../../api/client";
import { useStore } from "../../store/useStore";

export default function KpiCards() {
  const { category, stateLocation, dateFrom, dateTo } = useStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ["kpis", category, stateLocation, dateFrom, dateTo],
    queryFn: () => fetchKpis({
      category,
      state: stateLocation,
      date_from: dateFrom,
      date_to: dateTo
    }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[#151922] p-6 rounded-xl border border-[#252B38] h-28"></div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-center">
        Error loading KPIs
      </div>
    );
  }

  const formatRevenue = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatUnits = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const renderPct = (val: number) => {
    const isPos = val >= 0;
    return (
      <span className={`text-xs font-semibold ml-2 ${isPos ? "text-[#2DD4BF]" : "text-red-400"}`}>
        {isPos ? "+" : ""}{val.toFixed(2)}% vs prior
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Total Revenue */}
      <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] flex flex-col justify-between hover:border-[#2DD4BF]/40 transition-all">
        <div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Revenue</h3>
          <div className="flex items-baseline">
            <p className="text-3xl font-extrabold text-white">{formatRevenue(data.total_revenue)}</p>
            {renderPct(data.revenue_change_pct)}
          </div>
        </div>
        <div className="text-[10px] text-gray-500 mt-2">Sum of actual selling price * quantities</div>
      </div>

      {/* Units Sold */}
      <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] flex flex-col justify-between hover:border-[#2DD4BF]/40 transition-all">
        <div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Units Sold</h3>
          <div className="flex items-baseline">
            <p className="text-3xl font-extrabold text-white">{formatUnits(data.total_units_sold)}</p>
            {renderPct(data.units_change_pct)}
          </div>
        </div>
        <div className="text-[10px] text-gray-500 mt-2">Total active items sales count</div>
      </div>
    </div>
  );
}
