import React from 'react';
import { useAuth } from '../AuthContext';
import { ShieldAlert, ArrowRight, Lock, User, Stethoscope, LogOut } from 'lucide-react';
import { UserRole } from '../authTypes';

interface AccessDeniedPageProps {
  requiredRole: UserRole;
  onNavigateToPortal: (role: UserRole) => void;
  onSwitchAccount?: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  requiredRole,
  onNavigateToPortal,
  onSwitchAccount
}) => {
  const { user, logout } = useAuth();
  const currentRole = user?.role;

  const handleLogoutAndSwitch = () => {
    logout();
    if (onSwitchAccount) {
      onSwitchAccount();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border-2 border-slate-200/80 shadow-lg text-center space-y-6 animate-in fade-in zoom-in-95">
        {/* Security Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Title and Explanation */}
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Access Restricted
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {requiredRole === 'doctor' ? 'Doctor Portal Authorization Required' : 'Patient Portal Access Only'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {requiredRole === 'doctor'
              ? 'This area contains confidential clinical decision-support workflows, patient queues, and physician assessment tools reserved strictly for authorized Doctor accounts.'
              : 'This area is the pre-consultation patient intake portal. Physician accounts cannot complete symptom intake on behalf of patients.'}
          </p>
        </div>

        {/* Current Identity Box */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Currently signed in as:</span>
            <span className="font-bold text-slate-800 capitalize flex items-center gap-1">
              {currentRole === 'doctor' ? <Stethoscope className="w-3.5 h-3.5 text-emerald-600" /> : <User className="w-3.5 h-3.5 text-emerald-600" />}
              {currentRole || 'Unauthenticated'}
            </span>
          </div>
          <div className="text-sm font-extrabold text-slate-900 truncate">
            {user?.name || 'Guest'}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {user?.email || 'N/A'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {currentRole && (
            <button
              type="button"
              onClick={() => onNavigateToPortal(currentRole)}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Return to {currentRole === 'doctor' ? 'Doctor Workstation' : 'Patient Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleLogoutAndSwitch}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Sign Out &amp; Switch Account</span>
          </button>
        </div>

        {/* Compliance Footer */}
        <p className="text-[10px] text-slate-400">
          Role-Based Access Control (RBAC) • CarePrep Healthcare Security Framework
        </p>
      </div>
    </div>
  );
};
