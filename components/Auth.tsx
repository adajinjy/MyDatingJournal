
import React, { useState } from 'react';
import { supabase, saveSupabaseConfig, getSupabaseConfig } from '../services/supabaseClient';
import { Heart, Settings, Database, Info, ArrowLeft, Mail, Copy, Check, Terminal } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: () => void;
}

const SQL_SCRIPT = `
-- 1. Create the table to store person profiles (as JSON)
create table if not exists dating_people (
  id text primary key,
  user_id uuid references auth.users not null,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Security (RLS)
alter table dating_people enable row level security;

-- 3. Create Access Policies
-- Allow users to see their own data
create policy "Users can select own data" 
  on dating_people for select using (auth.uid() = user_id);

-- Allow users to insert their own data
create policy "Users can insert own data" 
  on dating_people for insert with check (auth.uid() = user_id);

-- Allow users to update their own data
create policy "Users can update own data" 
  on dating_people for update using (auth.uid() = user_id);

-- Allow users to delete their own data
create policy "Users can delete own data" 
  on dating_people for delete using (auth.uid() = user_id);
`;

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Views: 'signin', 'signup', 'forgot_password'
  const [view, setView] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Config State
  const [showConfig, setShowConfig] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(config.url);
  const [sbKey, setSbKey] = useState(config.key);

  const resetState = () => {
    setError('');
    setSuccessMsg('');
    setLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return;
    }

    if (!supabase) {
      setError("Database not connected. Please check your Project URL and Key in settings.");
      setLoading(false);
      return;
    }

    try {
      if (view === 'signup') {
        const { data, error } = await supabase.auth.signUp({ 
            email: email.trim(), 
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) throw error;
        
        if (data.session) {
            onLoginSuccess();
        } else if (data.user) {
            setSuccessMsg("Registration successful! Please check your email to confirm your account.");
            setView('signin');
            setPassword(''); 
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ 
            email: email.trim(), 
            password 
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    if (!email) {
        setError("Please enter your email address.");
        setLoading(false);
        return;
    }

    if (!supabase) {
        setError("Database not connected.");
        setLoading(false);
        return;
    }

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin
        });
        if (error) throw error;
        setSuccessMsg("Password reset link has been sent to your email.");
    } catch (err: any) {
        setError(err.message || "Failed to send reset email.");
    } finally {
        setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    if (!sbUrl.startsWith('https://')) {
        setError("Project URL must start with https://");
        return;
    }
    saveSupabaseConfig(sbUrl, sbKey);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-rose-500 p-8 text-center relative">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Heart className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">MyDatingJournal</h1>
          <p className="text-rose-100 text-sm">Track your dates, find your person.</p>
        </div>

        <div className="p-8">
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 border border-red-100 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-lg mb-4 border border-emerald-100 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Settings Toggle */}
          <div className="mb-6 flex justify-end">
            <button 
              onClick={() => {
                  setShowConfig(!showConfig);
                  resetState();
              }}
              className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Settings className="w-3 h-3" /> {showConfig ? 'Hide Settings' : 'Connect Database'}
            </button>
          </div>

          {showConfig ? (
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 animate-fade-in">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-indigo-500"/> Supabase Configuration
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Project URL</label>
                        <input 
                            value={sbUrl} 
                            onChange={e => setSbUrl(e.target.value)} 
                            className="w-full text-xs p-2 border rounded font-mono" 
                            placeholder="https://your-project.supabase.co" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Anon API Key</label>
                        <input 
                            value={sbKey} 
                            onChange={e => setSbKey(e.target.value)} 
                            className="w-full text-xs p-2 border rounded font-mono" 
                            type="password" 
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5..." 
                        />
                    </div>
                    <button onClick={handleSaveConfig} className="w-full bg-indigo-600 text-white text-xs py-2 rounded hover:bg-indigo-700">
                        Save & Reload
                    </button>
                    
                    <div className="pt-2 border-t border-slate-200">
                        <button 
                            onClick={() => setShowSql(!showSql)}
                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600 w-full justify-between"
                        >
                            <span className="flex items-center gap-1"><Terminal className="w-3 h-3" /> Database Setup Script</span>
                            <span>{showSql ? 'Hide' : 'Show'}</span>
                        </button>
                        
                        {showSql && (
                            <div className="mt-2 relative">
                                <textarea 
                                    readOnly 
                                    value={SQL_SCRIPT}
                                    className="w-full h-32 text-[10px] font-mono p-2 bg-slate-900 text-slate-300 rounded border border-slate-700 focus:outline-none"
                                />
                                <button 
                                    onClick={handleCopySql}
                                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-1 rounded transition-colors"
                                    title="Copy SQL"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                                <p className="text-[10px] text-slate-400 mt-1">Copy and run in Supabase SQL Editor to create table.</p>
                            </div>
                        )}
                    </div>
                </div>
             </div>
          ) : view === 'forgot_password' ? (
             <div className="animate-fade-in">
                <button 
                    onClick={() => { setView('signin'); resetState(); }}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </button>
                <h2 className="text-lg font-bold text-slate-800 mb-2">Reset Password</h2>
                <p className="text-sm text-slate-500 mb-4">Enter your email address and we'll send you a link to reset your password.</p>
                
                <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>
             </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        placeholder="you@example.com"
                    />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-700">Password</label>
                        {view === 'signin' && (
                            <button 
                                type="button"
                                onClick={() => { setView('forgot_password'); resetState(); }}
                                className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                            >
                                Forgot Password?
                            </button>
                        )}
                    </div>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                        placeholder="Min 6 chars"
                        minLength={6}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-lg transition-colors shadow-md disabled:opacity-50"
                >
                    {loading ? 'Processing...' : (view === 'signup' ? 'Create Account' : 'Sign In')}
                </button>
            </form>
          )}

          {!showConfig && view !== 'forgot_password' && (
            <div className="mt-4 text-center space-y-4 animate-fade-in">
                <button
                    onClick={() => {
                        setView(view === 'signin' ? 'signup' : 'signin');
                        resetState();
                    }}
                    className="text-sm text-slate-500 hover:text-rose-500"
                >
                    {view === 'signup' ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
