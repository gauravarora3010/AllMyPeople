import { create } from 'zustand';

interface AppState {
  userId: string | null;
  currentGraphId: string | null;
  
  // UI State
  isSidebarOpen: boolean;
  isNodeModalOpen: boolean;
  nodeModalMode: 'add' | 'edit';
  isEdgeModalOpen: boolean; 
  isViewModalOpen: boolean; // NEW: Controls the View Details screen
  refreshKey: number;

  // Canvas State
  selectedNodeId: string | null;

  // Actions
  setUserId: (id: string | null) => void;
  setGraphId: (id: string | null) => void;
  toggleSidebar: () => void;
  openNodeModal: (mode: 'add' | 'edit') => void;
  closeNodeModal: () => void;
  toggleEdgeModal: () => void;
  toggleViewModal: () => void; // NEW
  setSelectedNodeId: (id: string | null) => void;
  triggerRefresh: () => void;
}

export const useStore = create<AppState>((set) => ({
  userId: null,
  currentGraphId: null,
  isSidebarOpen: false,
  isNodeModalOpen: false,
  nodeModalMode: 'add',
  isEdgeModalOpen: false,
  isViewModalOpen: false,
  refreshKey: 0,
  selectedNodeId: null,

  setUserId: (id) => set({ userId: id }),
  setGraphId: (id) => set({ currentGraphId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openNodeModal: (mode) => set({ isNodeModalOpen: true, nodeModalMode: mode }),
  closeNodeModal: () => set({ isNodeModalOpen: false }),
  toggleEdgeModal: () => set((state) => ({ isEdgeModalOpen: !state.isEdgeModalOpen })),
  toggleViewModal: () => set((state) => ({ isViewModalOpen: !state.isViewModalOpen })),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));