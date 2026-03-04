import { useEffect, useState } from "react";
import { useStore } from "../store";
import { supabase } from "../supabaseClient";

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar, userId, setGraphId, currentGraphId, triggerRefresh, refreshKey } = useStore();
  const [graphs, setGraphs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modes for forms
  const [formMode, setFormMode] = useState<"none" | "create" | "edit">("none");

  // Create Form State
  const [newGraphName, setNewGraphName] = useState("");
  const [rootPersonName, setRootPersonName] = useState("");
  const [rootPersonSex, setRootPersonSex] = useState("Male");

  // Edit Form State
  const [editGraphId, setEditGraphId] = useState("");
  const [editGraphName, setEditGraphName] = useState("");
  const [editRootNodeId, setEditRootNodeId] = useState("");
  const [availableNodes, setAvailableNodes] = useState<any[]>([]);

  useEffect(() => {
    if (isSidebarOpen && userId) {
      fetchGraphs();
    }
  }, [isSidebarOpen, userId, refreshKey, currentGraphId]);

  const fetchGraphs = async () => {
    const { data } = await supabase.from('graphs').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
    if (data) setGraphs(data);
  };

  const openCreateForm = () => {
    setNewGraphName("");
    setRootPersonName("");
    setRootPersonSex("Male");
    setFormMode("create");
  };

  const openEditForm = async (graph: any) => {
    setEditGraphId(graph.id);
    setEditGraphName(graph.name);
    setEditRootNodeId(graph.root_node_id || "");
    
    // Fetch all nodes inside this graph so the user can pick a new root
    const { data: nodesData } = await supabase.from("nodes").select("id, full_name").eq("graph_id", graph.id);
    setAvailableNodes(nodesData || []);
    
    setFormMode("edit");
  };

  const handleCreateGraph = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGraphName.trim() || !rootPersonName.trim()) return;
    setLoading(true);

    // 1. Create the Graph
    const { data: graphData, error: graphError } = await supabase
      .from('graphs')
      .insert({ name: newGraphName, owner_id: userId })
      .select()
      .single();

    if (graphError) {
      alert(graphError.message);
      setLoading(false);
      return;
    }

    // 2. Create the Root Node at exact dead center (0, 0)
    const { data: nodeData, error: nodeError } = await supabase
      .from('nodes')
      .insert({ 
        graph_id: graphData.id, 
        full_name: rootPersonName, 
        sex: rootPersonSex,
        layout_x: 0,
        layout_y: 0
      })
      .select()
      .single();

    // 3. Update the Graph to link the new Root Node
    if (nodeData && !nodeError) {
      await supabase.from('graphs').update({ root_node_id: nodeData.id }).eq('id', graphData.id);
    }

    setGraphId(graphData.id);
    triggerRefresh();
    setFormMode("none");
    setLoading(false);
    toggleSidebar();
  };

  const handleUpdateGraph = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGraphName.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from('graphs')
      .update({ 
        name: editGraphName,
        root_node_id: editRootNodeId || null 
      })
      .eq('id', editGraphId);

    if (error) {
      alert("Error updating tree: " + error.message);
    } else {
      triggerRefresh();
      setFormMode("none");
    }
    setLoading(false);
  };

  const handleDeleteGraph = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the tree "${name}"? This will delete all people and connections inside it permanently.`)) {
      await supabase.from('graphs').delete().eq('id', id);
      if (currentGraphId === id) setGraphId(null);
      fetchGraphs();
    }
  };

  return (
    <>
      {/* Dim Overlay */}
      {isSidebarOpen && (
        <div className="absolute inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={toggleSidebar} />
      )}

      {/* Sidebar Panel */}
      <div className={`absolute top-0 left-0 h-full w-80 bg-white z-50 shadow-2xl transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        
        <div className="p-5 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Your Trees</h2>
          <button onClick={toggleSidebar} className="text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
        </div>

        {/* Dynamic Area: Lists Trees OR Shows Forms */}
        <div className="p-5 flex-1 overflow-y-auto">
          
          {/* STATE 1: List existing trees */}
          {formMode === "none" && (
            <>
              <button 
                onClick={openCreateForm} 
                className="w-full py-3 mb-6 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition border border-blue-200"
              >
                + Create New Tree
              </button>
              
              <div className="flex flex-col gap-3">
                {graphs.map((graph) => (
                  <div key={graph.id} className={`p-4 rounded-xl border transition ${currentGraphId === graph.id ? "bg-blue-600 text-white border-blue-700 shadow-md" : "bg-white text-gray-800 border-gray-200 hover:border-blue-400"}`}>
                    
                    <div className="flex justify-between items-start mb-2">
                       <h3 className="font-bold text-lg leading-tight truncate pr-2 cursor-pointer" onClick={() => { setGraphId(graph.id); toggleSidebar(); }}>
                         {graph.name}
                       </h3>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => { setGraphId(graph.id); toggleSidebar(); }} 
                        className={`flex-1 text-sm py-1.5 rounded-md font-medium transition ${currentGraphId === graph.id ? "bg-blue-700 hover:bg-blue-800" : "bg-gray-100 hover:bg-gray-200"}`}
                      >
                        {currentGraphId === graph.id ? "Currently Viewing" : "Load Tree"}
                      </button>
                      <button onClick={() => openEditForm(graph)} className="p-1.5 bg-white/20 hover:bg-white/40 text-gray-600 rounded-md transition" title="Tree Settings">
                         ⚙️
                      </button>
                      <button onClick={() => handleDeleteGraph(graph.id, graph.name)} className="p-1.5 bg-white/20 hover:bg-red-500 hover:text-white text-gray-600 rounded-md transition" title="Delete Tree">
                         🗑️
                      </button>
                    </div>
                  </div>
                ))}
                
                {graphs.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-6">You don't have any family trees yet. Create one to get started!</p>
                )}
              </div>
            </>
          )}

          {/* STATE 2: Create Form */}
          {formMode === "create" && (
            <form onSubmit={handleCreateGraph} className="space-y-4">
              <h3 className="font-bold text-lg text-gray-800 mb-2 border-b pb-2">Create New Tree</h3>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tree Name</label>
                <input required type="text" placeholder="e.g. The Arora Family" value={newGraphName} onChange={(e) => setNewGraphName(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Define Root Person</p>
                 <p className="text-xs text-gray-500">Every tree starts with a central person. This person will appear largest in the graph.</p>
                 
                 <div>
                    <label className="block text-xs text-gray-600 mb-1">Full Name</label>
                    <input required type="text" placeholder="e.g. Divya Arora" value={rootPersonName} onChange={(e) => setRootPersonName(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                 </div>
                 
                 <div>
                    <label className="block text-xs text-gray-600 mb-1">Gender</label>
                    <select required value={rootPersonSex} onChange={(e) => setRootPersonSex(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                 </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setFormMode("none")} className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition">
                  {loading ? "Creating..." : "Save Tree"}
                </button>
              </div>
            </form>
          )}

          {/* STATE 3: Edit Form */}
          {formMode === "edit" && (
            <form onSubmit={handleUpdateGraph} className="space-y-4">
              <h3 className="font-bold text-lg text-gray-800 mb-2 border-b pb-2">Tree Settings</h3>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tree Name</label>
                <input required type="text" value={editGraphName} onChange={(e) => setEditGraphName(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Change Root Person</p>
                 <p className="text-xs text-gray-500">Select which person should be the primary focus and appear largest in the center.</p>
                 
                 <select value={editRootNodeId} onChange={(e) => setEditRootNodeId(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 text-sm bg-white">
                    <option value="">-- No Root Person --</option>
                    {availableNodes.map(node => (
                       <option key={node.id} value={node.id}>{node.full_name}</option>
                    ))}
                 </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setFormMode("none")} className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-md hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition">
                  {loading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </>
  );
}