import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

export default function BulkAddModal() {
  const { isBulkAddModalOpen, toggleBulkAddModal, currentGraphId, triggerRefresh } = useStore();
  const [loading, setLoading] = useState(false);

  // Initialize with 3 empty rows, all defaulting to "Male"
  const [rows, setRows] = useState([
    { id: 1, fullName: "", sex: "Male" },
    { id: 2, fullName: "", sex: "Male" },
    { id: 3, fullName: "", sex: "Male" }
  ]);

  // Reset the form whenever the modal opens or closes
  useEffect(() => {
    if (!isBulkAddModalOpen) {
      setRows([
        { id: 1, fullName: "", sex: "Male" },
        { id: 2, fullName: "", sex: "Male" },
        { id: 3, fullName: "", sex: "Male" }
      ]);
    }
  }, [isBulkAddModalOpen]);

  if (!isBulkAddModalOpen) return null;

  const handleAddRow = () => {
    setRows([...rows, { id: Date.now(), fullName: "", sex: "Male" }]);
  };

  const handleRemoveRow = (id: number) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleChange = (id: number, field: string, value: string) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGraphId) return;

    // Filter out rows where the user didn't type a name
    const validRows = rows.filter(row => row.fullName.trim() !== "");
    
    if (validRows.length === 0) {
      alert("Please enter at least one name.");
      return;
    }

    setLoading(true);

    // FIX: Generate and save random coordinates spread over a 1000x1000 area
    const payload = validRows.map(row => ({
      graph_id: currentGraphId,
      full_name: row.fullName.trim(),
      sex: row.sex,
      layout_x: (Math.random() * 1000) - 500, 
      layout_y: (Math.random() * 1000) - 500
    }));

    // Perform the bulk insert!
    const { error } = await supabase.from('nodes').insert(payload);

    if (error) {
      alert("Error adding people: " + error.message);
    } else {
      triggerRefresh();
      toggleBulkAddModal();
    }
    
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Bulk Add People</h2>
            <p className="text-xs text-gray-500">Quickly add multiple people at once. Leave rows empty to ignore them.</p>
          </div>
          <button onClick={toggleBulkAddModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          
          {/* Scrollable Rows Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
            {rows.map((row, index) => (
              <div key={row.id} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <span className="text-gray-400 font-mono text-sm w-6 text-center">{index + 1}.</span>
                
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={row.fullName}
                  onChange={(e) => handleChange(row.id, "fullName", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md p-2 text-sm bg-white"
                />
                
                <select 
                  value={row.sex} 
                  onChange={(e) => handleChange(row.id, "sex", e.target.value)}
                  className="w-32 border border-gray-300 rounded-md p-2 text-sm bg-white"
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
                className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 text-sm transition"
              >
                {loading ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}