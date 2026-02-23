import { useEffect } from "react";
import AuthWrapper from "./AuthWrapper";
import NetworkGraph from "./components/NetworkGraph";
import Sidebar from "./components/Sidebar";
import NodeDetailsModal from "./components/NodeDetailsModal"; 
import AddEdgeModal from "./components/AddEdgeModal";
import ViewNodeModal from "./components/ViewNodeModal";
import { useStore } from "./store";
import { supabase } from "./supabaseClient";

export default function App() {
  const { 
    userId, 
    currentGraphId, 
    setGraphId, 
    toggleSidebar, 
    openNodeModal, 
    toggleEdgeModal, 
    toggleViewModal, 
    selectedNodeId 
  } = useStore();

  useEffect(() => {
    async function fetchDefaultGraph() {
      if (userId && !currentGraphId) {
        const { data } = await supabase
          .from('graphs')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
          .single();
        if (data) setGraphId(data.id);
      }
    }
    fetchDefaultGraph();
  }, [userId, currentGraphId, setGraphId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setGraphId(null);
  };

  return (
    <AuthWrapper>
      <div className="relative w-screen h-screen bg-slate-50 overflow-hidden">
        
        {/* HEADER OVERLAY */}
        <div className="absolute top-4 left-4 z-10 flex items-center bg-white p-4 rounded-xl shadow-md border border-gray-100">
           <div className="mr-6">
             <h1 className="font-bold text-gray-800">AllMyPeople</h1>
             <p className="text-xs text-gray-500">{currentGraphId ? "Live Database Connected" : "Loading graph..."}</p>
           </div>
           <button onClick={toggleSidebar} className="px-4 py-2 text-sm bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-900 transition shadow-sm">
             ☰ Trees
           </button>
           <button onClick={handleLogout} className="ml-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition">
             Logout
           </button>
        </div>

        {/* OVERLAYS & MODALS */}
        <Sidebar />
        <NodeDetailsModal />
        <AddEdgeModal />
        <ViewNodeModal />

        {/* FLOATING ACTION BUTTONS (CONTEXTUAL) */}
        {currentGraphId && (
          <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-3 items-end">
            
            {/* If NO node is selected, show the standard Add button */}
            {!selectedNodeId ? (
              <button
                onClick={() => openNodeModal('add')}
                className="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white text-3xl hover:bg-blue-700 hover:scale-105 transition-transform"
                title="Add Person"
              >
                +
              </button>
            ) : (
              /* If a node IS selected, show View, Connect, and Edit buttons */
              <>
                <button
                  onClick={toggleViewModal}
                  className="px-5 py-3 bg-indigo-600 rounded-full shadow-lg flex items-center gap-2 text-white font-semibold hover:bg-indigo-700 hover:scale-105 transition-transform"
                >
                  <span>👀</span> View Details
                </button>
                <button
                  onClick={toggleEdgeModal}
                  className="px-5 py-3 bg-purple-600 rounded-full shadow-lg flex items-center gap-2 text-white font-semibold hover:bg-purple-700 hover:scale-105 transition-transform"
                >
                  <span>🔗</span> Connect
                </button>
                <button
                  onClick={() => openNodeModal('edit')}
                  className="px-5 py-3 bg-gray-800 rounded-full shadow-lg flex items-center gap-2 text-white font-semibold hover:bg-gray-900 hover:scale-105 transition-transform"
                >
                  <span>✏️</span> Edit
                </button>
              </>
            )}
          </div>
        )}

        {/* GRAPH CONTAINER */}
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
          {currentGraphId && <NetworkGraph />}
        </div>
        
      </div>
    </AuthWrapper>
  );
}