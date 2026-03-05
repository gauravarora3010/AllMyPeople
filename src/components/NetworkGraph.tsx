import { useEffect, useState, useRef, useMemo } from "react";
import { SigmaContainer, useSigma, useRegisterEvents } from "@react-sigma/core";
import { createNodeImageProgram } from "@sigma/node-image";
import "@react-sigma/core/lib/style.css";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";
import { generateInitialsImage, generateProfileWithBorder, getGenderColor } from "../utils/imageUtils";

// A safe 1x1 transparent pixel to prevent WebGL texture panics before images load
const SAFE_BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

// Initialize WebGL program outside React to survive Hot Reloading
let CustomImageProgram: any = null;
try {
  CustomImageProgram = createNodeImageProgram({
    maxTextureSize: 2048,
    padding: 0
  });
} catch (error) {
  console.warn("WebGL node image program failed to initialize.", error);
}

const pluralize = (word: string) => {
  if (!word) return "";
  const lower = word.toLowerCase();
  if (lower === "child") return "Children";
  if (lower === "person") return "People";
  if (lower === "man") return "Men";
  if (lower === "woman") return "Women";
  if (lower.endsWith('s')) return word; 
  if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower.charAt(lower.length - 2))) {
    return word.slice(0, -1) + 'ies';
  }
  if (lower.endsWith('ch') || lower.endsWith('sh') || lower.endsWith('x') || lower.endsWith('z')) {
    return word + 'es';
  }
  return word + 's';
};

const parseSafeNumber = (val: any, fallback: number = 0): number => {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return (Number.isFinite(num) && !Number.isNaN(num)) ? num : fallback;
};

