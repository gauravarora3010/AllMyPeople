import { create } from 'zustand';

interface AppState {
  userId: string | null;
  currentGraphId: string | null;
  
  // Actions
  setUserId: (id: string | null) => void;
  setGraphId: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  userId: null,
  currentGraphId: null,

  setUserId: (id) => set({ userId: id }),
  setGraphId: (id) => set({ currentGraphId: id }),
}));