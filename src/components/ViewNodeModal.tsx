import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

export default function ViewNodeModal() {
  const { isViewModalOpen, toggleViewModal, selectedNodeId } = useStore();
  const [node, setNode] = useState<any>(null);

  useEffect(() => {
    if (isViewModalOpen && selectedNodeId) {
      const fetchNode = async () => {
        const { data } = await supabase.from('nodes').select('*').eq('id', selectedNodeId).single();
        if (data) setNode(data);
      };
      fetchNode();
    }
  }, [isViewModalOpen, selectedNodeId]);

  if (!isViewModalOpen || !node) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={toggleViewModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        
        {/* Header Profile */}
        <div className="flex flex-col items-center text-center mb-6 mt-4">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl mb-3 shadow-inner">
            {node.full_name?.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold text-gray-800">{node.full_name}</h2>
          {node.profession && <p className="text-sm text-gray-500 font-medium">{node.profession}</p>}
        </div>

        {/* Details Grid */}
        <div className="space-y-4 text-sm text-gray-700">
          {(node.location || node.dob) && (
            <div className="flex justify-around bg-gray-50 p-3 rounded-lg border border-gray-100">
              {node.location && <div className="text-center"><span>📍</span> <span className="block font-semibold">{node.location}</span></div>}
              {node.dob && <div className="text-center"><span>🎂</span> <span className="block font-semibold">{new Date(node.dob).toLocaleDateString()}</span></div>}
            </div>
          )}

          {/* Contact Details */}
          {(node.contact_info?.mobile || node.contact_info?.email) && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact</h4>
              {node.contact_info?.mobile && <p>📱 {node.contact_info.mobile}</p>}
              {node.contact_info?.email && <p>📧 <a href={`mailto:${node.contact_info.email}`} className="text-blue-600 hover:underline">{node.contact_info.email}</a></p>}
            </div>
          )}

          {/* Social Links */}
          {(node.social_links?.instagram || node.social_links?.facebook) && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Socials</h4>
              <div className="flex gap-4">
                {node.social_links?.instagram && (
                  <a href={node.social_links.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-600 hover:text-pink-700 font-semibold bg-pink-50 px-3 py-1 rounded-full">
                    📸 Instagram
                  </a>
                )}
                {node.social_links?.facebook && (
                  <a href={node.social_links.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-3 py-1 rounded-full">
                    📘 Facebook
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {node.notes && (
            <div className="border-t pt-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</h4>
              <p className="text-gray-600 bg-yellow-50 p-3 rounded-lg text-xs italic">{node.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}