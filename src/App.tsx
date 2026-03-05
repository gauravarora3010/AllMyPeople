import { useEffect, useState } from "react";
import AuthWrapper from "./AuthWrapper";
import NetworkGraph from "./components/NetworkGraph";
import Sidebar from "./components/Sidebar";
import NodeDetailsModal from "./components/NodeDetailsModal"; 
import AddEdgeModal from "./components/AddEdgeModal";
import ViewNodeModal from "./components/ViewNodeModal";
import BulkAddModal from "./components/BulkAddModal"; 
import BulkConnectModal from "./components/BulkConnectModal"; 
import AddPersonModal from "./components/AddPersonModal"; 
import SmartSuggestionsModal from "./components/SmartSuggestionsModal"; // <-- NEW
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
    toggleBulkAddModal,
    toggleBulkConnectModal,
    toggleAddPersonModal, 
    toggleSmartSuggestModal, // <-- NEW
    selectedNodeId,
    triggerRefresh
  } = useStore();

  const [isOrganizing, setIsOrganizing] = useState(false);

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

  // ==========================================
  // AUTO LAYOUT ENGINE (Organic Radial 2x Expanded)
  // ==========================================
  const handleAutoLayout = async () => {
    if (!currentGraphId) return;
    setIsOrganizing(true);

    try {
      const [graphRes, nodesRes, edgesRes] = await Promise.all([
        supabase.from('graphs').select('root_node_id').eq('id', currentGraphId).single(),
        supabase.from('nodes').select('id, full_name').eq('graph_id', currentGraphId),
        supabase.from('edges').select('source, target, category').eq('graph_id', currentGraphId)
      ]);

      const rootNodeId = graphRes.data?.root_node_id;
      const nodes = nodesRes.data || [];
      const edges = edgesRes.data || [];

      if (!rootNodeId) {
        alert("Please assign a Root Person in Tree Settings (Sidebar) before using Auto Layout.");
        setIsOrganizing(false);
        return;
      }

      const getEdgeWeight = (category: string) => {
        if (category === "Immediate Family") return 1;
        if (category === "Extended Family") return 2;
        if (category === "In-Laws & Step Family" || category === "Social & Personal") return 3;
        return 4; 
      };

      const nodeLevels = new Map<string, number>();
      nodes.forEach(n => nodeLevels.set(String(n.id), Infinity)); 
      nodeLevels.set(String(rootNodeId), 0); 

      let changed = true;
      let safetyCounter = 0; 
      
      while (changed && safetyCounter < 1000) {
        changed = false;
        safetyCounter++;
        
        for (const edge of edges) {
          const s = String(edge.source);
          const t = String(edge.target);
          const w = getEdgeWeight(edge.category);
          
          const currentS = nodeLevels.get(s);
          const currentT = nodeLevels.get(t);
          const distS = currentS !== undefined ? currentS : Infinity;
          const distT = currentT !== undefined ? currentT : Infinity;

          const costS = distS === Infinity ? Infinity : Math.max(distS, w);
          const costT = distT === Infinity ? Infinity : Math.max(distT, w);

          if (costS < distT) {
            nodeLevels.set(t, costS);
            changed = true;
          }
          if (costT < distS) {
            nodeLevels.set(s, costT);
            changed = true;
          }
        }
      }

      const levelGroups: Record<number | "unconnected", any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], unconnected: [] };
      nodes.forEach(n => {
        const lvl = nodeLevels.get(String(n.id));
        if (lvl === Infinity || lvl === undefined) levelGroups.unconnected.push(n);
        else levelGroups[lvl as number].push(n);
      });

      const updates: any[] = [];

      // Layout the Concentric Circles with 2x Scale and Organic Noise
      let currentRadius = 0;
      for (let L = 0; L <= 4; L++) {
        const group = levelGroups[L];
        const count = group.length;
        if (count === 0) continue;

        if (L === 0) {
          updates.push({ id: group[0].id, layout_x: 0, layout_y: 0 }); // Root exactly at center
        } else {
          group.sort((a, b) => a.full_name.localeCompare(b.full_name));
          
          // 2x EXPANDED: Doubled spacing multipliers
          const minRadiusForSpacing = (count * 400) / (2 * Math.PI); 
          const baseRadius = currentRadius + 1000; 
          currentRadius = Math.max(baseRadius, minRadiusForSpacing);

          const angleStep = (2 * Math.PI) / count;
          
          group.forEach((node, i) => {
            // ORGANIC NOISE: Fuzz the angles
            const randomAngleOffset = (Math.random() - 0.5) * (angleStep * 0.7); 
            const finalAngle = (i * angleStep) + randomAngleOffset;

            // ORGANIC NOISE 2x: Stagger depth proportionally
            const randomRadiusOffset = (Math.random() - 0.5) * 500; 
            const finalRadius = currentRadius + randomRadiusOffset;

            updates.push({
              id: node.id,
              layout_x: finalRadius * Math.cos(finalAngle),
              layout_y: finalRadius * Math.sin(finalAngle)
            });
          });
        }
      }

      // Layout Unconnected Nodes
      levelGroups.unconnected.sort((a, b) => a.full_name.localeCompare(b.full_name));
      levelGroups.unconnected.forEach((node, i) => {
        updates.push({
          id: node.id,
          layout_x: -5000, 
          layout_y: -5000 + (i * 300) 
        });
      });

      // Bulk update Supabase database in chunks
      const promises = updates.map(u => 
        supabase.from('nodes').update({ layout_x: u.layout_x, layout_y: u.layout_y }).eq('id', u.id)
      );

      const chunkSize = 50;
      for (let i = 0; i < promises.length; i += chunkSize) {
        await Promise.all(promises.slice(i, i + chunkSize));
      }

      triggerRefresh();
    } catch (err: any) {
      console.error(err);
      alert("Error organizing layout: " + err.message);
    } finally {
      setIsOrganizing(false);
    }
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
        <AddPersonModal /> 
        <AddEdgeModal />
        <ViewNodeModal />
        <BulkAddModal />
        <BulkConnectModal /> 
        <SmartSuggestionsModal /> {/* <-- NEW */}

        {/* FLOATING ACTION BUTTONS (CONTEXTUAL) */}
        {currentGraphId && (
          <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-3 items-end">
            
            {!selectedNodeId ? (
              <>
                <button
                  onClick={toggleSmartSuggestModal}
                  className="px-5 py-3 bg-amber-500 rounded-full shadow-lg flex items-center gap-2 text-white font-semibold hover:bg-amber-600 hover:scale-105 transition-transform"
                  title="Auto-suggest missing relationships"
                >
                  <span>🪄</span> Smart Connect
                </button>
                <button
                  onClick={handleAutoLayout}
                  disabled={isOrganizing}
                  className="px-5 py-3 bg-emerald-600 rounded-full shadow-lg flex items-center gap-2 text-white font-semibold hover:bg-emerald-700 hover:scale-105 transition-transform disabled:opacity-50"
                  title="Organize Layout by Relationship"
                >
                  <span>✨</span> {isOrganizing ? "Organizing..." : "Auto Layout"}
                </button>
                <button
                  onClick={toggleBulkAddModal}
                  className="px-5 py-3 bg-teal-600 rounded-full shadow-lg flex items-center gap-2 text-white font-semibold hover:bg-teal-700 hover:scale-105 transition-transform"
                  title="Bulk Add People"
                >
                  <span>📝</span> Bulk Add
                </button>
                <button
                  onClick={toggleAddPersonModal} 
                  className="px-5 py-3 bg-blue-600 rounded-full shadow-lg flex items-center gap-2 text-white font-semibold hover:bg-blue-700 hover:scale-105 transition-transform"
                  title="Add Single Person"
                >
                  <span>➕</span> Add Person
                </button>
              </>
            ) : (
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
                  onClick={toggleBulkConnectModal}
                  className="px-5 py-3 bg-pink-600 rounded-full shadow-lg flex items-center gap-2 text-white font-semibold hover:bg-pink-700 hover:scale-105 transition-transform"
                >
                  <span>🔀</span> Bulk Connect
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