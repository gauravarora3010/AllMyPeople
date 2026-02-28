import { useEffect, useState, useRef } from "react";
import { SigmaContainer, useSigma, useRegisterEvents } from "@react-sigma/core";
import { createNodeImageProgram } from "@sigma/node-image";
import "@react-sigma/core/lib/style.css";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";
import { generateInitialsImage, generateProfileWithBorder, getGenderColor } from "../utils/imageUtils";

// Simple helper to pluralize labels
const pluralize = (word: string) => {
  if (!word) return "";
  const lower = word.toLowerCase();
  
  // Custom cases for common relationship terms
  if (lower === "child") return "Children";
  if (lower === "person") return "People";
  if (lower === "man") return "Men";
  if (lower === "woman") return "Women";
  
  // Standard pluralization rules
  if (lower.endsWith('s')) return word; 
  if (lower.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(lower.charAt(lower.length - 2))) {
    return word.slice(0, -1) + 'ies';
  }
  if (lower.endsWith('ch') || lower.endsWith('sh') || lower.endsWith('x') || lower.endsWith('z')) {
    return word + 'es';
  }
  return word + 's';
};

const GraphManager = () => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  
  const currentGraphId = useStore((state) => state.currentGraphId);
  const refreshKey = useStore((state) => state.refreshKey);
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useStore((state) => state.setSelectedNodeId);

  const [networkData, setNetworkData] = useState<{nodes: any[], edges: any[]}>({ nodes: [], edges: [] });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  
  const layoutCache = useRef(new Map<string, {x: number, y: number}>());
  
  // A memory cache so we never reload an image that is already on the screen!
  const renderedPhotos = useRef(new Map<string, string>());

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
      const pos = sigma.viewportToGraph({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      
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

  // THE HIGH-PERFORMANCE RENDERER
  useEffect(() => {
    const graph = sigma.getGraph();
    const { nodes, edges } = networkData;
    if (nodes.length === 0) return;

    const connectedNodeIds = new Set<string>();
    if (selectedNodeId) {
      edges.forEach(e => {
        if (e.source === selectedNodeId) connectedNodeIds.add(e.target);
        if (e.target === selectedNodeId) connectedNodeIds.add(e.source);
      });
    }

    // Keep track of what is already on the canvas so we can delete old ones
    const existingNodes = new Set(graph.nodes());

    nodes.forEach((node) => {
      const nodeIdStr = String(node.id);
      existingNodes.delete(nodeIdStr); 

      const isSelected = selectedNodeId === nodeIdStr;
      const isNeighbor = connectedNodeIds.has(nodeIdStr);
      const isDimmed = selectedNodeId !== null && !isSelected && !isNeighbor;

      let x, y;
      if (layoutCache.current.has(nodeIdStr)) {
        const cached = layoutCache.current.get(nodeIdStr)!;
        x = cached.x;
        y = cached.y;
      } else {
        x = node.layout_x ?? (Math.random() * 10);
        y = node.layout_y ?? (Math.random() * 10);
        layoutCache.current.set(nodeIdStr, { x, y });
      }

      const baseColor = getGenderColor(node.sex);
      const finalColor = isDimmed ? baseColor + "80" : baseColor;
      const targetSize = isSelected ? 35 : 25;

      // SURGICAL NODE UPDATES
      if (!graph.hasNode(nodeIdStr)) {
        // Only create the node if it literally doesn't exist yet
        const fallbackImage = generateInitialsImage(node.full_name, node.sex);
        graph.addNode(nodeIdStr, {
          x, y,
          size: targetSize,
          label: node.full_name || "Unknown",
          color: finalColor,
          type: "image", // Safely falls back to standard rendering if the image program fails
          image: fallbackImage,
        });
      } else {
        // If it exists, just smoothly update the visuals! No flickering!
        graph.setNodeAttribute(nodeIdStr, "size", targetSize);
        graph.setNodeAttribute(nodeIdStr, "color", finalColor);
        graph.setNodeAttribute(nodeIdStr, "x", x);
        graph.setNodeAttribute(nodeIdStr, "y", y);
      }

      // SMART IMAGE CACHING
      const currentPhotoUrl = node.photo_url || "";
      const previouslyRenderedUrl = renderedPhotos.current.get(nodeIdStr);

      if (currentPhotoUrl !== previouslyRenderedUrl) {
        renderedPhotos.current.set(nodeIdStr, currentPhotoUrl); 
        
        if (currentPhotoUrl) {
          generateProfileWithBorder(currentPhotoUrl, node.sex).then((finalImageDataUrl) => {
            if (graph.hasNode(nodeIdStr)) {
              graph.setNodeAttribute(nodeIdStr, "image", finalImageDataUrl);
            }
          });
        } else {
          const fallbackImage = generateInitialsImage(node.full_name, node.sex);
          if (graph.hasNode(nodeIdStr)) {
             graph.setNodeAttribute(nodeIdStr, "image", fallbackImage);
          }
        }
      }
    });

    // Clean up any nodes that were deleted from the database
    existingNodes.forEach(nodeId => graph.dropNode(nodeId));

    // REBUILD EDGES
    graph.clearEdges();
    
    edges.forEach((edge) => {
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
          
          // SMART PLURALIZATION CHECK
          if (backward && forward.trim().toLowerCase() === backward.trim().toLowerCase()) {
             displayLabel = pluralize(forward.trim());
          } else {
             displayLabel = backward ? `${forward} / ${backward}` : forward;
          }

        } else if (sourceStr === selectedNodeId || targetStr === selectedNodeId) {
          isSelectedEdge = true;
          if (selectedNodeId === targetStr) {
            visualSource = targetStr; 
            visualTarget = sourceStr; 
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
    });

  }, [networkData, selectedNodeId, sigma]);

  return null;
};

// Module-level cache ensures WebGL context is requested strictly ONCE per page load.
let cachedImageProgram: any = null;

export default function NetworkGraph() {
  const [sigmaSettings, setSigmaSettings] = useState<any>(null);

  useEffect(() => {
    if (!cachedImageProgram) {
      try {
        cachedImageProgram = createNodeImageProgram({
          maxTextureSize: 2048,
          padding: 0
        });
      } catch (error) {
        console.warn("WebGL node image program failed to initialize. Falling back to default rendering.", error);
      }
    }

    setSigmaSettings({
      nodeProgramClasses: cachedImageProgram ? { image: cachedImageProgram } : {},
      defaultNodeType: cachedImageProgram ? "image" : "circle",
      renderEdgeLabels: true,
      edgeLabelSize: 14, 
      edgeLabelColor: { color: "#4b5563" },
      defaultEdgeType: "line",
      allowInvalidContainer: true
    });
  }, []);

  if (!sigmaSettings) {
    return null;
  }

  return (
    <SigmaContainer
      style={{ height: "100%", width: "100%" }}
      settings={sigmaSettings}
    >
      <GraphManager />
    </SigmaContainer>
  );
}