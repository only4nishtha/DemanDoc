import { useState, useRef, useEffect } from "react";
import { useStore } from "../../store/useStore";
import type { View } from "../../store/useStore";

export default function Sidebar() {
  const { 
    activeView, 
    setActiveView, 
    uploadedFilename, 
    setUploadedFilename, 
    uploadedFilenames, 
    setUploadedFilenames 
  } = useStore();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing datasets on mount
  useEffect(() => {
    fetch("http://localhost:8000/api/custom/list-files")
      .then((r) => r.json())
      .then((data) => {
        if (data.files) {
          setUploadedFilenames(data.files);
          if (data.files.length > 0 && !uploadedFilename) {
            setUploadedFilename(data.files[0]);
          }
        }
      })
      .catch((err) => console.error("Error listing files:", err));
  }, []);

  const menuItems: { name: View; label: string }[] = [
    { name: "Overview", label: "Overview" },
    { name: "Demand Forecast", label: "Demand Forecast" },
    { name: "Promotions", label: "Promotions" },
    { name: "Root Cause", label: "Root Cause" },
    { name: "Scenario Simulator", label: "Scenario Simulator" },
    { name: "Geographic", label: "Geographic" },
  ];

  if (uploadedFilenames.length > 0) {
    menuItems.push({ name: "Custom Analysis", label: "Custom Analysis" });
  }

  const handleNavigate = (view: View) => {
    setActiveView(view);
    const targetElement = document.getElementById(`panel-${view.toLowerCase().replace(" ", "-")}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadStatus("Starting uploads...");
    setProgress(0);

    const uploadedList: string[] = [...uploadedFilenames];
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.csv')) {
        setUploadStatus(`Error: Only CSV files are supported.`);
        continue;
      }

      setUploadStatus(`Uploading ${file.name} (${i + 1}/${files.length})...`);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("http://localhost:8000/api/upload-dataset", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          successCount++;
          if (!uploadedList.includes(file.name)) {
            uploadedList.push(file.name);
          }
        }
      } catch (err) {
        console.error(`Upload error for ${file.name}`, err);
      }

      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploadedFilenames(uploadedList);
    if (uploadedList.length > 0) {
      setUploadedFilename(uploadedList[uploadedList.length - 1]);
      setActiveView("Custom Analysis");
    }

    setUploadStatus(`Uploaded ${successCount} of ${files.length} files`);
    setUploading(false);
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

      {/* Uploaded Files List */}
      {uploadedFilenames.length > 0 && (
        <div className="px-4 py-2 border-t border-[#252B38] space-y-1.5 max-h-40 overflow-y-auto">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
            Uploaded Files
          </span>
          <div className="space-y-1">
            {uploadedFilenames.map((f) => (
              <div 
                key={f} 
                className={`flex items-center justify-between text-xs px-2 py-1 rounded border transition-colors truncate cursor-pointer ${
                  uploadedFilename === f 
                    ? "bg-[#2DD4BF]/10 text-[#2DD4BF] border-[#2DD4BF]/30" 
                    : "bg-[#1D2432]/20 text-gray-400 border-[#252B38] hover:border-gray-700"
                }`}
                onClick={() => {
                  setUploadedFilename(f);
                  setActiveView("Custom Analysis");
                }}
              >
                <span className="truncate flex-1 pr-1 font-mono text-[10px]" title={f}>
                  {f}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = uploadedFilenames.filter(name => name !== f);
                    setUploadedFilenames(updated);
                    if (uploadedFilename === f) {
                      setUploadedFilename(updated[0] || null);
                    }
                  }}
                  className="text-gray-500 hover:text-red-400 text-[11px] ml-1 px-1 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dataset Ingestion Column */}
      <div className="mt-auto p-4 border-t border-[#252B38] space-y-3">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Data Ingestion
          </h3>
          <p className="text-[10px] text-gray-500 leading-normal mb-2">
            Upload custom CSV dataset to analyze.
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
            multiple
          />
          <span className="text-xs text-gray-400 block font-medium">
            {uploading ? "Uploading..." : "Select CSV File(s)"}
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
    </div>
  );
}