const GraphManager = () => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  
  const currentGraphId = useStore((state) => state.currentGraphId);
  const refreshKey = useStore((state) => state.refreshKey);
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useStore((state) => state.setSelectedNodeId);

  const [networkData, setNetworkData] = useState<{nodes: any[], edges: any[], rootNodeId: string | null}>({ nodes: [], edges: [], rootNodeId: null });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  
  const layoutCache = useRef(new Map<string, {x: number, y: number}>());
  const renderedPhotos = useRef(new Map<string, string>());

  useEffect(() => {
    async function fetchAndLoadData() {
      if (!currentGraphId) return;
      
      // FIX: Wipe local layout memory on refresh so Auto Layout can snap nodes to new positions!
      layoutCache.current.clear(); 
      
      try {
        const [graphRes, nodesRes, edgesRes] = await Promise.all([
          supabase.from("graphs").select("root_node_id").eq("id", currentGraphId).single(),
          supabase.from("nodes").select("*").eq("graph_id", currentGraphId),
          supabase.from("edges").select("*").eq("graph_id", currentGraphId)
        ]);

        setNetworkData({ 
          nodes: nodesRes.data || [], 
          edges: edgesRes.data || [],
          rootNodeId: graphRes.data?.root_node_id || null
        });
      } catch (err) {
        console.error("Supabase Fetch Error:", err);
      }
    }
    fetchAndLoadData();
  }, [currentGraphId, refreshKey]);

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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggedNode) return;
      e.preventDefault();
      const rect = sigma.getContainer().getBoundingClientRect();
      const pos = sigma.viewportToGraph({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      sigma.getGraph().setNodeAttribute(draggedNode, "x", pos.x);
      sigma.getGraph().setNodeAttribute(draggedNode, "y", pos.y);
      layoutCache.current.set(String(draggedNode), { x: pos.x, y: pos.y });
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (draggedNode) {
        e.preventDefault();
        const nodeX = sigma.getGraph().getNodeAttribute(draggedNode, "x");
        const nodeY = sigma.getGraph().getNodeAttribute(draggedNode, "y");
        setDraggedNode(null);
        sigma.getCamera().enable();
        await supabase.from("nodes").update({ layout_x: nodeX, layout_y: nodeY }).eq("id", draggedNode);
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
  }, [draggedNode, sigma]);

  useEffect(() => {
    const graph = sigma.getGraph();
    const { nodes, edges, rootNodeId } = networkData;
    if (nodes.length === 0) return;

    const connectedNodeIds = new Set<string>();
    if (selectedNodeId) {
      edges.forEach(e => {
        if (e.source === selectedNodeId) connectedNodeIds.add(e.target);
        if (e.target === selectedNodeId) connectedNodeIds.add(e.source);
      });
    }

    const existingNodes = new Set(graph.nodes());

    nodes.forEach((node) => {
      try {
        const nodeIdStr = String(node.id);
        existingNodes.delete(nodeIdStr); 

        const isRoot = String(rootNodeId) === nodeIdStr;
        const isSelected = selectedNodeId === nodeIdStr;
        const isNeighbor = connectedNodeIds.has(nodeIdStr);
        const isDimmed = selectedNodeId !== null && !isSelected && !isNeighbor;

        let dbX = parseSafeNumber(node.layout_x, NaN);
        let dbY = parseSafeNumber(node.layout_y, NaN);
        
        const isLegacyTrapped = (!isRoot && !Number.isNaN(dbX) && dbX >= 0 && dbX <= 10 && !Number.isNaN(dbY) && dbY >= 0 && dbY <= 10);

        let x, y;
        if (layoutCache.current.has(nodeIdStr) && !isLegacyTrapped) {
          const cached = layoutCache.current.get(nodeIdStr)!;
          x = cached.x;
          y = cached.y;
        } else {
          const randomX = (Math.random() * 1000) - 500;
          const randomY = (Math.random() * 1000) - 500;
          
          x = isLegacyTrapped ? randomX : (Number.isNaN(dbX) ? (isRoot ? 0 : randomX) : dbX);
          y = isLegacyTrapped ? randomY : (Number.isNaN(dbY) ? (isRoot ? 0 : randomY) : dbY);
          
          layoutCache.current.set(nodeIdStr, { x, y });
          
          if (isLegacyTrapped || Number.isNaN(dbX)) {
             supabase.from("nodes").update({ layout_x: x, layout_y: y }).eq("id", node.id).then();
          }
        }

        const baseColor = getGenderColor(node.sex);
        const finalColor = isDimmed ? baseColor + "80" : baseColor;
        
        // Root node gets bigger (60) when selected, otherwise 50. Normal nodes 35/25.
        let targetSize = 25;
        if (isRoot) targetSize = isSelected ? 60 : 50;
        else targetSize = isSelected ? 35 : 25;

        // Supply safe fallback image on mount
        if (!graph.hasNode(nodeIdStr)) {
          graph.addNode(nodeIdStr, {
            x, y,
            size: targetSize,
            label: node.full_name || "Unknown",
            color: finalColor,
            type: CustomImageProgram ? "image" : "circle",
            image: SAFE_BLANK_IMAGE, 
          });
        } else {
          graph.setNodeAttribute(nodeIdStr, "size", targetSize);
          graph.setNodeAttribute(nodeIdStr, "color", finalColor);
          graph.setNodeAttribute(nodeIdStr, "label", node.full_name || "Unknown");
          graph.setNodeAttribute(nodeIdStr, "x", x);
          graph.setNodeAttribute(nodeIdStr, "y", y);
          
          if (CustomImageProgram && graph.getNodeAttribute(nodeIdStr, "type") === "circle") {
             graph.setNodeAttribute(nodeIdStr, "type", "image");
          }
        }

        const currentCacheKey = `${node.photo_url || ""}::${node.sex}::${node.full_name}`;
        const previousCacheKey = renderedPhotos.current.get(nodeIdStr);

        if (currentCacheKey !== previousCacheKey) {
          renderedPhotos.current.set(nodeIdStr, currentCacheKey); 
          
          if (node.photo_url) {
            generateProfileWithBorder(node.photo_url, node.sex).then((finalImageDataUrl) => {
              if (graph.hasNode(nodeIdStr)) graph.setNodeAttribute(nodeIdStr, "image", finalImageDataUrl);
            });
          } else {
            Promise.resolve(generateInitialsImage(node.full_name, node.sex)).then((fallbackImage) => {
              if (graph.hasNode(nodeIdStr) && fallbackImage) graph.setNodeAttribute(nodeIdStr, "image", fallbackImage);
            });
          }
        }
      } catch (nodeErr) {
        console.error("Node Rendering Error:", nodeErr);
      }
    });

    existingNodes.forEach(nodeId => graph.dropNode(nodeId));
    graph.clearEdges();
    
    edges.forEach((edge) => {
      try {
        const sourceStr = String(edge.source);
        const targetStr = String(edge.target);
        
        if (graph.hasNode(sourceStr) && graph.hasNode(targetStr)) {
          let displayLabel = "";
          let isSelectedEdge = false;
          let isDimmedEdge = false;
          let visualSource = sourceStr;
          let visualTarget = targetStr;

          if (!selectedNodeId) {
            const forward = edge.label || edge.category;
            const backward = edge.reverse_label;
            if (backward && forward.trim().toLowerCase() === backward.trim().toLowerCase()) {
               displayLabel = pluralize(forward.trim());
            } else {
               displayLabel = backward ? `${forward} / ${backward}` : forward;
            }
          } else if (sourceStr === selectedNodeId || targetStr === selectedNodeId) {
            isSelectedEdge = true;
            if (selectedNodeId === targetStr) {
              visualSource = targetStr; visualTarget = sourceStr; 
              displayLabel = edge.reverse_label || edge.category;
            } else {
              displayLabel = edge.label || edge.category;
            }
          } else {
            isDimmedEdge = true;
          }

          graph.addDirectedEdge(visualSource, visualTarget, {
            size: isSelectedEdge ? 3.5 : (isDimmedEdge ? 1 : 2.5),
            color: isSelectedEdge ? "#6b7280" : (isDimmedEdge ? "#f1f5f9" : "#9ca3af"),
            label: displayLabel,
            type: isSelectedEdge ? "arrow" : "line",
          });
        }
      } catch (edgeErr) {}
    });

  }, [networkData, selectedNodeId, sigma]);

  return null;
};

export default function NetworkGraph() {
  const sigmaSettings: any = useMemo(() => ({
    nodeProgramClasses: CustomImageProgram ? { image: CustomImageProgram } : {},
    defaultNodeType: CustomImageProgram ? "image" : "circle",
    renderEdgeLabels: true,
    edgeLabelSize: 14, 
    edgeLabelColor: { color: "#4b5563" },
    defaultEdgeType: "line",
    allowInvalidContainer: true 
  }), []);

  return (
    <SigmaContainer style={{ height: "100%", width: "100%" }} settings={sigmaSettings}>
      <GraphManager />
    </SigmaContainer>
  );
}