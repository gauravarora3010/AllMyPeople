import { useEffect } from "react";
import AuthWrapper from "./AuthWrapper";
import NetworkGraph from "./components/NetworkGraph";
import Sidebar from "./components/Sidebar";
import AddPersonModal from "./components/AddPersonModal"; // NEW IMPORT
import { useStore } from "./store";
import { supabase } from "./supabaseClient";

export default function App() {
  const { userId, currentGraphId, setGraphId, toggleSidebar, toggleAddPersonModal } = useStore();

  useEffect(() => {
    async function fetchDefaultGraph() {
      if (userId && !currentGraphId) {
        const { data, error } = await supabase
          .from('graphs')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
          .single();
          
        if (data) setGraphId(data.id);
        else if (error) console.error("Error fetching graph:", error);
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
             <p className="text-xs text-gray-500">
               {currentGraphId ? "Live Database Connected" : "Loading graph..."}
             </p>
           </div>
           
           <button 
             onClick={toggleSidebar}
             className="px-4 py-2 text-sm bg-gray-800 text-white font-semibold rounded-md hover:bg-gray-900 transition shadow-sm"
           >
             ☰ Trees
           </button>

           <button 
             onClick={handleLogout}
             className="ml-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
           >
             Logout
           </button>
        </div>

        {/* OVERLAYS */}
        <Sidebar />
        <AddPersonModal />

        {/* FLOATING ACTION BUTTON (FAB) */}
        {currentGraphId && (
          <button
            onClick={toggleAddPersonModal}
            className="absolute bottom-8 right-8 z-10 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white text-3xl hover:bg-blue-700 hover:scale-105 transition-transform"
            title="Add Person"
          >
            +
          </button>
        )}

        {/* GRAPH CONTAINER */}
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
          {currentGraphId && <NetworkGraph />}
        </div>
        
      </div>
    </AuthWrapper>
  );
}