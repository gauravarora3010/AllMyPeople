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
  
  const [activeTab, setActiveTab] = useState<"individual" | "group">("individual");
  const [loading, setLoading] = useState(false);
  const [availableNodes, setAvailableNodes] = useState<any[]>([]);
  const [existingEdges, setExistingEdges] = useState<any[]>([]);
  const [sourceNodeName, setSourceNodeName] = useState("Unknown");

  // ==========================================
  // STATE: TAB 1 (Individual Row-by-Row)
  // ==========================================
  const [rows, setRows] = useState([
    { id: 1, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" },
    { id: 2, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" },
    { id: 3, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" }
  ]);

  // ==========================================
  // STATE: TAB 2 (Group Connect)
  // ==========================================
  const [groupCategory, setGroupCategory] = useState("Social & Personal");
  const [groupLabel, setGroupLabel] = useState("Friend");
  const [groupReverseLabel, setGroupReverseLabel] = useState("Friend");
  const [groupCustomLabel, setGroupCustomLabel] = useState("");
  const [groupCustomReverseLabel, setGroupCustomReverseLabel] = useState("");
  const [selectedGroupTargets, setSelectedGroupTargets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // ==========================================
  // DATA FETCHING & RESET
  // ==========================================
  useEffect(() => {
    async function fetchData() {
      if (isBulkConnectModalOpen && currentGraphId && selectedNodeId) {
        const [nodesRes, edgesRes] = await Promise.all([
          supabase.from('nodes').select('id, full_name').eq('graph_id', currentGraphId),
          supabase.from('edges').select('*').eq('graph_id', currentGraphId).or(`source.eq.${selectedNodeId},target.eq.${selectedNodeId}`)
        ]);

        if (nodesRes.data) {
          const sortedData = nodesRes.data.sort((a, b) => a.full_name.localeCompare(b.full_name));
          setAvailableNodes(sortedData.filter(n => String(n.id) !== selectedNodeId));
          const source = nodesRes.data.find(n => String(n.id) === selectedNodeId);
          if (source) setSourceNodeName(source.full_name);
        }
        
        if (edgesRes.data) {
          setExistingEdges(edgesRes.data);
        }
      } else {
        // Reset Everything on close
        setActiveTab("individual");
        setRows([
          { id: 1, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" },
          { id: 2, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" },
          { id: 3, targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" }
        ]);
        setExistingEdges([]);
        setGroupCategory("Social & Personal");
        setGroupLabel("Friend");
        setGroupReverseLabel("Friend");
        setGroupCustomLabel("");
        setGroupCustomReverseLabel("");
        setSelectedGroupTargets([]);
        setSearchQuery("");
      }
    }
    fetchData();
  }, [isBulkConnectModalOpen, currentGraphId, selectedNodeId]);

  if (!isBulkConnectModalOpen) return null;

  // ==========================================
  // HANDLERS: TAB 1 (Individual)
  // ==========================================
  const handleAddRow = () => setRows([...rows, { id: Date.now(), targetId: "", label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: "" }]);
  const handleRemoveRow = (id: number) => setRows(rows.filter(row => row.id !== id));
  const handleChange = (id: number, field: keyof typeof rows[0], value: string) => setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));

  const handleTargetChange = (id: number, newTargetId: string) => {
    const existingEdge = existingEdges.find(e => String(e.source) === newTargetId || String(e.target) === newTargetId);
    if (existingEdge) {
      let fwdLabel = existingEdge.label;
      let revLabel = existingEdge.reverse_label;
      if (String(existingEdge.source) === newTargetId) {
         fwdLabel = existingEdge.reverse_label;
         revLabel = existingEdge.label;
      }
      let isFwdCustom = true;
      let isRevCustom = true;
      for (const rels of Object.values(RELATIONSHIP_CATEGORIES)) {
        if (rels.includes(fwdLabel)) isFwdCustom = false;
        if (rels.includes(revLabel)) isRevCustom = false;
      }
      setRows(rows.map(r => r.id === id ? {
        ...r, targetId: newTargetId, label: isFwdCustom ? "Other" : fwdLabel, customLabel: isFwdCustom ? fwdLabel : "", reverseLabel: isRevCustom ? "Other" : revLabel, customReverseLabel: isRevCustom ? revLabel : ""
      } : r));
    } else {
      setRows(rows.map(r => r.id === id ? {
        ...r, targetId: newTargetId, label: "Friend", reverseLabel: "Friend", customLabel: "", customReverseLabel: ""
      } : r));
    }
  };

  // ==========================================
  // HANDLERS: TAB 2 (Group)
  // ==========================================
  const handleGroupCategoryChange = (cat: string) => {
    setGroupCategory(cat);
    if (cat !== "Other") {
      setGroupLabel(RELATIONSHIP_CATEGORIES[cat][0]);
      setGroupReverseLabel(RELATIONSHIP_CATEGORIES[cat][0]);
    } else {
      setGroupLabel("Other");
      setGroupReverseLabel("Other");
    }
  };

  const toggleGroupTarget = (targetId: string) => {
    setSelectedGroupTargets(prev => 
      prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedGroupTargets.length === filteredNodes.length) {
      setSelectedGroupTargets([]); // Deselect all
    } else {
      setSelectedGroupTargets(filteredNodes.map(n => String(n.id))); // Select all currently filtered
    }
  };

  const filteredNodes = availableNodes.filter(n => n.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

  // ==========================================
  // MASTER SAVE HANDLER
  // ==========================================
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGraphId || !selectedNodeId) return;

    setLoading(true);

    try {
      // FIX: Changed from Promise<any>[] to any[] to satisfy Supabase's PostgrestFilterBuilder types
      let promises: any[] = [];

      // SAVE LOGIC: TAB 1 (Individual)
      if (activeTab === "individual") {
        const validRows = rows.filter(row => row.targetId.trim() !== "");
        if (validRows.length === 0) {
          alert("Please select at least one person to connect to.");
          setLoading(false);
          return;
        }

        promises = validRows.map(row => {
          let foundCategory = "Other";
          if (row.label !== "Other") {
            for (const [categoryName, relationships] of Object.entries(RELATIONSHIP_CATEGORIES)) {
              if (relationships.includes(row.label)) {
                foundCategory = categoryName; break;
              }
            }
          }
          const finalLabel = row.label === "Other" ? row.customLabel : row.label;
          const finalReverseLabel = row.reverseLabel === "Other" ? row.customReverseLabel : row.reverseLabel;

          const payload = {
            graph_id: currentGraphId, source: selectedNodeId, target: row.targetId,
            label: finalLabel, reverse_label: finalReverseLabel, category: foundCategory
          };

          const existingEdge = existingEdges.find(e => String(e.source) === row.targetId || String(e.target) === row.targetId);
          if (existingEdge) return supabase.from('edges').update(payload).eq('id', existingEdge.id);
          else return supabase.from('edges').insert(payload);
        });
      } 
      
      // SAVE LOGIC: TAB 2 (Group)
      else {
        if (selectedGroupTargets.length === 0) {
          alert("Please select at least one person from the list.");
          setLoading(false);
          return;
        }

        const finalLabel = groupLabel === "Other" ? groupCustomLabel : groupLabel;
        const finalReverseLabel = groupReverseLabel === "Other" ? groupCustomReverseLabel : groupReverseLabel;

        promises = selectedGroupTargets.map(targetId => {
          const payload = {
            graph_id: currentGraphId, source: selectedNodeId, target: targetId,
            label: finalLabel, reverse_label: finalReverseLabel, category: groupCategory
          };

          const existingEdge = existingEdges.find(e => String(e.source) === targetId || String(e.target) === targetId);
          if (existingEdge) return supabase.from('edges').update(payload).eq('id', existingEdge.id);
          else return supabase.from('edges').insert(payload);
        });
      }

      await Promise.all(promises);
      triggerRefresh();
      toggleBulkConnectModal();

    } catch (err: any) {
      alert("Error saving connections: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if any selected group targets will overwrite an existing relationship
  const hasOverwritingTargets = activeTab === "group" && selectedGroupTargets.some(targetId => 
    existingEdges.some(e => String(e.source) === targetId || String(e.target) === targetId)
  );

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Bulk Connect: <span className="text-blue-600">{sourceNodeName}</span></h2>
            <p className="text-xs text-gray-500 mt-1">Quickly link {sourceNodeName} to multiple people at once.</p>
          </div>
          <button onClick={toggleBulkConnectModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        {/* TAB TOGGLES */}
        <div className="flex border-b border-gray-200 mb-4">
          <button 
            onClick={() => setActiveTab("individual")}
            className={`py-2 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'individual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            📝 Row-by-Row
          </button>
          <button 
            onClick={() => setActiveTab("group")}
            className={`py-2 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'group' ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            👥 Group Connect
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          
          {/* ========================================= */}
          {/* TAB 1: INDIVIDUAL ROW-BY-ROW VIEW           */}
          {/* ========================================= */}
          {activeTab === "individual" && (
            <div className="flex flex-col flex-1 overflow-hidden animate-fade-in">
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
                          <select value={row.targetId} onChange={(e) => handleTargetChange(row.id, e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                            <option value="">-- Select Person --</option>
                            {availableNodes.map(node => <option key={node.id} value={node.id}>{node.full_name}</option>)}
                          </select>
                        </div>
                        
                        <div className="w-52 flex flex-col gap-2">
                          <select value={row.label} onChange={(e) => handleChange(row.id, "label", e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                            {CATEGORIES.filter(c => c !== "Other").map(category => (
                              <optgroup key={category} label={category}>
                                {RELATIONSHIP_CATEGORIES[category as keyof typeof RELATIONSHIP_CATEGORIES].map(rel => <option key={rel} value={rel}>{rel}</option>)}
                              </optgroup>
                            ))}
                            <option value="Other">Custom (Type your own)</option>
                          </select>
                          {row.label === "Other" && (
                            <input type="text" required placeholder="Type relationship..." value={row.customLabel} onChange={(e) => handleChange(row.id, "customLabel", e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm shadow-inner" />
                          )}
                        </div>

                        <div className="w-52 flex flex-col gap-2">
                          <select value={row.reverseLabel} onChange={(e) => handleChange(row.id, "reverseLabel", e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                            {CATEGORIES.filter(c => c !== "Other").map(category => (
                              <optgroup key={category} label={category}>
                                {RELATIONSHIP_CATEGORIES[category as keyof typeof RELATIONSHIP_CATEGORIES].map(rel => <option key={rel} value={rel}>{rel}</option>)}
                              </optgroup>
                            ))}
                            <option value="Other">Custom (Type your own)</option>
                          </select>
                          {row.reverseLabel === "Other" && (
                            <input type="text" required placeholder="Type relationship..." value={row.customReverseLabel} onChange={(e) => handleChange(row.id, "customReverseLabel", e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm shadow-inner" />
                          )}
                        </div>

                        <button type="button" onClick={() => handleRemoveRow(row.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition mt-0.5" title="Remove Row">🗑️</button>
                      </div>

                      {hasExistingEdge && (
                        <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200 ml-9 w-fit">
                          An active relationship already exists. Saving will update it.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex justify-start">
                <button type="button" onClick={handleAddRow} className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition">+ Add Another Link</button>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TAB 2: GROUP CONNECT VIEW                   */}
          {/* ========================================= */}
          {activeTab === "group" && (
            <div className="flex flex-col flex-1 overflow-hidden animate-fade-in gap-4">
              
              {/* Step 1: Define the relationship globally */}
              <div className="bg-pink-50 border border-pink-100 p-4 rounded-xl flex items-start gap-4 shadow-sm">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-pink-800 uppercase tracking-wider mb-2">1. Select Category</label>
                  <select value={groupCategory} onChange={(e) => handleGroupCategoryChange(e.target.value)} className="w-full border border-pink-200 rounded-md p-2.5 text-sm bg-white focus:ring-2 focus:ring-pink-400 outline-none">
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs font-bold text-pink-800 uppercase tracking-wider mb-2">{sourceNodeName} is their...</label>
                  {groupCategory === "Other" ? (
                    <input type="text" required placeholder="e.g. Mentor" value={groupCustomLabel} onChange={(e) => setGroupCustomLabel(e.target.value)} className="w-full border border-pink-200 rounded-md p-2.5 text-sm" />
                  ) : (
                    <select value={groupLabel} onChange={(e) => setGroupLabel(e.target.value)} className="w-full border border-pink-200 rounded-md p-2.5 text-sm bg-white">
                      {RELATIONSHIP_CATEGORIES[groupCategory].map(rel => <option key={rel} value={rel}>{rel}</option>)}
                      <option value="Other">Custom</option>
                    </select>
                  )}
                  {groupLabel === "Other" && groupCategory !== "Other" && (
                    <input type="text" required placeholder="Type custom..." value={groupCustomLabel} onChange={(e) => setGroupCustomLabel(e.target.value)} className="w-full border border-pink-200 rounded-md p-2 text-sm mt-2" />
                  )}
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-bold text-pink-800 uppercase tracking-wider mb-2">They are {sourceNodeName}'s...</label>
                  {groupCategory === "Other" ? (
                    <input type="text" required placeholder="e.g. Mentee" value={groupCustomReverseLabel} onChange={(e) => setGroupCustomReverseLabel(e.target.value)} className="w-full border border-pink-200 rounded-md p-2.5 text-sm" />
                  ) : (
                    <select value={groupReverseLabel} onChange={(e) => setGroupReverseLabel(e.target.value)} className="w-full border border-pink-200 rounded-md p-2.5 text-sm bg-white">
                      {RELATIONSHIP_CATEGORIES[groupCategory].map(rel => <option key={rel} value={rel}>{rel}</option>)}
                      <option value="Other">Custom</option>
                    </select>
                  )}
                  {groupReverseLabel === "Other" && groupCategory !== "Other" && (
                    <input type="text" required placeholder="Type custom..." value={groupCustomReverseLabel} onChange={(e) => setGroupCustomReverseLabel(e.target.value)} className="w-full border border-pink-200 rounded-md p-2 text-sm mt-2" />
                  )}
                </div>
              </div>

              {/* Step 2: Select Targets */}
              <div className="flex flex-col flex-1 overflow-hidden border border-gray-200 rounded-xl">
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">2. Select People</span>
                    <span className="text-sm font-medium text-blue-600">{selectedGroupTargets.length} selected</span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <input 
                      type="text" 
                      placeholder="Search people..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border border-gray-300 rounded-full px-4 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48"
                    />
                    <button type="button" onClick={toggleSelectAll} className="text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-300 px-3 py-1.5 rounded-md shadow-sm transition">
                      {selectedGroupTargets.length === filteredNodes.length && filteredNodes.length > 0 ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 bg-white grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredNodes.map(node => {
                    const isSelected = selectedGroupTargets.includes(String(node.id));
                    const existingEdge = existingEdges.find(e => String(e.source) === String(node.id) || String(e.target) === String(node.id));
                    
                    let existingLabel = "";
                    if (existingEdge) {
                       existingLabel = String(existingEdge.source) === String(node.id) ? existingEdge.reverse_label : existingEdge.label;
                    }

                    return (
                      <div 
                        key={node.id} 
                        onClick={() => toggleGroupTarget(String(node.id))}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      >
                        <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 pointer-events-none" />
                        <div className="flex flex-col truncate">
                          <span className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>{node.full_name}</span>
                          {existingLabel && (
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide truncate">Currently: {existingLabel}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredNodes.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-400 text-sm font-medium">No people match your search.</div>
                  )}
                </div>
              </div>

              {/* Overwrite Warning Banner */}
              {hasOverwritingTargets && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-fade-in shadow-sm">
                  <span>⚠️</span> Some selected people already have active relationships. Saving will overwrite them with this new relationship.
                </div>
              )}

            </div>
          )}

          {/* ========================================= */}
          {/* COMMON FOOTER                               */}
          {/* ========================================= */}
          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
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
              className={`px-6 py-2 text-white font-semibold rounded-md text-sm transition shadow-sm disabled:opacity-50 ${activeTab === 'group' ? 'bg-pink-600 hover:bg-pink-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {loading ? "Saving..." : "Save Connections"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}