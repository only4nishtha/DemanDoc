import { useStore } from "../../store/useStore";
import type { View } from "../../store/useStore";

export default function Sidebar() {
  const { activeView, setActiveView } = useStore();

  const menuItems: { name: View; icon: string }[] = [
    { name: "Overview", icon: "📊" },
    { name: "Demand Forecast", icon: "📈" },
    { name: "Promotions", icon: "🏷️" },
    { name: "Root Cause", icon: "🔍" },
    { name: "Scenario Simulator", icon: "⚙️" },
    { name: "Geographic", icon: "🌍" },
  ];

  const handleNavigate = (view: View) => {
    setActiveView(view);
    // Smooth scroll to the corresponding header/panel
    const targetElement = document.getElementById(`panel-${view.toLowerCase().replace(" ", "-")}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-64 bg-[#151922] border-r border-[#252B38] flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-[#252B38] flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2DD4BF] to-[#06B6D4] p-2 flex items-center justify-center shadow-lg shadow-[#2DD4BF]/10">
          <svg
            className="w-full h-full text-black"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
          </svg>
        </div>
        <div>
          <h1 className="font-extrabold text-white tracking-tight text-lg leading-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            DemandDoc
          </h1>
          <p className="text-[10px] text-[#2DD4BF] font-semibold tracking-wider uppercase">
            Retail Decision Engine
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeView === item.name;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigate(item.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#1E2638] text-[#2DD4BF] border border-[#2DD4BF]/20"
                  : "text-gray-400 hover:bg-[#1A202C] hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#252B38] text-[10px] text-gray-500 space-y-1">
        <p>Database: DuckDB Warehouse</p>
        <p>Engine: Prophet Forecasting</p>
        <p>Status: Connected</p>
      </div>
    </div>
  );
}
