import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import multybyteLogo from '../assets/multybyte-logo.png';
import { APP_VERSION } from '../version';

export default function LoginPage() {
  const [email, setEmail] = useState('info@multybyte.com');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) throw new Error('Authentication failed.');

      // 2. Fetch user profile from public.profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('No profile found for this account. Please verify your database profile setup.');
      }

      // 3. Verify user status
      if (profile.status !== 'active') {
        throw new Error('This account has been disabled by an administrator.');
      }

      // 4. Verify role selection matches database role
      if (profile.role !== role) {
        throw new Error(`Access denied. This account is registered as a ${profile.role}, not a ${role}.`);
      }

      // 5. Redirect based on role
      if (profile.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/staff/todo', { replace: true });
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email, password, or role selection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F5F7F8]">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#426979] p-12 flex-col justify-between relative overflow-hidden text-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        
        <div>
          {/* The logo artwork has an opaque white background, so it only
              reads correctly on white surfaces — this panel is dark
              (#426979), so a plain text wordmark stands in for it here
              instead. */}
          <div className="flex items-center mb-12">
            <span className="text-2xl font-bold tracking-tight text-white">Multybyte</span>
          </div>
          <div className="w-12 h-1 bg-[#C6D30A] mb-6" />
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">To-Do Management</h1>
          <p className="text-white/80 text-lg max-w-md">
            One shared workspace for daily and monthly tasks, kept in sync across every laptop on the team.
          </p>
        </div>

        <div className="text-sm text-white/60">
          © {new Date().getFullYear()} Multybyte Marketing India Co.
          <span className="mx-1.5">&middot;</span>
          Version {APP_VERSION}
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="lg:hidden flex items-center mb-8">
            <img src={multybyteLogo} alt="Multybyte" className="h-9 w-auto object-contain" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign in to your account</h2>
          <p className="text-sm text-slate-500 mb-8">
            Select your role and enter your credentials provided by your administrator.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Email / Username
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#426979] focus:border-transparent outline-none text-slate-800 transition"
                placeholder="name@multybyte.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#426979] focus:border-transparent outline-none text-slate-800 transition"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Login As
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#426979] focus:border-transparent outline-none bg-white text-slate-800 transition cursor-pointer"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#426979] hover:bg-[#355461] text-white font-semibold rounded-lg shadow-md transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Log in'}
            </button>
          </form>

          <p className="lg:hidden mt-6 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Multybyte &middot; Version {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
