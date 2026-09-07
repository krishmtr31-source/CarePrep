import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { 
  Stethoscope, 
  ArrowRight, 
  AlertCircle, 
  ArrowLeft, 
  Sparkles, 
  Lock, 
  ShieldCheck, 
  Activity, 
  FileText 
} from 'lucide-react';
import { GlassCard, AnimatedButton } from '../../shared/components/ui/DesignSystem';

interface DoctorLoginPageProps {
  onSuccess: () => void;
  onGoToSignup: () => void;
  onBackToLanding: () => void;
}

export const DoctorLoginPage: React.FC<DoctorLoginPageProps> = ({
  onSuccess,
  onGoToSignup,
  onBackToLanding
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your Institutional Email and Password.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await login({
        emailOrPhone: email.trim(),
        password,
        role: 'doctor'
      });

      if (result.success) {
        onSuccess();
      } else {
        setErrorMsg(result.error || 'Doctor authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during doctor login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setEmail('dr.ananya@aiims.edu.in');
    setPassword('doctor123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 relative">
      {/* Main Clean Login Card */}
      <div className="max-w-md w-full relative z-10">
        <GlassCard className="p-6 sm:p-8 border border-slate-200 bg-white shadow-sm">
          
          {/* Navigation & Header */}
          <div>
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Role Selection</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shadow-md shadow-slate-900/30">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Doctor Workstation Sign In
                </h1>
                <p className="text-xs text-slate-500">
                  Analytical triage queues &amp; patient clinical cases
                </p>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Institutional / Clinic Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr.ananya@aiims.edu.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all bg-white"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(!showForgotNotice)}
                  className="text-[11px] text-slate-600 hover:underline font-bold"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your physician password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all bg-white"
                required
              />
            </div>

            {showForgotNotice && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Hospital IT / SSO Recovery</p>
                <p>For SIH demonstration, use password <span className="font-mono font-bold text-slate-900">doctor123</span> or click the Auto-Fill button below.</p>
              </div>
            )}

            <AnimatedButton
              type="submit"
              disabled={isLoading}
              variant="dark"
              size="md"
              iconRight={<ArrowRight className="w-4 h-4" />}
              className="w-full shadow-md shadow-slate-900/20"
            >
              {isLoading ? 'Authenticating Clinician...' : 'Sign In to Doctor Dashboard'}
            </AnimatedButton>
          </form>

          {/* Quick Demo Preset Button */}
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold border border-slate-300 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auto-Fill Sample Doctor (Dr. Ananya Sharma, MD)</span>
            </button>

            <div className="text-center text-xs text-slate-500">
              <span>Need physician access? </span>
              <button
                type="button"
                onClick={onGoToSignup}
                className="font-bold text-slate-900 hover:underline"
              >
                Register Doctor Account
              </button>
            </div>
          </div>

          {/* Compliance Footer */}
          <p className="text-[10px] text-slate-400 text-center leading-tight mt-3">
            Doctor accounts have exclusive access to clinical decision-support notes, triage queues, and verified EMR export tools.
          </p>
        </GlassCard>
      </div>
    </div>
  );
};
