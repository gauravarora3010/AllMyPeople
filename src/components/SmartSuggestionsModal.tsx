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

// Maps specific string labels into logical algorithmic roles
const getRole = (label: string) => {
  const l = label.toLowerCase();
  if (["father", "mother", "parent", "step-father", "step-mother", "step-parent"].includes(l)) return "parent";
  if (["son", "daughter", "child", "step-son", "step-daughter", "step-child"].includes(l)) return "child";
  if (["husband", "wife", "spouse", "partner"].includes(l)) return "spouse";
  if (["brother", "sister", "sibling", "step-brother", "step-sister", "step-sibling"].includes(l)) return "sibling";
  if (["grandfather", "grandmother", "grandparent"].includes(l)) return "grandparent";
  if (["grandson", "granddaughter", "grandchild"].includes(l)) return "grandchild";
  if (["uncle", "aunt"].includes(l)) return "uncle_aunt";
  if (["nephew", "niece"].includes(l)) return "nephew_niece";
  if (["father-in-law", "mother-in-law", "parent-in-law"].includes(l)) return "parent_in_law";
  if (["son-in-law", "daughter-in-law", "child-in-law"].includes(l)) return "child_in_law";
  if (["brother-in-law", "sister-in-law", "sibling-in-law"].includes(l)) return "sibling_in_law";
  if (["cousin"].includes(l)) return "cousin";
  return "other";
};

// Strict inverse logic to guarantee roles never get flipped
const getInverseRole = (role: string) => {
  switch (role) {
    case "parent": return "child";
    case "child": return "parent";
    case "spouse": return "spouse";
    case "sibling": return "sibling";
    case "grandparent": return "grandchild";
    case "grandchild": return "grandparent";
    case "uncle_aunt": return "nephew_niece";
    case "nephew_niece": return "uncle_aunt";
    case "parent_in_law": return "child_in_law";
    case "child_in_law": return "parent_in_law";
    case "sibling_in_law": return "sibling_in_law";
    case "cousin": return "cousin";
    default: return "other";
  }
};

// Generates the proper default label based on Gender and Role
const getLabel = (role: string, sex: string) => {
   if (role === "parent") return sex === "Female" ? "Mother" : (sex === "Male" ? "Father" : "Parent");
   if (role === "child") return sex === "Female" ? "Daughter" : (sex === "Male" ? "Son" : "Child");
   if (role === "spouse") return sex === "Female" ? "Wife" : (sex === "Male" ? "Husband" : "Partner");
   if (role === "sibling") return sex === "Female" ? "Sister" : (sex === "Male" ? "Brother" : "Sibling");
   if (role === "grandparent") return sex === "Female" ? "Grandmother" : (sex === "Male" ? "Grandfather" : "Grandparent");
   if (role === "grandchild") return sex === "Female" ? "Granddaughter" : (sex === "Male" ? "Grandson" : "Grandchild");
   if (role === "uncle_aunt") return sex === "Female" ? "Aunt" : (sex === "Male" ? "Uncle" : "Uncle");
   if (role === "nephew_niece") return sex === "Female" ? "Niece" : (sex === "Male" ? "Nephew" : "Nephew");
   if (role === "parent_in_law") return sex === "Female" ? "Mother-in-law" : (sex === "Male" ? "Father-in-law" : "Parent-in-law");
   if (role === "child_in_law") return sex === "Female" ? "Daughter-in-law" : (sex === "Male" ? "Son-in-law" : "Child-in-law");
   if (role === "sibling_in_law") return sex === "Female" ? "Sister-in-law" : (sex === "Male" ? "Brother-in-law" : "Sibling-in-law");
   if (role === "cousin") return "Cousin";
   return "Friend";
};

const getCategory = (role: string) => {
    if (["parent", "child", "spouse", "sibling"].includes(role)) return "Immediate Family";
    if (["grandparent", "grandchild", "uncle_aunt", "nephew_niece", "cousin"].includes(role)) return "Extended Family";
    if (["parent_in_law", "child_in_law", "sibling_in_law"].includes(role)) return "In-Laws & Step Family";
    return "Social & Personal";
};

