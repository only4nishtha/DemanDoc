import { useStore } from "../../store/useStore";

export default function Topbar() {
  const {
    category,
    setCategory,
    stateLocation,
    setStateLocation,
    granularity,
    setGranularity,
    dateFrom,
    dateTo,
    setDateRange
  } = useStore();

  return (
    <div className="h-20 bg-[#151922] border-b border-[#252B38] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Decision Control Room
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 font-bold uppercase tracking-wider animate-pulse">
          Live Data
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-300">
        {/* Category Selector */}
        <div className="flex flex-col">
          <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[#1D2432] border border-[#374151] rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#2DD4BF]"
          >
            <option value="ALL">All Categories</option>
            <option value="FOODS">Foods</option>
            <option value="HOBBIES">Hobbies</option>
            <option value="HOUSEHOLD">Household</option>
          </select>
        </div>

        {/* State Selector */}
        <div className="flex flex-col">
          <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">State</label>
          <select
            value={stateLocation}
            onChange={(e) => setStateLocation(e.target.value)}
            className="bg-[#1D2432] border border-[#374151] rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#2DD4BF]"
          >
            <option value="ALL">All States</option>
            <option value="CA">California (CA)</option>
            <option value="TX">Texas (TX)</option>
            <option value="WI">Wisconsin (WI)</option>
          </select>
        </div>

        {/* Granularity Selector */}
        <div className="flex flex-col">
          <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Granularity</label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as any)}
            className="bg-[#1D2432] border border-[#374151] rounded px-2.5 py-1 text-white focus:outline-none focus:border-[#2DD4BF]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>

        {/* Date From */}
        <div className="flex flex-col">
          <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">From</label>
          <input
            type="date"
            value={dateFrom}
            min="2011-01-29"
            max="2016-06-19"
            onChange={(e) => setDateRange(e.target.value, dateTo)}
            className="bg-[#1D2432] border border-[#374151] rounded px-2 py-0.5 text-white focus:outline-none focus:border-[#2DD4BF]"
          />
        </div>

        {/* Date To */}
        <div className="flex flex-col">
          <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">To</label>
          <input
            type="date"
            value={dateTo}
            min="2011-01-29"
            max="2016-06-19"
            onChange={(e) => setDateRange(dateFrom, e.target.value)}
            className="bg-[#1D2432] border border-[#374151] rounded px-2 py-0.5 text-white focus:outline-none focus:border-[#2DD4BF]"
          />
        </div>
      </div>
    </div>
  );
}
