import { useQuery } from "@tanstack/react-query";
import { fetchTopProducts } from "../../api/client";
import { useStore } from "../../store/useStore";

interface Product {
  item_id: string;
  revenue: number;
  units: number;
  rank: number;
}

export default function TopProducts() {
  const { category, stateLocation, dateFrom, dateTo } = useStore();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["topProducts", category, stateLocation, dateFrom, dateTo],
    queryFn: () => fetchTopProducts({
      category,
      state: stateLocation,
      date_from: dateFrom,
      date_to: dateTo,
      metric: "revenue",
      limit: "10"
    }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 bg-[#1D2432] rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error || !response) {
    return <div className="text-red-400 text-center py-4">Error loading top products</div>;
  }

  const products: Product[] = response.data || [];

  // Calculate dynamic concentration insights
  let trendInsight = "Top products loading...";
  let concernInsight = "Awaiting concentration metrics.";

  if (products.length > 0) {
    const top1 = products[0];
    const totalSelectedRevenue = products.reduce((acc, curr) => acc + curr.revenue, 0);
    const top3Revenue = products.slice(0, 3).reduce((acc, curr) => acc + curr.revenue, 0);
    const top3Share = totalSelectedRevenue > 0 ? (top3Revenue / totalSelectedRevenue) * 100 : 0.0;
    
    trendInsight = `Item ${top1.item_id} is the lead SKU, contributing $${top1.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${((top1.revenue / totalSelectedRevenue) * 100 || 0).toFixed(1)}% of top 10 revenue).`;
    concernInsight = `High product concentration: The top 3 SKUs make up ${top3Share.toFixed(1)}% of all top-10 revenue, presenting inventory supply-chain risks.`;
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-8 overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs uppercase bg-[#1D2432] text-gray-400">
            <tr>
              <th className="px-4 py-2 rounded-l-lg">Rank</th>
              <th className="px-4 py-2">Item ID</th>
              <th className="px-4 py-2 text-right">Units</th>
              <th className="px-4 py-2 text-right rounded-r-lg">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252B38]">
            {products.map((prod) => (
              <tr key={prod.item_id} className="hover:bg-[#1E2638] transition-colors">
                <td className="px-4 py-3 font-semibold text-[#2DD4BF]">#{prod.rank}</td>
                <td className="px-4 py-3 font-mono text-xs">{prod.item_id}</td>
                <td className="px-4 py-3 text-right">{prod.units.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-medium text-white">
                  ${prod.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  No items found for current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="col-span-12 xl:col-span-4 flex flex-col justify-center space-y-4 bg-[#1E2432]/40 p-4 rounded-xl border border-[#252B38] h-fit">
        <div>
          <h4 className="text-[10px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-1">
            📦 SKU Leaderboard
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{trendInsight}</p>
        </div>
        <div className="border-t border-[#252B38] pt-3">
          <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">
            ⚠️ Concentration Risk
          </h4>
          <p className="text-xs text-gray-300 leading-relaxed">{concernInsight}</p>
        </div>
      </div>
    </div>
  );
}
