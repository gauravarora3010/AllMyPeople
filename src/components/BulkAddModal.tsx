import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

export default function BulkAddModal() {
  const { isBulkAddModalOpen, toggleBulkAddModal, currentGraphId, userId, triggerRefresh } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]); // Array of { full_name, sex }
  
  const [rows, setRows] = useState([
    { id: 1, name: "", sex: "Other" },
    { id: 2, name: "", sex: "Other" },
    { id: 3, name: "", sex: "Other" },
    { id: 4, name: "", sex: "Other" },
    { id: 5, name: "", sex: "Other" }
  ]);

  useEffect(() => {
    if (!isBulkAddModalOpen) {
      setRows([
        { id: 1, name: "", sex: "Other" },
        { id: 2, name: "", sex: "Other" },
        { id: 3, name: "", sex: "Other" },
        { id: 4, name: "", sex: "Other" },
        { id: 5, name: "", sex: "Other" }
      ]);
      setDuplicates([]);
      setLoading(false);
    }
  }, [isBulkAddModalOpen]);

  if (!isBulkAddModalOpen) return null;

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now(), name: "", sex: "Other" }]);
  };

  const handleRemoveRow = (id: number) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleChange = (id: number, field: string, value: string) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const getValidRows = () => rows.filter(r => r.name.trim() !== "");

  // Check for duplicates locally to ensure perfect case-insensitive matching
  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGraphId) return;

    const validRows = getValidRows();
    if (validRows.length === 0) {
      alert("Please enter at least one name.");
      return;
    }

    setLoading(true);

    // Fetch all nodes to do a flawless JS-based comparison
    const { data } = await supabase
      .from("nodes")
      .select("full_name, sex")
      .eq("graph_id", currentGraphId);

    if (data) {
      const inputNamesLower = validRows.map(r => r.name.trim().toLowerCase());
      
      // Find all records in DB that match any input name
      const foundDuplicates = data.filter(d => 
        inputNamesLower.includes(d.full_name.toLowerCase())
      );
      
      if (foundDuplicates.length > 0) {
        // Remove exact duplicates from the list (if they entered "John" twice)
        const uniqueDuplicates = Array.from(
          new Map(foundDuplicates.map(item => [item.full_name.toLowerCase(), item])).values()
        );
        
        setDuplicates(uniqueDuplicates); 
        setLoading(false);
        return;
      }
    }

    await proceedWithAdd(validRows);
  };

  const proceedWithAdd = async (rowsToInsert: any[]) => {
    setLoading(true);
    
    const payload = rowsToInsert.map(r => ({
      graph_id: currentGraphId,
      full_name: r.name.trim(),
      sex: r.sex,
      layout_x: (Math.random() * 20) - 10,
      layout_y: (Math.random() * 20) - 10,
      created_by: userId
    }));

    const { error } = await supabase.from("nodes").insert(payload);

    if (error) {
      alert("Error adding people: " + error.message);
    } else {
      triggerRefresh();
      toggleBulkAddModal();
    }
    
    setLoading(false);
  };

  const handleSkipDuplicates = () => {
    const duplicatesLower = duplicates.map(d => d.full_name.toLowerCase());
    const nonDuplicateRows = getValidRows().filter(r => !duplicatesLower.includes(r.name.trim().toLowerCase()));
    
    if (nonDuplicateRows.length === 0) {
      alert("All entered names were existing duplicates. Nothing new to add!");
      toggleBulkAddModal();
      return;
    }
    
    proceedWithAdd(nonDuplicateRows);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Bulk Add People</h2>
            <p className="text-xs text-gray-500">Quickly add multiple people to your graph. Empty rows are ignored.</p>
          </div>
          <button onClick={toggleBulkAddModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        {duplicates.length === 0 ? (
          /* DEFAULT VIEW: Table input */
          <form onSubmit={handleInitialSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex px-8 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
               <div className="flex-1">Full Name</div>
               <div className="w-40 ml-3">Gender</div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
              {rows.map((row, index) => (
                <div key={row.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="text-gray-400 font-mono text-sm w-6 text-center">{index + 1}.</span>
                  
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={row.name}
                    onChange={(e) => handleChange(row.id, "name", e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  
                  <select 
                    value={row.sex} 
                    onChange={(e) => handleChange(row.id, "sex", e.target.value)}
                    className="w-40 border border-gray-300 rounded-md p-2 text-sm bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>

                  <button 
                    type="button" 
                    onClick={() => handleRemoveRow(row.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition"
                    title="Remove Row"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={handleAddRow} 
                className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
              >
                + Add Another Row
              </button>
              
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={toggleBulkAddModal} 
                  className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 text-sm transition disabled:opacity-50"
                >
                  {loading ? "Checking..." : "Add People"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* DUPLICATE WARNING VIEW */
          <div className="flex flex-col gap-4 flex-1">
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <h3 className="font-bold text-lg mb-2">Wait! Duplicates Found</h3>
              <p className="text-sm mb-3">The following people already exist in your graph. What would you like to do?</p>
              
              {/* Added Gender display here! */}
              <ul className="list-disc list-inside text-sm bg-white/50 p-3 rounded-md border border-amber-100 font-semibold h-max max-h-40 overflow-y-auto">
                {duplicates.map(d => (
                  <li key={d.full_name}>
                    {d.full_name} <span className="font-normal text-amber-700 opacity-80">({d.sex})</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <button
                onClick={handleSkipDuplicates}
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
              >
                Skip Existing (Add only new people)
              </button>
              <button
                onClick={() => proceedWithAdd(getValidRows())}
                disabled={loading}
                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition disabled:opacity-50"
              >
                Force Add Everyone (Allow duplicates)
              </button>
              <button
                onClick={() => setDuplicates([])}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-800 transition mt-1 underline"
              >
                Go back and edit my list
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}