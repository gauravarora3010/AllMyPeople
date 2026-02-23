import AuthWrapper from "./AuthWrapper";
import NetworkGraph from "./components/NetworkGraph";
import { useStore } from "./store";
import { supabase } from "./supabaseClient";

export default function App() {
  // We grab the userId from our Zustand store (just in case we need it later)
  const userId = useStore((state) => state.userId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthWrapper>
      <div className="relative w-screen h-screen bg-slate-50 overflow-hidden">
        
        {/* HEADER OVERLAY */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-4 bg-white p-4 rounded-xl shadow-md border border-gray-100">
           <div>
             <h1 className="font-bold text-gray-800">My Network</h1>
             <p className="text-xs text-gray-500">Sigma.js Canvas Active</p>
           </div>
           <button 
             onClick={handleLogout}
             className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
           >
             Logout
           </button>
        </div>

        {/* GRAPH CONTAINER */}
        {/* We use cursor-grab so it feels like a draggable map */}
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
          <NetworkGraph />
        </div>
        
      </div>
    </AuthWrapper>
  );
}