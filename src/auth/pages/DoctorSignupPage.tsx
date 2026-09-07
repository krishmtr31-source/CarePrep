import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Stethoscope, ArrowRight, AlertCircle, ArrowLeft, ShieldCheck, Info } from 'lucide-react';

interface DoctorSignupPageProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  onBackToLanding: () => void;
}

export const DoctorSignupPage: React.FC<DoctorSignupPageProps> = ({
  onSuccess,
  onGoToLogin,
  onBackToLanding
}) => {
  const { signupDoctor } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [hospitalName, setHospitalName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !registrationNumber.trim() || !password.trim() || !hospitalName.trim()) {
      setErrorMsg('Please fill in all required physician verification fields.');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await signupDoctor({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        registrationNumber: registrationNumber.trim(),
        specialization: specialization.trim(),
        hospitalName: hospitalName.trim()
      });

      if (result.success) {
        onSuccess();
      } else {
        setErrorMsg(result.error || 'Doctor registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during doctor registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-slate-50">
      <div className="max-w-lg w-full bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
        
        {/* Navigation & Header */}
        <div>
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Role Selection</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Register Doctor Account
              </h1>
              <p className="text-xs text-slate-500">
                Create physician account for clinical decision-support &amp; queue triage
              </p>
            </div>
          </div>
        </div>

        {/* Prototype Verification Disclosure */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Medical Credential Notice: </span>
            <span>Doctor verification is required for production deployment. In this SIH prototype demonstration, registration is granted in demo sandbox mode.</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Physician Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Verma, MD"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Institutional Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. doctor@hospital.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 98112 34567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Medical Council Reg. No. *
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. MCI-2018-54210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Clinical Specialization *
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all bg-white"
              >
                <option value="General Medicine">General Medicine</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Gastroenterology">Gastroenterology</option>
                <option value="Pulmonology">Pulmonology</option>
                <option value="AYUSH / Ayurveda">AYUSH / Ayurveda</option>
                <option value="Emergency Medicine">Emergency Medicine</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hospital or Clinic Name *
            </label>
            <input
              type="text"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder="e.g. AIIMS New Delhi / Max Healthcare"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 4 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-800 focus:ring-2 focus:ring-slate-200 outline-none text-sm text-slate-900 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>{isLoading ? 'Verifying & Creating Account...' : 'Register & Enter Doctor Workstation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Existing Account Footer */}
        <div className="pt-2 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Already registered as a physician? </span>
          <button
            type="button"
            onClick={onGoToLogin}
            className="font-bold text-slate-900 hover:underline"
          >
            Sign In here
          </button>
        </div>
      </div>
    </div>
  );
};
