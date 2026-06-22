import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "../../store/useStore";
import ReactECharts from "echarts-for-react";

interface ColumnSummary {
  column_name: string;
  column_type: string;
  null_percentage?: string;
  min?: string;
  max?: string;
  approx_unique?: number;
  mean?: number;
  std?: number;
  [key: string]: any;
}

interface CorrelationItem {
  id: string;
  filename: string;
  joinKey: string;
  col: string;
  columns: { column_name: string; column_type: string }[];
}

export default function CustomAnalysis() {
  const { uploadedFilename, uploadedFilenames, setActiveView } = useStore();
  const [activeTab, setActiveTab] = useState<"analytics" | "schema">("analytics");
  const [analysisMode, setAnalysisMode] = useState<"single" | "correlation">("single");

  // Filter States (Single File Mode)
  const [category, setCategory] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("monthly");

  // Correlation Items List (Multi-File Mode)
  const [corrItems, setCorrItems] = useState<CorrelationItem[]>([]);

  const API = "http://localhost:8000/api";

  // Previews for Single Mode
  const { data: previewData, isLoading: isPreviewLoading, error: previewError } = useQuery({
    queryKey: ["datasetPreview", uploadedFilename],
    queryFn: async () => {
      if (!uploadedFilename) return null;
      const res = await fetch(`${API}/dataset-preview?filename=${encodeURIComponent(uploadedFilename)}`);
      if (!res.ok) throw new Error("Failed to load dataset preview");
      return res.json();
    },
    enabled: !!uploadedFilename && analysisMode === "single",
  });

  // 2. Fetch Custom Filters & Limits (Single Mode)
  const { data: filtersData } = useQuery({
    queryKey: ["customFilters", uploadedFilename],
    queryFn: async () => {
      if (!uploadedFilename) return null;
      const res = await fetch(`${API}/custom/filters?filename=${encodeURIComponent(uploadedFilename)}`);
      if (!res.ok) throw new Error("Failed to load custom filters");
      return res.json();
    },
    enabled: !!uploadedFilename && analysisMode === "single",
  });

  // Initialize date range once limits are loaded
  useEffect(() => {
    if (filtersData) {
      if (filtersData.min_date) setDateFrom(filtersData.min_date);
      if (filtersData.max_date) setDateTo(filtersData.max_date);
    }
  }, [filtersData]);

  // Dynamic Analytics Queries (Single Mode)
  const queryParams = new URLSearchParams({
    filename: uploadedFilename || "",
    category,
    state: stateFilter,
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
  });

  const { data: customKpis } = useQuery({
    queryKey: ["customKpis", uploadedFilename, category, stateFilter, dateFrom, dateTo],
    queryFn: () => fetch(`${API}/custom/kpis?${queryParams}`).then((r) => r.json()),
    enabled: !!uploadedFilename && !!filtersData && analysisMode === "single",
  });

  const { data: customTrend, isLoading: isTrendLoading } = useQuery({
    queryKey: ["customTrend", uploadedFilename, category, stateFilter, dateFrom, dateTo, granularity],
    queryFn: () => fetch(`${API}/custom/trend?${queryParams}&granularity=${granularity}`).then((r) => r.json()),
    enabled: !!uploadedFilename && !!filtersData && analysisMode === "single",
  });

  const { data: customCategories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["customCategories", uploadedFilename, stateFilter, dateFrom, dateTo],
    queryFn: () => fetch(`${API}/custom/categories?filename=${encodeURIComponent(uploadedFilename || "")}&state=${stateFilter}&date_from=${dateFrom}&date_to=${dateTo}`).then((r) => r.json()),
    enabled: !!uploadedFilename && !!filtersData && analysisMode === "single",
  });

  const { data: customTopProducts, isLoading: isTopProductsLoading } = useQuery({
    queryKey: ["customTopProducts", uploadedFilename, category, stateFilter, dateFrom, dateTo],
    queryFn: () => fetch(`${API}/custom/top-products?${queryParams}&limit=10`).then((r) => r.json()),
    enabled: !!uploadedFilename && !!filtersData && analysisMode === "single",
  });

  const { data: customGeo, isLoading: isGeoLoading } = useQuery({
    queryKey: ["customGeo", uploadedFilename, category, dateFrom, dateTo],
    queryFn: () => fetch(`${API}/custom/geo?filename=${encodeURIComponent(uploadedFilename || "")}&category=${category}&date_from=${dateFrom}&date_to=${dateTo}`).then((r) => r.json()),
    enabled: !!uploadedFilename && !!filtersData && analysisMode === "single",
  });

  // Populate correlation setup with initial two files if empty
  useEffect(() => {
    if (analysisMode === "correlation" && corrItems.length === 0 && uploadedFilenames.length >= 2) {
      const initializeItems = async () => {
        const item1 = await createCorrItem(uploadedFilenames[0]);
        const item2 = await createCorrItem(uploadedFilenames[1]);
        setCorrItems([item1, item2]);
      };
      initializeItems();
    }
  }, [analysisMode, uploadedFilenames]);

  const createCorrItem = async (filename: string): Promise<CorrelationItem> => {
    const res = await fetch(`${API}/dataset-preview?filename=${encodeURIComponent(filename)}`);
    const preview = res.ok ? await res.json() : { columns_summary: [] };
    const cols = preview.columns_summary || [];
    const colNames = cols.map((c: any) => c.column_name);

    const dateCol = colNames.find((c: string) => c.toLowerCase().includes("date") || c.toLowerCase().includes("time"));
    const key = dateCol || colNames.find((c: string) => c.toLowerCase().includes("id") || c.toLowerCase().includes("sku")) || colNames[0] || "";

    const numericTypes = ["INT", "FLOAT", "DOUBLE", "DECIMAL"];
    const numCols = cols
      .filter((c: any) => {
        const t = String(c.column_type).toUpperCase();
        return numericTypes.some(nt => t.includes(nt));
      })
      .map((c: any) => c.column_name);
    const col = numCols[0] || colNames[0] || "";

    return {
      id: Math.random().toString(36).substr(2, 9),
      filename,
      joinKey: key,
      col,
      columns: cols
    };
  };

  const handleAddFile = async () => {
    const nextFile = uploadedFilenames.find(name => !corrItems.some(item => item.filename === name)) || uploadedFilenames[0];
    if (nextFile) {
      const newItem = await createCorrItem(nextFile);
      setCorrItems([...corrItems, newItem]);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<CorrelationItem>) => {
    if (updates.filename) {
      // Re-fetch columns for new file
      const freshItem = await createCorrItem(updates.filename);
      setCorrItems(corrItems.map(item => item.id === id ? { ...freshItem, id } : item));
    } else {
      setCorrItems(corrItems.map(item => item.id === id ? { ...item, ...updates } : item));
    }
  };

  const handleRemoveItem = (id: string) => {
    setCorrItems(corrItems.filter(item => item.id !== id));
  };

  // Correlation Query (Multi-File Mode)
  const isCorrelationEnabled = corrItems.length >= 2 && corrItems.every(item => item.filename && item.joinKey && item.col);
  
  const correlationParams = new URLSearchParams({
    files: corrItems.map(item => item.filename).join(","),
    join_keys: corrItems.map(item => item.joinKey).join(","),
    columns: corrItems.map(item => item.col).join(","),
  });

  const { data: correlationData, isLoading: isCorrelationLoading } = useQuery({
    queryKey: ["correlation", corrItems.map(item => `${item.filename}:${item.joinKey}:${item.col}`).join("|")],
    queryFn: () => fetch(`${API}/custom/correlate?${correlationParams}`).then((r) => r.json()),
    enabled: isCorrelationEnabled && analysisMode === "correlation",
  });

  const getCorrelationStrength = (val: number) => {
    const absVal = Math.abs(val);
    let direction = val > 0 ? "Positive" : "Negative";
    if (val === 0) return { label: "No Correlation", color: "text-gray-400" };
    if (absVal >= 0.7) {
      return { label: `Strong ${direction}`, color: val > 0 ? "text-emerald-400" : "text-rose-400" };
    } else if (absVal >= 0.4) {
      return { label: `Moderate ${direction}`, color: "text-amber-400" };
    } else {
      return { label: `Weak ${direction}`, color: "text-gray-400" };
    }
  };

  // Multi-line chart options
  const multiLineOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1C2230",
      borderColor: "#252B38",
      textStyle: { color: "#fff" }
    },
    legend: {
      data: corrItems.map(item => `${item.filename} (${item.col})`),
      textStyle: { color: "#9CA3AF" },
      top: 0
    },
    grid: { left: "3%", right: "3%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: correlationData?.series?.map((s: any) => s.join_key) || [],
      axisLabel: { color: "#9CA3AF", fontSize: 10 },
      axisLine: { lineStyle: { color: "#252B38" } }
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#9CA3AF", fontSize: 10 },
      axisLine: { lineStyle: { color: "#252B38" } },
      splitLine: { lineStyle: { color: "#252B38", type: "dashed" } }
    },
    series: corrItems.map((item, idx) => ({
      name: `${item.filename} (${item.col})`,
      type: "line",
      data: correlationData?.series?.map((s: any) => s[`val${idx}`]) || [],
      lineStyle: { width: 2 },
      smooth: true
    }))
  };

  // Rendering loading states
  if (analysisMode === "single" && isPreviewLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#151922] p-6 rounded-xl border border-[#252B38] h-28"></div>
          ))}
        </div>
        <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] h-64"></div>
      </div>
    );
  }

  // Single file fallback
  if (analysisMode === "single" && (!uploadedFilename || previewError || !previewData)) {
    return (
      <div className="bg-[#151922] p-8 rounded-xl border border-[#252B38] text-center text-gray-400 space-y-4">
        <p>No dataset active. Please select or upload a CSV file from the sidebar.</p>
        <button
          onClick={() => setActiveView("Overview")}
          className="text-xs font-semibold px-4 py-2 bg-[#1E2638] text-white rounded-lg hover:bg-gray-800 transition-all"
        >
          Return to Overview
        </button>
      </div>
    );
  }

  const columns: ColumnSummary[] = previewData?.columns_summary || [];
  const previewRows = previewData?.preview_rows || [];
  const columnHeaders = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];

  // Data Quality Metrics
  const parsedNulls = columns.map((col) => {
    const raw = col.null_percentage ?? "0%";
    return parseFloat(String(raw).replace("%", "")) || 0;
  });
  const avgNullPct = parsedNulls.length > 0 ? parsedNulls.reduce((a, b) => a + b, 0) / parsedNulls.length : 0;
  const qualityScore = Math.round(100 - avgNullPct);
  const qualityColor = qualityScore >= 90 ? "#22c55e" : qualityScore >= 70 ? "#f59e0b" : "#ef4444";
  const qualityLabel = qualityScore >= 90 ? "Excellent" : qualityScore >= 70 ? "Acceptable" : "Poor";

  // Mapped columns list
  const mappedCols = filtersData?.mapped_columns || {};

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const trendData = customTrend?.data || [];
  const categoryData = customCategories?.categories || [];
  const productsData = customTopProducts?.data || [];
  const geoData = customGeo?.geo || [];

  return (
    <div className="space-y-6" id="panel-custom-analysis">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Custom Dataset Analysis</h2>
          <p className="text-xs text-gray-400 mt-1">
            Analyze your files individually or join and correlate them in multi-file mode.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {uploadedFilename && (
            <a
              href={`${API}/download-dataset?filename=${encodeURIComponent(uploadedFilename)}`}
              download
              className="text-xs font-semibold px-3 py-1.5 bg-[#1E2638] text-white border border-[#252B38] rounded-lg hover:bg-gray-800 transition-all flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download CSV
            </a>
          )}
          <button
            onClick={() => window.print()}
            className="text-xs font-semibold px-3 py-1.5 bg-[#1E2638] text-[#2DD4BF] border border-[#2DD4BF]/20 rounded-lg hover:bg-[#2DD4BF] hover:text-black transition-all"
          >
            Print Analysis
          </button>
          <button
            onClick={() => setActiveView("Overview")}
            className="text-xs font-semibold px-3 py-1.5 bg-[#1E2638] text-gray-400 border border-[#252B38] rounded-lg hover:bg-gray-800 transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* Mode Toggle Header */}
      <div className="flex bg-[#151922] p-1 rounded-lg border border-[#252B38] self-start max-w-md">
        <button
          onClick={() => setAnalysisMode("single")}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            analysisMode === "single"
              ? "bg-[#1E2638] text-[#2DD4BF] shadow-sm"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Single File Custom Analysis
        </button>
        <button
          onClick={() => setAnalysisMode("correlation")}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
            analysisMode === "correlation"
              ? "bg-[#1E2638] text-[#2DD4BF] shadow-sm"
              : "text-gray-400 hover:text-white"
          }`}
          disabled={uploadedFilenames.length < 2}
          title={uploadedFilenames.length < 2 ? "Upload at least 2 files to use Correlation Analysis" : ""}
        >
          Correlated Multi-File Analysis {uploadedFilenames.length < 2 && " (Upload 2+ Files)"}
        </button>
      </div>

      {/* RENDER MODE: Single File Analysis */}
      {analysisMode === "single" && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-[#252B38]">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === "analytics"
                  ? "border-[#2DD4BF] text-[#2DD4BF]"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Analytics Dashboard
            </button>
            <button
              onClick={() => setActiveTab("schema")}
              className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === "schema"
                  ? "border-[#2DD4BF] text-[#2DD4BF]"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Schema & Data Profile
            </button>
          </div>

          {activeTab === "analytics" ? (
            <div className="space-y-6">
              {/* Filters Bar */}
              <div className="bg-[#151922] p-4 rounded-xl border border-[#252B38] flex flex-wrap gap-4 items-center">
                {/* Category Filter */}
                {filtersData?.categories && filtersData.categories.length > 1 && (
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-[#1D2432] border border-[#374151] rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-[#2DD4BF]"
                    >
                      {filtersData.categories.map((c: string) => (
                        <option key={c} value={c}>
                          {c === "ALL" ? "All Categories" : c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* State Filter */}
                {filtersData?.states && filtersData.states.length > 1 && (
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Location/State</label>
                    <select
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value)}
                      className="bg-[#1D2432] border border-[#374151] rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-[#2DD4BF]"
                    >
                      {filtersData.states.map((s: string) => (
                        <option key={s} value={s}>
                          {s === "ALL" ? "All States/Stores" : s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Inputs */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      min={filtersData?.min_date}
                      max={filtersData?.max_date}
                      className="bg-[#1D2432] border border-[#374151] rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:border-[#2DD4BF]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      min={filtersData?.min_date}
                      max={filtersData?.max_date}
                      className="bg-[#1D2432] border border-[#374151] rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:border-[#2DD4BF]"
                    />
                  </div>
                </div>

                {/* Granularity */}
                <div className="flex flex-col">
                  <label className="text-[10px] text-gray-500 uppercase font-semibold mb-0.5">Granularity</label>
                  <div className="flex bg-[#1C2230] p-0.5 rounded border border-[#374151]">
                    {(["daily", "weekly", "monthly"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-all ${
                          granularity === g ? "bg-[#2DD4BF] text-black" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                  <span className="text-xs text-gray-400 block">Total Revenue</span>
                  <span className="text-2xl font-black text-white block mt-1">
                    {customKpis?.total_revenue !== undefined
                      ? `$${customKpis.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "$0.00"}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-2 block font-medium">Mapped column: {mappedCols.revenue || "None"}</span>
                </div>

                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                  <span className="text-xs text-gray-400 block">Units Sold</span>
                  <span className="text-2xl font-black text-white block mt-1">
                    {customKpis?.total_units_sold !== undefined ? customKpis.total_units_sold.toLocaleString() : "0"}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-2 block font-medium">Mapped column: {mappedCols.units || "None"}</span>
                </div>

                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                  <span className="text-xs text-gray-400 block">Average Order Value</span>
                  <span className="text-2xl font-black text-white block mt-1">
                    {customKpis?.total_units_sold && customKpis?.total_revenue
                      ? `$${(customKpis.total_revenue / customKpis.total_units_sold).toFixed(2)}`
                      : "$0.00"}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-2 block font-medium">Calculated ratio</span>
                </div>

                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38]">
                  <span className="text-xs text-gray-400 block">Active Categories</span>
                  <span className="text-2xl font-black text-white block mt-1">
                    {filtersData?.categories ? filtersData.categories.length - 1 : 0}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-2 block font-medium">Unique groupings</span>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend line */}
                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-white">Trend Analysis</h3>
                  <div className="h-64">
                    {isTrendLoading ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-xs">Loading trend...</div>
                    ) : trendData.length > 0 ? (
                      <ReactECharts
                        option={{
                          backgroundColor: "transparent",
                          tooltip: { trigger: "axis", backgroundColor: "#1C2230", borderColor: "#252B38", textStyle: { color: "#fff" } },
                          xAxis: {
                            type: "category",
                            data: trendData.map((d: any) => d.date),
                            axisLabel: { color: "#9CA3AF", fontSize: 10 },
                            axisLine: { lineStyle: { color: "#252B38" } },
                          },
                          yAxis: {
                            type: "value",
                            axisLabel: { color: "#9CA3AF", fontSize: 10 },
                            splitLine: { lineStyle: { color: "#252B38", type: "dashed" } },
                          },
                          series: [
                            {
                              data: trendData.map((d: any) => d.value),
                              type: "line",
                              smooth: true,
                              itemStyle: { color: "#2DD4BF" },
                              lineStyle: { width: 3 },
                            },
                          ],
                        }}
                        style={{ height: "100%" }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 text-xs">No trend data available</div>
                    )}
                  </div>
                </div>

                {/* Categorical share */}
                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
                  <h3 className="text-sm font-bold text-white">Category Distribution</h3>
                  <div className="h-64">
                    {isCategoriesLoading ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-xs">Loading categories...</div>
                    ) : categoryData.length > 0 ? (
                      <ReactECharts
                        option={{
                          backgroundColor: "transparent",
                          tooltip: { trigger: "item", backgroundColor: "#1C2230", borderColor: "#252B38", textStyle: { color: "#fff" } },
                          series: [
                            {
                              type: "pie",
                              radius: ["40%", "70%"],
                              avoidLabelOverlap: false,
                              itemStyle: { borderRadius: 6, borderColor: "#151922", borderWidth: 2 },
                              label: { show: false },
                              data: categoryData.map((c: any) => ({ name: c.name, value: c.value })),
                            },
                          ],
                        }}
                        style={{ height: "100%" }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 text-xs">No category data available</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Products & Geo grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Products Table */}
                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
                  <h3 className="text-sm font-bold text-white">Top 10 Products</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#252B38] text-gray-400 font-semibold bg-[#1C2230]/50">
                          <th className="py-2.5 px-4">Product ID / SKU</th>
                          <th className="py-2.5 px-4 text-right">Revenue</th>
                          <th className="py-2.5 px-4 text-right">Units</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#252B38]/50 text-gray-300">
                        {isTopProductsLoading ? (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500">Loading products...</td>
                          </tr>
                        ) : productsData.length > 0 ? (
                          productsData.map((p: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[#1E2638]/20 transition-colors">
                              <td className="py-2.5 px-4 font-mono text-[#2DD4BF]">{p.product}</td>
                              <td className="py-2.5 px-4 text-right">${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-4 text-right">{p.units.toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500">No product columns mapped</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Geo Table */}
                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
                  <h3 className="text-sm font-bold text-white">Geographic Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#252B38] text-gray-400 font-semibold bg-[#1C2230]/50">
                          <th className="py-2.5 px-4">State / Location</th>
                          <th className="py-2.5 px-4 text-right">Revenue</th>
                          <th className="py-2.5 px-4 text-right">Units</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#252B38]/50 text-gray-300">
                        {isGeoLoading ? (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500">Loading geography...</td>
                          </tr>
                        ) : geoData.length > 0 ? (
                          geoData.map((g: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[#1E2638]/20 transition-colors">
                              <td className="py-2.5 px-4 font-mono text-[#2DD4BF]">{g.state}</td>
                              <td className="py-2.5 px-4 text-right">${g.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-4 text-right">{g.units.toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500">No geographic columns mapped</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dataset Profile Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-2">
                  <span className="text-xs text-gray-400">File Metadata</span>
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-white block truncate">{previewData.filename}</span>
                    <span className="text-xs text-gray-500 block">Size: {formatBytes(previewData.file_size_bytes)}</span>
                    <span className="text-xs text-gray-500 block">Total Rows: {previewData.row_count?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-2">
                  <span className="text-xs text-gray-400">Overall Quality Score</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black" style={{ color: qualityColor }}>
                      {qualityScore}%
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: qualityColor }}>
                      {qualityLabel}
                    </span>
                  </div>
                  <div className="w-full bg-[#252B38] rounded-full h-1.5 mt-2">
                    <div className="h-full rounded-full" style={{ width: `${qualityScore}%`, backgroundColor: qualityColor }} />
                  </div>
                </div>

                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-2">
                  <span className="text-xs text-gray-400">Column Mapping Status</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 mt-1">
                    <div>Date: <span className={mappedCols.date ? "text-emerald-400" : "text-gray-600"}>{mappedCols.date ? "✓" : "✗"}</span></div>
                    <div>Revenue: <span className={mappedCols.revenue ? "text-emerald-400" : "text-gray-600"}>{mappedCols.revenue ? "✓" : "✗"}</span></div>
                    <div>Units: <span className={mappedCols.units ? "text-emerald-400" : "text-gray-600"}>{mappedCols.units ? "✓" : "✗"}</span></div>
                    <div>Category: <span className={mappedCols.category ? "text-emerald-400" : "text-gray-600"}>{mappedCols.category ? "✓" : "✗"}</span></div>
                  </div>
                </div>
              </div>

              {/* Schema Profile */}
              <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
                <h3 className="text-sm font-bold text-white">Data Profiling & Schema Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#252B38] text-gray-400 font-semibold bg-[#1C2230]/50">
                        <th className="py-2.5 px-4">Column Name</th>
                        <th className="py-2.5 px-4">Data Type</th>
                        <th className="py-2.5 px-4">Nulls %</th>
                        <th className="py-2.5 px-4">Unique Values</th>
                        <th className="py-2.5 px-4">Min Value</th>
                        <th className="py-2.5 px-4">Max Value</th>
                        <th className="py-2.5 px-4">Quality Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252B38]/50 text-gray-300">
                      {columns.map((col, idx) => {
                        const nullPct = parseFloat(String(col.null_percentage ?? "0").replace("%", "")) || 0;
                        const qColor = nullPct === 0 ? "#22c55e" : nullPct < 5 ? "#f59e0b" : "#ef4444";
                        return (
                          <tr key={idx} className="hover:bg-[#1E2638]/20 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-[#2DD4BF]">{col.column_name}</td>
                            <td className="py-2.5 px-4 text-gray-400">{col.column_type}</td>
                            <td className="py-2.5 px-4">
                              <span style={{ color: qColor }}>{col.null_percentage ?? "0%"}</span>
                            </td>
                            <td className="py-2.5 px-4">
                              {col.approx_unique !== undefined ? col.approx_unique.toLocaleString() : "N/A"}
                            </td>
                            <td className="py-2.5 px-4 truncate max-w-[120px] font-mono text-gray-400">
                              {col.min !== undefined ? String(col.min) : "N/A"}
                            </td>
                            <td className="py-2.5 px-4 truncate max-w-[120px] font-mono text-gray-400">
                              {col.max !== undefined ? String(col.max) : "N/A"}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 bg-[#252B38] rounded-full h-1 overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.max(0, 100 - nullPct)}%`, backgroundColor: qColor }}
                                  />
                                </div>
                                <span className="text-[10px]" style={{ color: qColor }}>
                                  {Math.round(100 - nullPct)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw Data Preview */}
              <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
                <h3 className="text-sm font-bold text-white">First 10 Rows Preview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#252B38] text-gray-400 font-semibold bg-[#1C2230]/50">
                        {columnHeaders.map((header: string) => (
                          <th key={header} className="py-2.5 px-4 font-mono">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252B38]/50 text-gray-300">
                      {previewRows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#1E2638]/20 transition-colors">
                          {columnHeaders.map((header: string) => (
                            <td key={header} className="py-2.5 px-4 font-mono text-xs truncate max-w-[200px]">
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER MODE: Correlated Multi-File Analysis */}
      {analysisMode === "correlation" && (
        <div className="space-y-6">
          {/* Dynamic Configuration Rows */}
          <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Correlation Datasets Config</h3>
              <button
                onClick={handleAddFile}
                className="text-xs font-semibold px-2.5 py-1 bg-[#2DD4BF] text-black rounded hover:bg-[#25B4A3] transition-all"
              >
                + Add Dataset
              </button>
            </div>

            <div className="space-y-4 divide-y divide-[#252B38]/50">
              {corrItems.map((item, idx) => (
                <div key={item.id} className="pt-4 first:pt-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Dataset {idx + 1}</label>
                    <select
                      value={item.filename}
                      onChange={(e) => handleUpdateItem(item.id, { filename: e.target.value })}
                      className="bg-[#1D2432] border border-[#374151] rounded px-3 py-1.5 text-white text-xs focus:outline-none"
                    >
                      {uploadedFilenames.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Join Key</label>
                    <select
                      value={item.joinKey}
                      onChange={(e) => handleUpdateItem(item.id, { joinKey: e.target.value })}
                      className="bg-[#1D2432] border border-[#374151] rounded px-3 py-1.5 text-white text-xs focus:outline-none"
                    >
                      {item.columns.map((c: any) => (
                        <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Metric Column</label>
                    <select
                      value={item.col}
                      onChange={(e) => handleUpdateItem(item.id, { col: e.target.value })}
                      className="bg-[#1D2432] border border-[#374151] rounded px-3 py-1.5 text-white text-xs focus:outline-none"
                    >
                      {item.columns.map((c: any) => (
                        <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end pb-1">
                    {corrItems.length > 2 && (
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-xs font-semibold px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500 hover:text-white transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance & Charts */}
          {isCorrelationLoading ? (
            <div className="bg-[#151922] p-8 rounded-xl border border-[#252B38] text-center text-gray-500 text-xs animate-pulse">
              Computing correlation analysis across datasets...
            </div>
          ) : correlationData ? (
            <div className="space-y-6">
              {/* Overlap Details Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Aligned Records (Multi-Join)</span>
                    <span className="text-3xl font-black text-white block mt-1">
                      {correlationData.row_count?.toLocaleString()} rows
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                    Matched row count represents records successfully aligned across all {corrItems.length} tables on their respective join keys.
                  </p>
                </div>

                <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Dataset Config Scope</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {corrItems.map((item, idx) => (
                        <div key={item.id} className="text-xs bg-[#1C2230] border border-[#252B38] rounded px-2.5 py-1 text-gray-300 font-mono">
                          Dataset {idx + 1}: {item.filename} ({item.col})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Line Trend Chart */}
              <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
                <h3 className="text-sm font-bold text-white">Comparative Trend Analysis</h3>
                <div className="h-80">
                  {correlationData.series?.length > 0 ? (
                    <ReactECharts option={multiLineOption} style={{ height: "100%" }} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-xs">No aligned series data matched</div>
                  )}
                </div>
              </div>

              {/* Correlation Matrix Table */}
              <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
                <h3 className="text-sm font-bold text-white">All Metric Correlations Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#252B38] text-gray-400 font-semibold bg-[#1C2230]/50">
                        <th className="py-2.5 px-4">Dataset 1</th>
                        <th className="py-2.5 px-4">Column 1</th>
                        <th className="py-2.5 px-4">Dataset 2</th>
                        <th className="py-2.5 px-4">Column 2</th>
                        <th className="py-2.5 px-4 text-center">Pearson Coefficient</th>
                        <th className="py-2.5 px-4">Strength</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252B38]/50 text-gray-300">
                      {correlationData.matrix?.map((row: any, idx: number) => {
                        const strengthInfo = getCorrelationStrength(row.coefficient);
                        return (
                          <tr key={idx} className="hover:bg-[#1E2638]/20 transition-colors">
                            <td className="py-2.5 px-4 truncate max-w-[120px] font-mono text-gray-400">{row.file1}</td>
                            <td className="py-2.5 px-4 font-mono text-[#2DD4BF]">{row.col1}</td>
                            <td className="py-2.5 px-4 truncate max-w-[120px] font-mono text-gray-400">{row.file2}</td>
                            <td className="py-2.5 px-4 font-mono text-[#F59E0B]">{row.col2}</td>
                            <td className="py-2.5 px-4 text-center font-bold font-mono">
                              {row.coefficient.toFixed(5)}
                            </td>
                            <td className={`py-2.5 px-4 font-semibold ${strengthInfo.color}`}>
                              {strengthInfo.label}
                            </td>
                          </tr>
                        );
                      })}
                      {(!correlationData.matrix || correlationData.matrix.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-gray-500">
                            No numeric column pairs found to correlate.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Merged Data Preview */}
              <div className="bg-[#151922] p-6 rounded-xl border border-[#252B38] space-y-4">
                <h3 className="text-sm font-bold text-white">Joined Dataset Preview (First 10 Matches)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#252B38] text-gray-400 font-semibold bg-[#1C2230]/50">
                        <th className="py-2.5 px-4 font-mono text-[#2DD4BF]">join_key</th>
                        {correlationData.preview_columns?.filter((c: string) => c !== "join_key").map((header: string) => (
                          <th key={header} className="py-2.5 px-4 font-mono">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252B38]/50 text-gray-300">
                      {correlationData.preview_rows?.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#1E2638]/20 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-xs text-[#2DD4BF] font-semibold">{row.join_key}</td>
                          {correlationData.preview_columns?.filter((c: string) => c !== "join_key").map((header: string) => (
                            <td key={header} className="py-2.5 px-4 font-mono text-xs truncate max-w-[200px]">
                              {row[header]}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {(!correlationData.preview_rows || correlationData.preview_rows.length === 0) && (
                        <tr>
                          <td colSpan={correlationData.preview_columns?.length || 1} className="py-4 text-center text-gray-500">
                            No row preview available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#151922] p-8 rounded-xl border border-[#252B38] text-center text-gray-500 text-xs">
              Configure selectors above to calculate correlations.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
