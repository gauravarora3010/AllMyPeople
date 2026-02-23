import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

interface GraphRow {
  id: string;
  name: string;
}

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar, currentGraphId, setGraphId, userId } = useStore();
  const [graphs, setGraphs] = useState<GraphRow[]>([]);
  const [newTreeName, setNewTreeName] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch trees whenever the sidebar opens or the user changes
  useEffect(() => {
    if (!isSidebarOpen || !userId) return;

    async function fetchGraphs() {
      const { data, error } = await supabase
        .from("graphs")
        .select("id, name")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (data) setGraphs(data);
      if (error) console.error("Error fetching graphs:", error);
    }
    fetchGraphs();
  }, [isSidebarOpen, userId]);

  if (!isSidebarOpen) return null;

  // Create a brand new Tree/Graph
  const handleCreateTree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreeName.trim() || !userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("graphs")
      .insert({ owner_id: userId, name: newTreeName.trim() })
      .select("id, name")
      .single();

    if (data) {
      setGraphs([data, ...graphs]); // Add to list
      setNewTreeName(""); // Clear input
      setGraphId(data.id); // Auto-switch canvas to the new tree
      toggleSidebar(); // Close sidebar to see the fresh canvas
    } else if (error) {
      alert("Error creating tree: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-2xl z-20 border-l border-gray-200 flex flex-col transform transition-transform duration-300">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold text-gray-800">My Trees</h2>
        <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">
          &times;
        </button>
      </div>

      {/* Tree List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {graphs.map((g) => (
          <button
            key={g.id}
            onClick={() => { setGraphId(g.id); toggleSidebar(); }}
            className={`w-full text-left px-4 py-3 rounded-lg transition border ${
              currentGraphId === g.id
                ? "bg-blue-50 border-blue-200 text-blue-800 font-semibold shadow-sm"
                : "bg-white border-gray-100 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
            }`}
          >
            {g.name}
          </button>
        ))}
        {graphs.length === 0 && <p className="text-sm text-gray-500 text-center mt-4">No trees found.</p>}
      </div>

      {/* Create New Tree Form */}
      <div className="p-6 border-t border-gray-100 bg-gray-50">
        <form onSubmit={handleCreateTree} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700">Create New Tree</label>
          <input
            type="text"
            value={newTreeName}
            onChange={(e) => setNewTreeName(e.target.value)}
            placeholder="e.g. Work Colleagues"
            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 text-white font-semibold py-2 rounded-md text-sm hover:bg-gray-900 disabled:opacity-50 transition"
          >
            {loading ? "Creating..." : "+ Add Tree"}
          </button>
        </form>
      </div>
    </div>
  );
}