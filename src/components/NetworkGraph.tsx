import { useEffect, useState, useRef } from "react";
import { SigmaContainer, useSigma, useRegisterEvents } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

const GraphEvents = () => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const setSelectedNodeId = useStore((state) => state.setSelectedNodeId);
  const triggerRefresh = useStore((state) => state.triggerRefresh);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // CLICK & DRAG START EVENTS
  useEffect(() => {
    registerEvents({
      clickNode: (event) => setSelectedNodeId(event.node),
      clickStage: () => setSelectedNodeId(null),
      downNode: (e) => {
        setDraggedNode(e.node);
        sigma.getCamera().disable();
        e.preventSigmaDefault();
      }
    });
  }, [registerEvents, setSelectedNodeId, sigma]);

  // DRAG & DROP TRACKING
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedNode) return;
      e.preventDefault();
      const rect = sigma.getContainer().getBoundingClientRect();
      const pos = sigma.viewportToGraph({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      sigma.getGraph().setNodeAttribute(draggedNode, "x", pos.x);
      sigma.getGraph().setNodeAttribute(draggedNode, "y", pos.y);
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (draggedNode) {
        e.preventDefault();
        const nodeX = sigma.getGraph().getNodeAttribute(draggedNode, "x");
        const nodeY = sigma.getGraph().getNodeAttribute(draggedNode, "y");

        setDraggedNode(null);
        sigma.getCamera().enable();

        // Save new coordinates and refresh
        await supabase.from("nodes").update({ layout_x: nodeX, layout_y: nodeY }).eq("id", draggedNode);
        triggerRefresh();
      }
    };

    if (draggedNode) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedNode, sigma, triggerRefresh]);

  return null;
};

const GraphDataFetcher = () => {
  const sigma = useSigma();
  const currentGraphId = useStore((state) => state.currentGraphId);
  const refreshKey = useStore((state) => state.refreshKey);
  const selectedNodeId = useStore((state) => state.selectedNodeId);

  const [networkData, setNetworkData] = useState<{nodes: any[], edges: any[]}>({ nodes: [], edges: [] });
  const layoutCache = useRef(new Map<string, {x: number, y: number}>());

  useEffect(() => {
    async function fetchAndLoadData() {
      if (!currentGraphId) return;
      const { data: nodesData } = await supabase.from("nodes").select("*").eq("graph_id", currentGraphId);
      const { data: edgesData } = await supabase.from("edges").select("*").eq("graph_id", currentGraphId);
      setNetworkData({ nodes: nodesData || [], edges: edgesData || [] });
    }
    fetchAndLoadData();
  }, [currentGraphId, refreshKey]);

  useEffect(() => {
    const graph = sigma.getGraph();
    graph.clear();

    const { nodes, edges } = networkData;
    if (nodes.length === 0) return;

    const connectedNodeIds = new Set<string>();
    if (selectedNodeId) {
      edges.forEach(e => {
        if (e.source === selectedNodeId) connectedNodeIds.add(e.target);
        if (e.target === selectedNodeId) connectedNodeIds.add(e.source);
      });
    }

    nodes.forEach((node) => {
      const isSelected = selectedNodeId === node.id;
      const isNeighbor = connectedNodeIds.has(node.id);
      
      const isDimmed = selectedNodeId !== null && !isSelected && !isNeighbor;

      let x = node.layout_x;
      let y = node.layout_y;
      
      if (!x && x !== 0) x = 0;
      if (!y && y !== 0) y = 0;

      if (x === 0 && y === 0) {
        if (!layoutCache.current.has(node.id)) {
          layoutCache.current.set(node.id, { x: Math.random() * 10, y: Math.random() * 10 });
        }
        const cached = layoutCache.current.get(node.id)!;
        x = cached.x;
        y = cached.y;
      } else {
        layoutCache.current.set(node.id, { x, y });
      }

      const baseColor = node.color || "#3b82f6";
      
      // FIX: Changed "40" to "80" (approx 50% opacity). 
      // This ensures gray nodes don't vanish entirely against the white background.
      const finalColor = isDimmed && baseColor.startsWith('#') && baseColor.length === 7
        ? baseColor + "80" 
        : baseColor;

      graph.addNode(node.id, {
        x: x,
        y: y,
        size: isSelected ? 20 : 15,
        label: node.full_name || "Unknown",
        color: finalColor,
      });
    });

    edges.forEach((edge) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        let displayLabel = "";
        let isSelectedEdge = false;
        let visualSource = edge.source;
        let visualTarget = edge.target;

        if (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) {
          isSelectedEdge = true;

          if (selectedNodeId === edge.target) {
            visualSource = edge.target; 
            visualTarget = edge.source; 
            displayLabel = edge.reverse_label || edge.category;
          } else {
            displayLabel = edge.label || edge.category;
          }
        }

        graph.addDirectedEdge(visualSource, visualTarget, {
          size: isSelectedEdge ? 2.5 : 1.5,
          color: isSelectedEdge ? "#6b7280" : "#cbd5e1",
          label: displayLabel,
          type: isSelectedEdge ? "arrow" : "line",
        });
      }
    });
  }, [networkData, selectedNodeId, sigma]);

  return null;
};

export default function NetworkGraph() {
  return (
    <SigmaContainer
      style={{ height: "100%", width: "100%" }}
      settings={{
        renderEdgeLabels: true,
        edgeLabelSize: 12,
        edgeLabelColor: { color: "#4b5563" },
        defaultEdgeType: "line"
      }}
    >
      <GraphDataFetcher />
      <GraphEvents />
    </SigmaContainer>
  );
}