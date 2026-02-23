import { useEffect } from "react";
import AuthWrapper from "./AuthWrapper";
import NetworkGraph from "./components/NetworkGraph";
import { useStore } from "./store";
import { supabase } from "./supabaseClient";

export default function App() {
  const userId = useStore((state) => state.userId);
  const currentGraphId = useStore((state) => state.currentGraphId);
  const setGraphId = useStore((state) => state.setGraphId);

  // Fetch the user's default graph when they log in
  useEffect(() => {
    async function fetchDefaultGraph() {
      if (userId && !currentGraphId) {
        const { data, error } = await supabase
          .from('graphs')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
          .single();
          
        if (data) {
          setGraphId(data.id);
        } else if (error) {
          console.error("Error fetching graph:", error);
        }
      }
    }
    fetchDefaultGraph();
  }, [userId, currentGraphId, setGraphId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setGraphId(null); // Clear state on logout
  };

  return (
    <AuthWrapper>
      <div className="relative w-screen h-screen bg-slate-50 overflow-hidden">
        
        {/* HEADER OVERLAY */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-4 bg-white p-4 rounded-xl shadow-md border border-gray-100">
           <div>
             <h1 className="font-bold text-gray-800">My Network</h1>
             <p className="text-xs text-gray-500">
               {currentGraphId ? "Live Database Connected" : "Loading graph..."}
             </p>
           </div>
           <button 
             onClick={handleLogout}
             className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
           >
             Logout
           </button>
        </div>

        {/* GRAPH CONTAINER */}
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
          {/* We only render the canvas once we have successfully found the Graph ID */}
          {currentGraphId && <NetworkGraph />}
        </div>
        
      </div>
    </AuthWrapper>
  );
}