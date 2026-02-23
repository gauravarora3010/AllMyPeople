import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

const CATEGORIES = ["Family", "Social", "Professional", "Other"];

const RELATIONSHIPS: Record<string, string[]> = {
  Family: [
    "Father", "Mother", "Son", "Daughter", "Brother", "Sister", "Grandfather", "Grandmother", 
    "Grandson", "Granddaughter", "Husband", "Wife", "Partner", "Fiancé", "Fiancée", "Uncle", 
    "Aunt", "Nephew", "Niece", "Cousin", "Father-in-law", "Mother-in-law", "Brother-in-law", 
    "Sister-in-law", "Son-in-law", "Daughter-in-law", "Stepfather", "Stepmother", "Stepson", "Stepdaughter"
  ],
  Social: [
    "Friend", "Best Friend", "Childhood Friend", "Acquaintance", "Neighbor", 
    "Roommate", "Enemy", "Rival", "Ex-Partner", "Ex-Spouse"
  ],
  Professional: [
    "Colleague", "Boss", "Manager", "Subordinate", "Mentor", "Mentee", 
    "Client", "Vendor", "Partner (Business)", "Teacher", "Student", "Classmate"
  ]
};

export default function AddEdgeModal() {
  const { isEdgeModalOpen, toggleEdgeModal, currentGraphId, selectedNodeId, triggerRefresh } = useStore();
  const [nodes, setNodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [targetId, setTargetId] = useState("");
  const [category, setCategory] = useState("Family");
  const [label, setLabel] = useState("Friend");
  const [reverseLabel, setReverseLabel] = useState("Friend");
  
  // Custom text inputs if "Other" is selected
  const [customLabel, setCustomLabel] = useState("");
  const [customReverseLabel, setCustomReverseLabel] = useState("");

  useEffect(() => {
    if (isEdgeModalOpen && currentGraphId) {
      const fetchNodes = async () => {
        const { data } = await supabase.from('nodes').select('id, full_name').eq('graph_id', currentGraphId);
        if (data) setNodes(data);
      };
      fetchNodes();
    }
  }, [isEdgeModalOpen, currentGraphId]);

  // When category changes, reset the labels to the first item in the new category
  useEffect(() => {
    if (category !== "Other") {
      setLabel(RELATIONSHIPS[category][0]);
      setReverseLabel(RELATIONSHIPS[category][0]);
    } else {
      setLabel("Other");
      setReverseLabel("Other");
    }
  }, [category]);

  if (!isEdgeModalOpen) return null;

  const availableTargets = nodes.filter(n => n.id !== selectedNodeId);
  const targetName = nodes.find(n => n.id === targetId)?.full_name || "Target Person";

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !selectedNodeId) return;
    setLoading(true);

    const finalLabel = label === "Other" ? customLabel : label;
    const finalReverseLabel = reverseLabel === "Other" ? customReverseLabel : reverseLabel;

    const { error } = await supabase.from("edges").insert({
      graph_id: currentGraphId,
      source: selectedNodeId,
      target: targetId,
      category: category,
      label: finalLabel,
      reverse_label: finalReverseLabel
    });

    if (error) alert("Error creating connection: " + error.message);
    else {
      triggerRefresh();
      toggleEdgeModal();
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Create Connection</h2>
          <button onClick={toggleEdgeModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleConnect} className="flex flex-col gap-5">
          {/* Target Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select Person</label>
            <select required value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 bg-white">
              <option value="" disabled>-- Choose someone --</option>
              {availableTargets.map(n => <option key={n.id} value={n.id}>{n.full_name}</option>)}
            </select>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Relationship Category</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat} type="button" onClick={() => setCategory(cat)}
                  className={`py-2 text-sm rounded-md border transition ${category === cat ? "bg-blue-50 border-blue-500 text-blue-700 font-bold" : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Bidirectional Labels */}
          {targetId && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              
              {/* Forward Label */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  <span className="font-bold text-gray-800">{targetName}</span> is my:
                </label>
                {category === "Other" ? (
                  <input type="text" required placeholder="e.g. Gym Buddy" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
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

              {/* Reverse Label */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  I am <span className="font-bold text-gray-800">{targetName}'s</span>:
                </label>
                {category === "Other" ? (
                  <input type="text" required placeholder="e.g. Gym Buddy" value={customReverseLabel} onChange={(e) => setCustomReverseLabel(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
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
            <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 text-sm">
              {loading ? "Saving..." : "Save Connection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}