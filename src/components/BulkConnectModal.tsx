import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

const CATEGORIES = [
  "Immediate Family", 
  "Extended Family", 
  "In-Laws & Step Family", 
  "Social & Personal", 
  "Professional", 
  "Other"
];

const RELATIONSHIP_CATEGORIES: Record<string, string[]> = {
  "Immediate Family": [
    "Brother", "Child", "Daughter", "Father", "Husband", "Mother", "Parent",
    "Partner", "Sibling", "Sister", "Son", "Spouse", "Wife"
  ],
  "Extended Family": [
    "Aunt", "Cousin", "Grandchild", "Granddaughter", "Grandfather", "Grandmother",
    "Grandparent", "Grandson", "Nephew", "Niece", "Uncle"
  ],
  "In-Laws & Step Family": [
    "Brother-in-law", "Child-in-law", "Daughter-in-law", "Father-in-law",
    "Mother-in-law", "Parent-in-law", "Sibling-in-law", "Sister-in-law",
    "Son-in-law", "Step-brother", "Step-child", "Step-daughter", "Step-father",
    "Step-mother", "Step-parent", "Step-sibling", "Step-sister", "Step-son"
  ],
  "Social & Personal": [
    "Acquaintance", "Best Friend", "Childhood Friend", "Enemy", "Ex-Partner",
    "Ex-Spouse", "Friend", "Neighbor", "Rival", "Roommate"
  ],
  "Professional": [
    "Boss", "Business Partner", "Classmate", "Client", "Colleague", "Employee",
    "Manager", "Mentee", "Mentor", "Student", "Subordinate", "Teacher", "Vendor"
  ],
  "Other": []
};

