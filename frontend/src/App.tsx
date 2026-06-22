import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import KpiCards from "./components/panels/KpiCards";
import RevenueTrend from "./components/panels/RevenueTrend";
import CategoryTreemap from "./components/panels/CategoryTreemap";
import TopProducts from "./components/panels/TopProducts";
import ForecastChart from "./components/panels/ForecastChart";
import PromotionAnalysis from "./components/panels/PromotionAnalysis";
import RootCause from "./components/panels/RootCause";
import ScenarioSimulator from "./components/panels/ScenarioSimulator";
import GeographicInsights from "./components/panels/GeographicInsights";
import CustomAnalysis from "./components/panels/CustomAnalysis";
import InventoryAnalysis from "./components/panels/InventoryAnalysis";
import PdfReport from "./components/PdfReport";
import { useStore } from "./store/useStore";

const queryClient = new QueryClient();

function AppContent() {
  const { activeView, isPrinting, setIsPrinting } = useStore();

  return (
    <div className="flex h-screen bg-[#0B0E14] text-white overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth pb-20">
          
          {activeView === "Custom Analysis" ? (
            <CustomAnalysis />
          ) : (
            <>
              {/* Overview Section */}
              <div id="panel-overview" className="scroll-mt-6 space-y-6">
                <h2 className="text-xl font-bold text-[#2DD4BF] border-b border-[#252B38] pb-2">Overview</h2>
                
                <KpiCards />
                
                <div className="grid grid-cols-12 gap-6">
                  {/* Main Trend */}
                  <div className="col-span-12 lg:col-span-8 bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                    <h3 className="text-lg font-semibold mb-4 text-[#2DD4BF]">Revenue Trend</h3>
                    <RevenueTrend />
                  </div>
                  
                  {/* Category Mix */}
                  <div className="col-span-12 lg:col-span-4 bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                    <h3 className="text-lg font-semibold mb-4 text-[#2DD4BF]">Category Mix</h3>
                    <CategoryTreemap />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-6">
                  {/* Top Products */}
                  <div className="col-span-12 lg:col-span-6 bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                    <h3 className="text-lg font-semibold mb-4 text-[#2DD4BF]">Top Products</h3>
                    <TopProducts />
                  </div>
                  
                  {/* Geographic Insights */}
                  <div id="panel-geographic" className="col-span-12 lg:col-span-6 bg-[#151922] p-6 rounded-xl border border-[#252B38] scroll-mt-6">
                    <h3 className="text-lg font-semibold mb-4 text-[#2DD4BF]">Geographic Insights</h3>
                    <GeographicInsights />
                  </div>
                </div>
              </div>

              {/* Forecast Section */}
              <div id="panel-demand-forecast" className="scroll-mt-6 bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-6">
                <h2 className="text-xl font-bold text-[#F59E0B] mb-4">AI Demand Forecast</h2>
                <ForecastChart />
                <InventoryAnalysis />
              </div>

              {/* Promotions Section */}
              <div id="panel-promotions" className="scroll-mt-6 bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                <h2 className="text-xl font-bold text-[#2DD4BF] mb-4">Promotion Impact</h2>
                <PromotionAnalysis />
              </div>

              {/* Root Cause Section */}
              <div id="panel-root-cause" className="scroll-mt-6 bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                <h2 className="text-xl font-bold text-[#EF4444] mb-4">Anomaly Root Cause</h2>
                <RootCause />
              </div>

              {/* Scenario Simulator Section */}
              <div id="panel-scenario-simulator" className="scroll-mt-6 bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                <h2 className="text-xl font-bold text-[#F59E0B] mb-4">Pricing & Demand Simulator</h2>
                <ScenarioSimulator />
              </div>
            </>
          )}

        </div>
      </div>
      <PdfReport
        isPrinting={isPrinting}
        onPrintComplete={() => setIsPrinting(false)}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
