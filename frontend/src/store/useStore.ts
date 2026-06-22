import { create } from 'zustand';

export type Granularity = 'daily' | 'weekly' | 'monthly' | 'annual';
export type View = 'Overview' | 'Demand Forecast' | 'Promotions' | 'Root Cause' | 'Scenario Simulator' | 'Geographic' | 'Custom Analysis';

interface AppState {
  dateFrom: string;
  dateTo: string;
  category: string;
  stateLocation: string;
  granularity: Granularity;
  activeView: View;
  selectedDate: string | null;
  uploadedFilename: string | null;
  uploadedFilenames: string[];
  isPrinting: boolean;
  
  setDateRange: (from: string, to: string) => void;
  setCategory: (cat: string) => void;
  setStateLocation: (loc: string) => void;
  setGranularity: (granularity: Granularity) => void;
  setActiveView: (view: View) => void;
  setSelectedDate: (date: string | null) => void;
  setUploadedFilename: (filename: string | null) => void;
  setUploadedFilenames: (filenames: string[]) => void;
  setIsPrinting: (v: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  dateFrom: '2015-01-01',
  dateTo: '2016-01-01',
  category: 'ALL',
  stateLocation: 'ALL',
  granularity: 'monthly',
  activeView: 'Overview',
  selectedDate: null,
  uploadedFilename: null,
  uploadedFilenames: [],
  isPrinting: false,

  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setCategory: (cat) => set({ category: cat }),
  setStateLocation: (loc) => set({ stateLocation: loc }),
  setGranularity: (g) => set({ granularity: g }),
  setActiveView: (v) => set({ activeView: v }),
  setSelectedDate: (d) => set({ selectedDate: d }),
  setUploadedFilename: (f) => set({ uploadedFilename: f }),
  setUploadedFilenames: (fs) => set({ uploadedFilenames: fs }),
  setIsPrinting: (v) => set({ isPrinting: v }),
}));
