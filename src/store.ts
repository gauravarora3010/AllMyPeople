import { create } from 'zustand';

interface AppState {
  userId: string | null;
  currentGraphId: string | null;
  
  // UI State
  isSidebarOpen: boolean;
  isAddPersonModalOpen: boolean; // NEW: Controls the Modal
  refreshKey: number;

  // Actions
  setUserId: (id: string | null) => void;
  setGraphId: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleAddPersonModal: () => void; // NEW: Toggles the Modal
  triggerRefresh: () => void;
}

export const useStore = create<AppState>((set) => ({
  userId: null,
  currentGraphId: null,
  isSidebarOpen: false,
  isAddPersonModalOpen: false,
  refreshKey: 0,

  setUserId: (id) => set({ userId: id }),
  setGraphId: (id) => set({ currentGraphId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleAddPersonModal: () => set((state) => ({ isAddPersonModalOpen: !state.isAddPersonModalOpen })),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));