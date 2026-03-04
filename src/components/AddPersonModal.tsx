import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

export default function AddPersonModal() {
  const { 
    isAddPersonModalOpen, 
    toggleAddPersonModal, 
    currentGraphId, 
    setSelectedNodeId, 
    openNodeModal,
    setDraftName 
  } = useStore();
  
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [duplicate, setDuplicate] = useState<any | null>(null);

  useEffect(() => {
    if (!isAddPersonModalOpen) {
      setName("");
      setDuplicate(null);
      setLoading(false);
    }
  }, [isAddPersonModalOpen]);

  if (!isAddPersonModalOpen) return null;

  // STEP 1: Direct Database Validation 
  const handleInitialSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const cleanName = name.trim();
    if (!cleanName) return;

    if (!currentGraphId) {
      alert("Error: Graph ID is missing. Please select or create a graph first.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("nodes")
        .select("id, full_name, sex")
        .eq("graph_id", currentGraphId)
        .ilike("full_name", cleanName);

      if (error) {
        alert("Database Error during validation: " + error.message);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setDuplicate(data[0]); 
        setLoading(false);
        return; 
      }

      // If valid, pass name to details modal!
      proceedWithAdd();
      setLoading(false);

    } catch (err) {
      alert("An unexpected error occurred during validation.");
      setLoading(false);
    }
  };

  // STEP 2: Pass data to NodeDetailsModal (NO DATABASE INSERTION HERE)
  const proceedWithAdd = () => {
    setDraftName(name.trim());
    toggleAddPersonModal(); 
    openNodeModal("add"); // Open detailed form in ADD mode
  };

  // STEP 3: Edit the existing person instead
  const handleEditExisting = () => {
    if (duplicate) {
      setSelectedNodeId(duplicate.id);
      setDraftName(""); // Clear draft just in case
      toggleAddPersonModal(); 
      openNodeModal("edit");  
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
        <div className="flex justify-between items-center mb-6 border-b pb-3 border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Add New Person</h2>
          <button onClick={toggleAddPersonModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        {!duplicate ? (
          /* DEFAULT VIEW: Type a name */
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInitialSubmit();
                  }
                }}
                placeholder="e.g. Jane Doe"
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                autoFocus
                required
              />
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-gray-50">
              <button
                type="button"
                onClick={toggleAddPersonModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => handleInitialSubmit()}
                disabled={loading || !name.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? "Checking..." : "Next: Add details"}
              </button>
            </div>
          </div>
        ) : (
          /* DUPLICATE FOUND VIEW */
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <p className="font-bold text-base mb-1">Wait! Duplicate Found</p>
              <p><strong>{duplicate.full_name}</strong> {duplicate.sex && duplicate.sex !== "Other" ? `(${duplicate.sex})` : ""} already exists in your graph.</p>
            </div>
            
            <p className="text-sm text-gray-600">Would you like to edit the existing person, or create a brand new entry with the exact same name?</p>

            <div className="flex flex-col gap-3 mt-2">
              <button
                type="button"
                onClick={handleEditExisting}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition shadow-sm"
              >
                Edit Existing Person
              </button>
              <button
                type="button"
                onClick={proceedWithAdd}
                disabled={loading}
                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add New Person Anyway"}
              </button>
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-800 transition mt-1 underline"
              >
                Go back and change name
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}