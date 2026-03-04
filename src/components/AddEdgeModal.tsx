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

// Relationships are now strictly sorted alphabetically
const RELATIONSHIPS: Record<string, string[]> = {
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

export default function AddEdgeModal() {
  const { isEdgeModalOpen, toggleEdgeModal, currentGraphId, selectedNodeId, triggerRefresh } = useStore();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [targetId, setTargetId] = useState("");
  const [category, setCategory] = useState("Immediate Family");
  const [label, setLabel] = useState(RELATIONSHIPS["Immediate Family"][0]);
  const [reverseLabel, setReverseLabel] = useState(RELATIONSHIPS["Immediate Family"][0]);
  
  const [customLabel, setCustomLabel] = useState("");
  const [customReverseLabel, setCustomReverseLabel] = useState("");

  const [existingEdgeId, setExistingEdgeId] = useState<string | null>(null);

  useEffect(() => {
    if (isEdgeModalOpen && currentGraphId) {
      const fetchNodes = async () => {
        const { data } = await supabase.from('nodes').select('id, full_name').eq('graph_id', currentGraphId);
        if (data) {
          // Sort alphabetically
          const sortedData = data.sort((a, b) => a.full_name.localeCompare(b.full_name));
          setNodes(sortedData);
        }
      };
      fetchNodes();
    } else {
      setTargetId("");
      setExistingEdgeId(null);
      setCategory("Immediate Family");
      setLabel(RELATIONSHIPS["Immediate Family"][0]);
      setReverseLabel(RELATIONSHIPS["Immediate Family"][0]);
      setCustomLabel("");
      setCustomReverseLabel("");
    }
  }, [isEdgeModalOpen, currentGraphId]);

  useEffect(() => {
    const checkExistingEdge = async () => {
      if (!targetId || !selectedNodeId || !currentGraphId) {
        setExistingEdgeId(null);
        return;
      }

      const { data, error } = await supabase
        .from('edges')
        .select('*')
        .eq('graph_id', currentGraphId)
        .in('source', [selectedNodeId, targetId])
        .in('target', [selectedNodeId, targetId]);

      if (!error && data) {
        const edge = data.find(e => 
          (e.source === selectedNodeId && e.target === targetId) || 
          (e.source === targetId && e.target === selectedNodeId)
        );

        if (edge) {
          setExistingEdgeId(edge.id);
          const edgeCat = edge.category || "Immediate Family";
          setCategory(edgeCat);

          let fwdLabel = edge.label;
          let revLabel = edge.reverse_label;

          if (edge.source === targetId) {
            fwdLabel = edge.reverse_label;
            revLabel = edge.label;
          }

          const catList = RELATIONSHIPS[edgeCat] || [];
          if (catList.includes(fwdLabel)) {
            setLabel(fwdLabel);
            setCustomLabel("");
          } else {
            setLabel("Other");
            setCustomLabel(fwdLabel || "");
          }

          if (catList.includes(revLabel)) {
            setReverseLabel(revLabel);
            setCustomReverseLabel("");
          } else {
            setReverseLabel("Other");
            setCustomReverseLabel(revLabel || "");
          }
        } else {
          setExistingEdgeId(null);
          setCategory("Immediate Family");
          setLabel(RELATIONSHIPS["Immediate Family"][0]);
          setReverseLabel(RELATIONSHIPS["Immediate Family"][0]);
          setCustomLabel("");
          setCustomReverseLabel("");
        }
      }
    };

    checkExistingEdge();
  }, [targetId, selectedNodeId, currentGraphId]);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    if (cat !== "Other") {
      setLabel(RELATIONSHIPS[cat][0]);
      setReverseLabel(RELATIONSHIPS[cat][0]);
    } else {
      setLabel("Other");
      setReverseLabel("Other");
    }
  };

  if (!isEdgeModalOpen) return null;

  const availableTargets = nodes.filter(n => String(n.id) !== selectedNodeId);
  const targetName = nodes.find(n => String(n.id) === targetId)?.full_name || "Target Person";
  const sourceName = nodes.find(n => String(n.id) === selectedNodeId)?.full_name || "Selected Person";

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !selectedNodeId) return;
    setLoading(true);

    const finalLabel = label === "Other" ? customLabel : label;
    const finalReverseLabel = reverseLabel === "Other" ? customReverseLabel : reverseLabel;

    const payload = {
      graph_id: currentGraphId,
      source: selectedNodeId, 
      target: targetId,
      category: category, 
      label: finalLabel,
      reverse_label: finalReverseLabel
    };

    let response;
    
    if (existingEdgeId) {
      response = await supabase.from("edges").update(payload).eq("id", existingEdgeId);
    } else {
      response = await supabase.from("edges").insert(payload);
    }

    if (response.error) {
      alert("Error saving relationship: " + response.error.message);
    } else {
      triggerRefresh();
      toggleEdgeModal();
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {existingEdgeId ? `Edit Relationship` : `Create Relationship`}
          </h2>
          <button onClick={toggleEdgeModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleConnect} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Connect <span className="text-blue-600">{sourceName}</span> to...</label>
            <select required value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 bg-white">
              <option value="" disabled>-- Choose someone --</option>
              {availableTargets.map(n => <option key={n.id} value={n.id}>{n.full_name}</option>)}
            </select>
          </div>

          {targetId && existingEdgeId && (
            <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
              An active relationship already exists. Changes here will update the current relationship.
            </div>
          )}

          {targetId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship Category</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat} type="button" onClick={() => handleCategorySelect(cat)}
                    className={`py-2 px-1 text-sm rounded-md border transition leading-tight ${category === cat ? "bg-blue-50 border-blue-500 text-blue-700 font-bold" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {targetId && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  <span className="font-bold text-gray-800">{targetName}</span> is <span className="font-bold text-gray-800">{sourceName}'s</span>:
                </label>
                {category === "Other" ? (
                  <input type="text" required placeholder="e.g. Mentor" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                ) : (
                  <select value={label} onChange={(e) => setLabel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                    {RELATIONSHIPS[category].map(rel => <option key={rel} value={rel}>{rel}</option>)}
                    <option value="Other">Custom (Type your own)</option>
                  </select>
                )}
                {label === "Other" && category !== "Other" && (
                  <input type="text" required placeholder="Custom relationship" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm mt-2" />
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  <span className="font-bold text-gray-800">{sourceName}</span> is <span className="font-bold text-gray-800">{targetName}'s</span>:
                </label>
                {category === "Other" ? (
                  <input type="text" required placeholder="e.g. Mentee" value={customReverseLabel} onChange={(e) => setCustomReverseLabel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                ) : (
                  <select value={reverseLabel} onChange={(e) => setReverseLabel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                    {RELATIONSHIPS[category].map(rel => <option key={rel} value={rel}>{rel}</option>)}
                    <option value="Other">Custom (Type your own)</option>
                  </select>
                )}
                {reverseLabel === "Other" && category !== "Other" && (
                  <input type="text" required placeholder="Custom reverse relationship" value={customReverseLabel} onChange={(e) => setCustomReverseLabel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm mt-2" />
                )}
              </div>

            </div>
          )}

          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={toggleEdgeModal} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">Cancel</button>
            <button type="submit" disabled={loading || !targetId} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Saving..." : (existingEdgeId ? "Save Changes" : "Save Relationship")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}