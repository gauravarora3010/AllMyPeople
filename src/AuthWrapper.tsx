import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useStore } from "./store";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const setUserId = useStore((state) => state.setUserId);
  const userId = useStore((state) => state.userId);

  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user.id ?? null);
      setLoading(false);
    });

    // 2. Listen for Login/Logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUserId]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  // --- LOGIN SCREEN ---
  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">AllMyPeople</h1>
          <p className="mb-8 text-gray-500">Map your world, one connection at a time.</p>
          
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-white border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}