import { useEffect } from "react";
import Graph from "graphology";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css"; // <-- This is the fixed import

// This component loads data into the Sigma canvas
const LoadGraph = () => {
  const loadGraph = useLoadGraph();

  useEffect(() => {
    // 1. Create a new Graphology instance
    const graph = new Graph();

    // 2. Add some dummy nodes to test the canvas
    graph.addNode("node-me", { 
      x: 0, 
      y: 0, 
      size: 15, 
      label: "Me", 
      color: "#3b82f6" // Blue
    });
    
    graph.addNode("node-friend", { 
      x: 1, 
      y: 1, 
      size: 10, 
      label: "Best Friend", 
      color: "#10b981" // Green
    });

    // 3. Add an edge (connection line)
    graph.addEdge("node-me", "node-friend", { 
      size: 2, 
      color: "#9ca3af",
      label: "Friend" 
    });

    // 4. Load it into Sigma
    loadGraph(graph);
  }, [loadGraph]);

  return null;
};

export default function NetworkGraph() {
  return (
    // SigmaContainer must have a defined height/width to render WebGL properly
    <SigmaContainer style={{ height: "100%", width: "100%" }}>
      <LoadGraph />
    </SigmaContainer>
  );
}