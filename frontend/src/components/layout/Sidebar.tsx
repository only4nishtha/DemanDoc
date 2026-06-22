import { useState, useRef } from "react";
import { useStore } from "../../store/useStore";
import type { View } from "../../store/useStore";

export default function Sidebar() {
  const { activeView, setActiveView } = useStore();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const menuItems: { name: View; label: string }[] = [
    { name: "Overview", label: "Overview" },
    { name: "Demand Forecast", label: "Demand Forecast" },
    { name: "Promotions", label: "Promotions" },
    { name: "Root Cause", label: "Root Cause" },
    { name: "Scenario Simulator", label: "Scenario Simulator" },
    { name: "Geographic", label: "Geographic" },
  ];

  const handleNavigate = (view: View) => {
    setActiveView(view);
    const targetElement = document.getElementById(`panel-${view.toLowerCase().replace(" ", "-")}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setUploadStatus("Error: Only CSV files are supported.");
      return;
    }

    setUploading(true);
    setUploadStatus("Uploading dataset...");
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "http://localhost:8000/api/upload-dataset", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setUploadStatus("Successfully ingested");
          setProgress(100);
        } else {
          setUploadStatus("Upload failed");
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        setUploadStatus("Upload error occurred");
        setUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      setUploadStatus("Failed to submit dataset");
      setUploading(false);
    }
  };

  return (
    <div className="w-64 bg-[#151922] border-r border-[#252B38] flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
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

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeView === item.name;
          return (
            <button
              key={item.name}
              onClick={() => handleNavigate(item.name)}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-[#1E2638] text-[#2DD4BF] border border-[#2DD4BF]/20"
                  : "text-gray-400 hover:bg-[#1A202C] hover:text-white"
              }`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Dataset Ingestion Column */}
      <div className="mt-auto p-4 border-t border-[#252B38] space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Data Ingestion
          </h3>
          <p className="text-[10px] text-gray-500 leading-normal mb-2">
            Upload custom CSV dataset to analyze (Max size: 2.5GB).
          </p>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-[#374151] hover:border-[#2DD4BF] rounded-lg p-4 text-center cursor-pointer transition-all bg-[#1D2432]/30"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".csv"
          />
          <span className="text-xs text-gray-400 block font-medium">
            {uploading ? "Uploading..." : "Select CSV File"}
          </span>
          <span className="text-[9px] text-gray-600 block mt-1">
            Drag & drop or browse
          </span>
        </div>

        {uploadStatus && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400 truncate max-w-[120px]">{uploadStatus}</span>
              {uploading && <span className="text-[#2DD4BF] font-mono">{progress}%</span>}
            </div>
            {uploading && (
              <div className="w-full bg-[#252B38] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#2DD4BF] to-[#06B6D4] h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#252B38] text-[10px] text-gray-500 space-y-0.5">
        <p>Database: DuckDB Warehouse</p>
        <p>Engine: Prophet Forecasting</p>
      </div>
    </div>
  );
}
