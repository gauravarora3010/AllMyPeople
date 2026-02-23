import { useEffect } from "react";
import { SigmaContainer, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

const GraphDataFetcher = () => {
  const sigma = useSigma(); // Get the underlying Sigma instance
  const currentGraphId = useStore((state) => state.currentGraphId);
  const refreshKey = useStore((state) => state.refreshKey);

  useEffect(() => {
    async function fetchAndLoadData() {
      if (!currentGraphId) return;

      const { data: nodesData, error: nodesError } = await supabase
        .from("nodes")
        .select("*")
        .eq("graph_id", currentGraphId);

      const { data: edgesData, error: edgesError } = await supabase
        .from("edges")
        .select("*")
        .eq("graph_id", currentGraphId);

      if (nodesError || edgesError) {
        console.error("Error loading graph data:", nodesError || edgesError);
        return;
      }

      // Instead of creating a new Graph, we grab the existing one and clear it
      const graph = sigma.getGraph();
      graph.clear(); 

      // Repopulate with fresh data
      nodesData?.forEach((node) => {
        graph.addNode(node.id, {
          x: node.layout_x || Math.random() * 10,
          y: node.layout_y || Math.random() * 10,
          size: 15,
          label: node.full_name || "Unknown",
          color: node.color || "#3b82f6",
        });
      });

      edgesData?.forEach((edge) => {
        if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          graph.addEdge(edge.source, edge.target, {
            size: 2,
            color: "#9ca3af",
            label: edge.type,
          });
        }
      });
    }

    fetchAndLoadData();
  }, [currentGraphId, refreshKey, sigma]); // Triggers when refreshKey changes

  return null;
};

export default function NetworkGraph() {
  return (
    <SigmaContainer style={{ height: "100%", width: "100%" }}>
      <GraphDataFetcher />
    </SigmaContainer>
  );
}