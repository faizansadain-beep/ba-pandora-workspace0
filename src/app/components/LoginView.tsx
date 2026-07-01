import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { ShieldAlert } from "lucide-react";

export default function LoginView() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setErrorMsg(error.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-8">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BA's Pandora</h1>
          <p className="text-sm text-muted-foreground mt-1">Enterprise Business Analysis Workspace</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
              placeholder="you@company.com" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-2.5 mt-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }} 
            className="text-primary font-medium hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}