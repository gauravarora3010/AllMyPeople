import { create } from 'zustand';

interface AppState {
  userId: string | null;
  currentGraphId: string | null;
  
  // UI State
  isSidebarOpen: boolean;
  isNodeModalOpen: boolean;
  nodeModalMode: 'add' | 'edit';
  isEdgeModalOpen: boolean; 
  isViewModalOpen: boolean;
  isBulkAddModalOpen: boolean; 
  isBulkConnectModalOpen: boolean;
  isAddPersonModalOpen: boolean;
  refreshKey: number;

  // Temporary State for passing data between modals
  draftName: string;

  // Canvas State
  selectedNodeId: string | null;

  // Actions
  setUserId: (id: string | null) => void;
  setGraphId: (id: string | null) => void;
  toggleSidebar: () => void;
  openNodeModal: (mode: 'add' | 'edit') => void;
  closeNodeModal: () => void;
  toggleEdgeModal: () => void;
  toggleViewModal: () => void;
  toggleBulkAddModal: () => void;
  toggleBulkConnectModal: () => void;
  toggleAddPersonModal: () => void; 
  setDraftName: (name: string) => void; // <-- Added setter
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
  isBulkAddModalOpen: false,
  isBulkConnectModalOpen: false, 
  isAddPersonModalOpen: false, 
  refreshKey: 0,
  draftName: "", // <-- Added default
  selectedNodeId: null,

  setUserId: (id) => set({ userId: id }),
  setGraphId: (id) => set({ currentGraphId: id }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openNodeModal: (mode) => set({ isNodeModalOpen: true, nodeModalMode: mode }),
  closeNodeModal: () => set({ isNodeModalOpen: false }),
  toggleEdgeModal: () => set((state) => ({ isEdgeModalOpen: !state.isEdgeModalOpen })),
  toggleViewModal: () => set((state) => ({ isViewModalOpen: !state.isViewModalOpen })),
  toggleBulkAddModal: () => set((state) => ({ isBulkAddModalOpen: !state.isBulkAddModalOpen })),
  toggleBulkConnectModal: () => set((state) => ({ isBulkConnectModalOpen: !state.isBulkConnectModalOpen })), 
  toggleAddPersonModal: () => set((state) => ({ isAddPersonModalOpen: !state.isAddPersonModalOpen })), 
  setDraftName: (name) => set({ draftName: name }), // <-- Added setter
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));