import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

export default function AddPersonModal() {
  const { isAddPersonModalOpen, toggleAddPersonModal, currentGraphId, userId, triggerRefresh } = useStore();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isAddPersonModalOpen) return null;

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentGraphId) return;
    setLoading(true);

    const { error } = await supabase.from("nodes").insert({
      graph_id: currentGraphId,
      full_name: name.trim(),
      layout_x: Math.random() * 10,
      layout_y: Math.random() * 10,
      color: "#10b981", // Green
      created_by: userId
    });

    if (error) {
      alert("Error adding person: " + error.message);
    } else {
      setName("");
      triggerRefresh();
      toggleAddPersonModal(); // Close modal on success
    }
    setLoading(false);
  };

  return (
    // Dimmed background overlay
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      {/* Modal Box */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Add New Person</h2>
          <button onClick={toggleAddPersonModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleAddPerson} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full border border-gray-300 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={toggleAddPersonModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? "Saving..." : "Add Person"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}