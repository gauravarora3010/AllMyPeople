import { useEffect } from "react";
import Graph from "graphology";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

const LoadGraph = () => {
  const loadGraph = useLoadGraph();
  const currentGraphId = useStore((state) => state.currentGraphId);

  useEffect(() => {
    async function fetchAndLoadData() {
      if (!currentGraphId) return;

      // 1. Fetch Real Nodes from Supabase
      const { data: nodesData, error: nodesError } = await supabase
        .from("nodes")
        .select("*")
        .eq("graph_id", currentGraphId);

      // 2. Fetch Real Edges from Supabase
      const { data: edgesData, error: edgesError } = await supabase
        .from("edges")
        .select("*")
        .eq("graph_id", currentGraphId);

      if (nodesError || edgesError) {
        console.error("Error loading graph data:", nodesError || edgesError);
        return;
      }

      // 3. Create a new Graphology instance
      const graph = new Graph();

      // 4. Add the fetched nodes to the graph
      nodesData?.forEach((node) => {
        graph.addNode(node.id, {
          x: node.layout_x || Math.random() * 10, // Provide fallback coordinates if 0
          y: node.layout_y || Math.random() * 10,
          size: 15,
          label: node.full_name || "Unknown",
          color: node.color || "#3b82f6", // Default Blue
        });
      });

      // 5. Add the fetched edges to the graph
      edgesData?.forEach((edge) => {
        // Safety check: ensure both source and target nodes exist in the graph before connecting them
        if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          graph.addEdge(edge.source, edge.target, {
            size: 2,
            color: "#9ca3af",
            label: edge.type,
          });
        }
      });

      // 6. Load the fully populated graph into Sigma
      loadGraph(graph);
    }

    fetchAndLoadData();
  }, [currentGraphId, loadGraph]);

  return null; // This component handles data logic, it doesn't render HTML itself
};

export default function NetworkGraph() {
  return (
    <SigmaContainer style={{ height: "100%", width: "100%" }}>
      <LoadGraph />
    </SigmaContainer>
  );
}