export default function BulkConnectModal() {
  const { isBulkConnectModalOpen, toggleBulkConnectModal, currentGraphId, selectedNodeId, triggerRefresh } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [availableNodes, setAvailableNodes] = useState<any[]>([]);
  const [existingEdges, setExistingEdges] = useState<any[]>([]);
  const [sourceNodeName, setSourceNodeName] = useState("Unknown");

  const [rows, setRows] = useState([
    { id: 1, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" },
    { id: 2, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" },
    { id: 3, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" }
  ]);

  useEffect(() => {
    async function fetchData() {
      if (isBulkConnectModalOpen && currentGraphId && selectedNodeId) {
        // Fetch nodes and existing edges for the selected person concurrently
        const [nodesRes, edgesRes] = await Promise.all([
          supabase.from('nodes').select('id, full_name').eq('graph_id', currentGraphId),
          supabase.from('edges').select('*').eq('graph_id', currentGraphId).or(`source.eq.${selectedNodeId},target.eq.${selectedNodeId}`)
        ]);

        if (nodesRes.data) {
          // Sort alphabetically
          const sortedData = nodesRes.data.sort((a, b) => a.full_name.localeCompare(b.full_name));
          setAvailableNodes(sortedData.filter(n => String(n.id) !== selectedNodeId));
          
          const source = nodesRes.data.find(n => String(n.id) === selectedNodeId);
          if (source) setSourceNodeName(source.full_name);
        }
        
        if (edgesRes.data) {
          setExistingEdges(edgesRes.data);
        }
      } else {
        setRows([
          { id: 1, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" },
          { id: 2, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" },
          { id: 3, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" }
        ]);
        setExistingEdges([]);
      }
    }
    fetchData();
  }, [isBulkConnectModalOpen, currentGraphId, selectedNodeId]);

  if (!isBulkConnectModalOpen) return null;

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now(), targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" }]);
  };

  const handleRemoveRow = (id: number) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleChange = (id: number, field: keyof typeof rows[0], value: string) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  // SMART TARGET SELECTION: Auto-fills if an edge already exists
  const handleTargetChange = (id: number, newTargetId: string) => {
    const existingEdge = existingEdges.find(e => String(e.source) === newTargetId || String(e.target) === newTargetId);

    if (existingEdge) {
      // Auto-fill existing relationship data
      let fwdLabel = existingEdge.label;
      let revLabel = existingEdge.reverse_label;

      if (String(existingEdge.source) === newTargetId) {
         fwdLabel = existingEdge.reverse_label;
         revLabel = existingEdge.label;
      }

      // Determine if labels are custom
      let isFwdCustom = true;
      let isRevCustom = true;
      for (const rels of Object.values(RELATIONSHIP_CATEGORIES)) {
        if (rels.includes(fwdLabel)) isFwdCustom = false;
        if (rels.includes(revLabel)) isRevCustom = false;
      }

      setRows(rows.map(r => r.id === id ? {
        ...r,
        targetId: newTargetId,
        label: isFwdCustom ? "Other" : fwdLabel,
        customLabel: isFwdCustom ? fwdLabel : "",
        reverseLabel: isRevCustom ? "Other" : revLabel,
        customReverseLabel: isRevCustom ? revLabel : ""
      } : r));
    } else {
      // Reset to default if no existing edge
      setRows(rows.map(r => r.id === id ? {
        ...r,
        targetId: newTargetId,
        label: "Friend",
        reverseLabel: "Friend",
        customLabel: "",
        customReverseLabel: ""
      } : r));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGraphId || !selectedNodeId) return;

    const validRows = rows.filter(row => row.targetId.trim() !== "");
    
    if (validRows.length === 0) {
      alert("Please select at least one person to connect to.");
      return;
    }

    setLoading(true);

    try {
      const promises = validRows.map(row => {
        let foundCategory = "Other";
        if (row.label !== "Other") {
          for (const [categoryName, relationships] of Object.entries(RELATIONSHIP_CATEGORIES)) {
            if (relationships.includes(row.label)) {
              foundCategory = categoryName;
              break;
            }
          }
        }

        const finalLabel = row.label === "Other" ? row.customLabel : row.label;
        const finalReverseLabel = row.reverseLabel === "Other" ? row.customReverseLabel : row.reverseLabel;

        const payload = {
          graph_id: currentGraphId,
          source: selectedNodeId,
          target: row.targetId,
          label: finalLabel,                 
          reverse_label: finalReverseLabel,  
          category: foundCategory
        };

        const existingEdge = existingEdges.find(e => String(e.source) === row.targetId || String(e.target) === row.targetId);

        // Update if exists, insert if it doesn't
        if (existingEdge) {
          return supabase.from('edges').update(payload).eq('id', existingEdge.id);
        } else {
          return supabase.from('edges').insert(payload);
        }
      });

      // Execute all inserts/updates concurrently
      await Promise.all(promises);

      triggerRefresh();
      toggleBulkConnectModal();
    } catch (err: any) {
      alert("Error saving connections: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Bulk Connect: <span className="text-blue-600">{sourceNodeName}</span></h2>
            <p className="text-xs text-gray-500">Quickly link {sourceNodeName} to multiple people at once. Empty rows are ignored.</p>
          </div>
          <button onClick={toggleBulkConnectModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          
          <div className="flex px-8 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
             <div className="flex-1">Target Person</div>
             <div className="w-52 ml-3">{sourceNodeName} is their...</div>
             <div className="w-52 ml-3">They are {sourceNodeName}'s...</div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
            {rows.map((row, index) => {
              const hasExistingEdge = existingEdges.some(e => String(e.source) === row.targetId || String(e.target) === row.targetId);

              return (
                <div key={row.id} className="flex flex-col gap-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 font-mono text-sm w-6 text-center mt-2">{index + 1}.</span>
                    
                    <div className="flex-1">
                      <select 
                        value={row.targetId} 
                        onChange={(e) => handleTargetChange(row.id, e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                      >
                        <option value="">-- Select Person --</option>
                        {availableNodes.map(node => (
                          <option key={node.id} value={node.id}>{node.full_name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="w-52 flex flex-col gap-2">
                      <select 
                        value={row.label} 
                        onChange={(e) => handleChange(row.id, "label", e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                      >
                        {CATEGORIES.filter(c => c !== "Other").map(category => (
                          <optgroup key={category} label={category}>
                            {RELATIONSHIP_CATEGORIES[category as keyof typeof RELATIONSHIP_CATEGORIES].map(rel => (
                              <option key={rel} value={rel}>{rel}</option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="Other">Custom (Type your own)</option>
                      </select>
                      {row.label === "Other" && (
                        <input type="text" required placeholder="Type relationship..." value={row.customLabel} onChange={(e) => handleChange(row.id, "customLabel", e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm shadow-inner" />
                      )}
                    </div>

                    <div className="w-52 flex flex-col gap-2">
                      <select 
                        value={row.reverseLabel} 
                        onChange={(e) => handleChange(row.id, "reverseLabel", e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                      >
                        {CATEGORIES.filter(c => c !== "Other").map(category => (
                          <optgroup key={category} label={category}>
                            {RELATIONSHIP_CATEGORIES[category as keyof typeof RELATIONSHIP_CATEGORIES].map(rel => (
                              <option key={rel} value={rel}>{rel}</option>
                            ))}
                          </optgroup>
                        ))}
                        <option value="Other">Custom (Type your own)</option>
                      </select>
                      {row.reverseLabel === "Other" && (
                        <input type="text" required placeholder="Type relationship..." value={row.customReverseLabel} onChange={(e) => handleChange(row.id, "customReverseLabel", e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm shadow-inner" />
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => handleRemoveRow(row.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition mt-0.5"
                      title="Remove Row"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Proper message indicator directly under the row if editing an existing edge */}
                  {hasExistingEdge && (
                    <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 ml-9 w-fit">
                      An active relationship already exists. Saving will update it.
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={handleAddRow} 
              className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
            >
              + Add Another Link
            </button>
            
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={toggleBulkConnectModal} 
                className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 text-sm transition"
              >
                {loading ? "Saving..." : "Save Connections"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}