import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useStore } from "../store";

export default function NodeDetailsModal() {
  const { isNodeModalOpen, closeNodeModal, nodeModalMode, currentGraphId, selectedNodeId, triggerRefresh, userId } = useStore();
  
  // Form Steps (1 = Name, 2 = Details)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [sex, setSex] = useState("Other");
  const [dob, setDob] = useState("");
  const [location, setLocation] = useState("");
  const [profession, setProfession] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [notes, setNotes] = useState("");

  // JSONB Fields
  const [mobile, setMobile] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");

  // Load existing data if we are in "edit" mode
  useEffect(() => {
    if (isNodeModalOpen && nodeModalMode === 'edit' && selectedNodeId) {
      setStep(2); // Jump straight to full details for editing
      const fetchNode = async () => {
        const { data } = await supabase.from('nodes').select('*').eq('id', selectedNodeId).single();
        if (data) {
          setFullName(data.full_name || "");
          setNickname(data.nickname || "");
          setSex(data.sex || "Other");
          setDob(data.dob || "");
          setLocation(data.location || "");
          setProfession(data.profession || "");
          setPhotoUrl(data.photo_url || "");
          setNotes(data.notes || "");
          
          setMobile(data.contact_info?.mobile || "");
          setPhone(data.contact_info?.phone || "");
          setEmail(data.contact_info?.email || "");
          
          // We extract the username from the URL for the input field
          setInstagram(data.social_links?.instagram?.replace('https://instagram.com/', '') || "");
          setFacebook(data.social_links?.facebook?.replace('https://facebook.com/', '') || "");
        }
      };
      fetchNode();
    } else {
      // Reset form for "add" mode
      setStep(1);
      setFullName(""); setNickname(""); setSex("Other"); setDob(""); setLocation(""); 
      setProfession(""); setPhotoUrl(""); setNotes(""); setMobile(""); setPhone(""); 
      setEmail(""); setInstagram(""); setFacebook("");
    }
  }, [isNodeModalOpen, nodeModalMode, selectedNodeId]);

  if (!isNodeModalOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !currentGraphId) return;
    setLoading(true);

    // Format Socials into URLs
    const instaUrl = instagram ? `https://instagram.com/${instagram.replace('@', '')}` : null;
    const fbUrl = facebook ? `https://facebook.com/${facebook}` : null;

    const payload = {
      full_name: fullName,
      nickname,
      sex,
      dob: dob || null,
      location,
      profession,
      photo_url: photoUrl,
      notes,
      contact_info: { mobile, phone, email },
      social_links: { instagram: instaUrl, facebook: fbUrl },
    };

    let error;
    if (nodeModalMode === 'add') {
      const { error: insertError } = await supabase.from("nodes").insert({
        ...payload,
        graph_id: currentGraphId,
        layout_x: Math.random() * 10,
        layout_y: Math.random() * 10,
        color: "#10b981",
        created_by: userId
      });
      error = insertError;
    } else {
      const { error: updateError } = await supabase.from("nodes").update(payload).eq('id', selectedNodeId);
      error = updateError;
    }

    if (error) alert("Error saving person: " + error.message);
    else {
      triggerRefresh();
      closeNodeModal();
    }
    setLoading(false);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {nodeModalMode === 'add' ? "Add New Person" : "Edit Details"}
          </h2>
          <button onClick={closeNodeModal} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          
          {/* STEP 1: Just the Name */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Doe" className="w-full border border-gray-300 rounded-md p-3" autoFocus required />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeNodeModal} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">Cancel</button>
                <button type="button" onClick={() => fullName.trim() && setStep(2)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Next: Add Details &rarr;</button>
              </div>
            </div>
          )}

          {/* STEP 2: The Details */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nickname</label>
                  <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Sex</label>
                  <select value={sex} onChange={(e) => setSex(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date of Birth</label>
                  <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">📍 Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">💼 Profession</label>
                  <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                </div>
              </div>

              {/* Contact Info (JSONB) */}
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">📱 Mobile</label>
                    <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">☎️ Phone</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">📧 Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                </div>
              </div>

              {/* Social Links (JSONB) */}
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">📸 Instagram Username</label>
                  <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">📘 Facebook Username</label>
                  <input type="text" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="username" className="w-full border border-gray-300 rounded-md p-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">📝 Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-md p-2 text-sm" />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeNodeModal} className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold">
                  {loading ? "Saving..." : "Save Person"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}