type Suggestion = {
  hash: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  label: string;
  reverseLabel: string;
  category: string;
  reason: string;
};

export default function SmartSuggestionsModal() {
  const { isSmartSuggestModalOpen, toggleSmartSuggestModal, currentGraphId, triggerRefresh } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedHashes, setSelectedHashes] = useState<string[]>([]);

  useEffect(() => {
    if (isSmartSuggestModalOpen && currentGraphId) {
      calculateSuggestions();
    } else {
      setSuggestions([]);
      setSelectedHashes([]);
    }
  }, [isSmartSuggestModalOpen, currentGraphId]);

  const calculateSuggestions = async () => {
    setLoading(true);
    
    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from('nodes').select('id, full_name, sex').eq('graph_id', currentGraphId),
      supabase.from('edges').select('*').eq('graph_id', currentGraphId)
    ]);

    const nodes = nodesRes.data || [];
    const edges = edgesRes.data || [];

    const getNode = (id: string) => nodes.find(n => String(n.id) === String(id));
    
    const edgeExists = (id1: string, id2: string) => {
      return edges.some(e => 
        (String(e.source) === String(id1) && String(e.target) === String(id2)) ||
        (String(e.source) === String(id2) && String(e.target) === String(id1))
      );
    };

    // 1. Map out internal logical relationships from the DB edges
    const relMap: Record<string, { parents: Set<string>, children: Set<string>, spouses: Set<string>, siblings: Set<string> }> = {};
    nodes.forEach(n => relMap[String(n.id)] = { parents: new Set(), children: new Set(), spouses: new Set(), siblings: new Set() });

    edges.forEach(e => {
        const s = String(e.source);
        const t = String(e.target);
        if (!relMap[s] || !relMap[t]) return;

        // DB Schema: label = Target's role to Source. reverse_label = Source's role to Target.
        const fwd = getRole(e.label); 
        const rev = getRole(e.reverse_label); 

        // Bi-directional mapping ensures we never confuse Parent/Child roles
        if (fwd === "parent" || rev === "child") { relMap[s].parents.add(t); relMap[t].children.add(s); }
        if (fwd === "child" || rev === "parent") { relMap[s].children.add(t); relMap[t].parents.add(s); }
        if (fwd === "spouse" || rev === "spouse") { relMap[s].spouses.add(t); relMap[t].spouses.add(s); }
        if (fwd === "sibling" || rev === "sibling") { relMap[s].siblings.add(t); relMap[t].siblings.add(s); }
    });

    const foundSuggestions: Suggestion[] = [];
    const seenHashes = new Set<string>();

    const addSuggestion = (sourceId: string, targetId: string, roleOfSourceToTarget: string, reason: string) => {
      if (sourceId === targetId) return; 
      if (edgeExists(sourceId, targetId)) return; 
      
      const hash = [sourceId, targetId].sort().join("-");
      if (seenHashes.has(hash)) return;
      seenHashes.add(hash);

      const n1 = getNode(sourceId);
      const n2 = getNode(targetId);
      if (!n1 || !n2) return;

      const revRole = roleOfSourceToTarget; 
      const fwdRole = getInverseRole(revRole); 

      // label = what Target is to Source
      const label = getLabel(fwdRole, n2.sex);
      // reverseLabel = what Source is to Target
      const reverseLabel = getLabel(revRole, n1.sex);
      
      const category = getCategory(fwdRole);

      foundSuggestions.push({
        hash, sourceId, targetId,
        sourceName: n1.full_name, targetName: n2.full_name,
        label, reverseLabel, category, reason
      });
    };

    // ========================================================
    // LOGIC ENGINE: TRIADIC CLOSURE RULES
    // ========================================================
    nodes.forEach(node => {
        const me = String(node.id);
        const my = relMap[me];

        // 1. Co-Parents -> Spouses
        my.children.forEach(childId => {
            relMap[childId].parents.forEach(coParentId => {
                if (coParentId !== me && !my.spouses.has(coParentId)) {
                    addSuggestion(me, coParentId, "spouse", `Because they both share ${getNode(childId)?.full_name} as a child.`);
                }
            });
        });

        // 2. Spouse's Child -> Child (Step-child)
        my.spouses.forEach(spouseId => {
            relMap[spouseId].children.forEach(childId => {
                if (!my.children.has(childId)) {
                    addSuggestion(me, childId, "parent", `Because ${getNode(spouseId)?.full_name} is ${node.full_name}'s partner, and ${getNode(childId)?.full_name} is their child.`);
                }
            });
        });

        // 3. Shared Parents -> Siblings
        my.parents.forEach(parentId => {
            relMap[parentId].children.forEach(siblingId => {
                if (siblingId !== me && !my.siblings.has(siblingId)) {
                    addSuggestion(me, siblingId, "sibling", `Because they both share ${getNode(parentId)?.full_name} as a parent.`);
                }
            });
        });

        // 4. Parent's Parent -> Grandparent
        my.parents.forEach(parentId => {
            relMap[parentId].parents.forEach(grandparentId => {
                addSuggestion(me, grandparentId, "grandchild", `Because ${getNode(parentId)?.full_name} is ${node.full_name}'s parent, and ${getNode(grandparentId)?.full_name} is their parent.`);
            });
        });

        // 5. Parent's Sibling -> Aunt/Uncle
        my.parents.forEach(parentId => {
            relMap[parentId].siblings.forEach(uncleId => {
                addSuggestion(me, uncleId, "nephew_niece", `Because ${getNode(parentId)?.full_name} is ${node.full_name}'s parent, and ${getNode(uncleId)?.full_name} is their sibling.`);
            });
        });

        // 6. Sibling's Child -> Nephew/Niece
        my.siblings.forEach(siblingId => {
            relMap[siblingId].children.forEach(niblingId => {
                addSuggestion(me, niblingId, "uncle_aunt", `Because ${getNode(siblingId)?.full_name} is ${node.full_name}'s sibling, and ${getNode(niblingId)?.full_name} is their child.`);
            });
        });

        // 7. Spouse's Parent -> Parent-in-law
        my.spouses.forEach(spouseId => {
            relMap[spouseId].parents.forEach(inLawId => {
                addSuggestion(me, inLawId, "child_in_law", `Because ${getNode(spouseId)?.full_name} is ${node.full_name}'s partner, and ${getNode(inLawId)?.full_name} is their parent.`);
            });
        });

        // 8. Sibling's Spouse -> Sibling-in-law
        my.siblings.forEach(siblingId => {
            relMap[siblingId].spouses.forEach(inLawId => {
                addSuggestion(me, inLawId, "sibling_in_law", `Because ${getNode(siblingId)?.full_name} is ${node.full_name}'s sibling, and ${getNode(inLawId)?.full_name} is their partner.`);
            });
        });

        // 9. Parent's Sibling's Child -> Cousin
        my.parents.forEach(parentId => {
            relMap[parentId].siblings.forEach(uncleId => {
                relMap[uncleId].children.forEach(cousinId => {
                    if (cousinId !== me) {
                        addSuggestion(me, cousinId, "cousin", `Because ${getNode(parentId)?.full_name} and ${getNode(uncleId)?.full_name} are siblings.`);
                    }
                });
            });
        });
    });

    setSuggestions(foundSuggestions);
    setSelectedHashes(foundSuggestions.map(s => s.hash)); 
    setLoading(false);
  };

  const toggleSelection = (hash: string) => {
    setSelectedHashes(prev => prev.includes(hash) ? prev.filter(h => h !== hash) : [...prev, hash]);
  };

  const updateSuggestion = (hash: string, field: 'label' | 'reverseLabel', value: string) => {
     setSuggestions(prev => prev.map(s => {
        if (s.hash !== hash) return s;
        const updated = { ...s, [field]: value };
        
        if (field === 'label') {
           for (const [cat, rels] of Object.entries(RELATIONSHIP_CATEGORIES)) {
               if (rels.includes(updated.label)) {
                   updated.category = cat;
                   break;
               }
           }
        }
        return updated;
     }));
  };

  const handleApprove = async () => {
    setLoading(true);
    const approved = suggestions.filter(s => selectedHashes.includes(s.hash));

    const promises = approved.map(s => {
      return supabase.from('edges').insert({
        graph_id: currentGraphId,
        source: s.sourceId,
        target: s.targetId,
        label: s.label,
        reverse_label: s.reverseLabel,
        category: s.category
      });
    });

    await Promise.all(promises);
    
    triggerRefresh();
    toggleSmartSuggestModal();
    setLoading(false);
  };

  if (!isSmartSuggestModalOpen) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] flex flex-col">
        
        <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">🪄 Smart Connections</h2>
            <p className="text-xs text-gray-500">We analyzed your tree and found some logical missing links!</p>
          </div>
          <button onClick={toggleSmartSuggestModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">Analyzing relationships...</div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <span className="text-4xl">🕵️‍♂️</span>
              <p className="text-gray-600 font-medium">No missing links found right now.</p>
              <p className="text-xs text-gray-400">Add more immediate family members and try again!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2 px-1 border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{suggestions.length} Suggestions Found</span>
                <button 
                  onClick={() => setSelectedHashes(selectedHashes.length === suggestions.length ? [] : suggestions.map(s => s.hash))}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  {selectedHashes.length === suggestions.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {suggestions.map((s) => {
                const isSelected = selectedHashes.includes(s.hash);
                return (
                  <div 
                    key={s.hash} 
                    className={`p-4 rounded-xl border transition-all ${isSelected ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-4">
                      
                      <div className="pt-1">
                        <input 
                           type="checkbox" 
                           checked={isSelected} 
                           onChange={() => toggleSelection(s.hash)}
                           className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500 cursor-pointer" 
                        />
                      </div>

                      <div className="flex-1">
                        <p className="text-base font-semibold text-gray-800">
                          {s.sourceName} &amp; {s.targetName}
                        </p>
                        <p className="text-xs font-semibold text-amber-700 mt-1 uppercase tracking-wide">
                          {s.targetName} is the {s.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 italic">
                          <span className="font-semibold text-gray-600">Why?</span> {s.reason}
                        </p>

                        {/* EDITABLE DROPDOWNS: Only visible when selected */}
                        {isSelected && (
                          <div className="mt-4 pt-3 border-t border-amber-200/60 grid grid-cols-2 gap-4 animate-fade-in">
                             <div>
                                <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                                  {s.targetName} is {s.sourceName}'s...
                                </label>
                                <select
                                  value={s.label}
                                  onChange={(e) => updateSuggestion(s.hash, 'label', e.target.value)}
                                  className="w-full text-sm p-2 border border-amber-200 rounded-md bg-white focus:ring-2 focus:ring-amber-400 outline-none shadow-sm"
                                >
                                  {CATEGORIES.filter(c => c !== "Other").map(category => (
                                    <optgroup key={category} label={category}>
                                      {RELATIONSHIP_CATEGORIES[category].map(rel => (
                                        <option key={rel} value={rel}>{rel}</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                             </div>
                             <div>
                                <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                                  {s.sourceName} is {s.targetName}'s...
                                </label>
                                <select
                                  value={s.reverseLabel}
                                  onChange={(e) => updateSuggestion(s.hash, 'reverseLabel', e.target.value)}
                                  className="w-full text-sm p-2 border border-amber-200 rounded-md bg-white focus:ring-2 focus:ring-amber-400 outline-none shadow-sm"
                                >
                                  {CATEGORIES.filter(c => c !== "Other").map(category => (
                                    <optgroup key={category} label={category}>
                                      {RELATIONSHIP_CATEGORIES[category].map(rel => (
                                        <option key={rel} value={rel}>{rel}</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100">
          <button onClick={toggleSmartSuggestModal} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm font-semibold transition">
            Close
          </button>
          {suggestions.length > 0 && (
            <button 
              onClick={handleApprove} 
              disabled={loading || selectedHashes.length === 0}
              className="px-6 py-2 bg-amber-500 text-white font-semibold rounded-md hover:bg-amber-600 text-sm transition shadow-sm disabled:opacity-50"
            >
              {loading ? "Approving..." : `Approve ${selectedHashes.length} Connections`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}