import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Sparkles,
  ArrowRight,
  Heart,
  Stethoscope,
  Pill,
  User,
  Shield,
  FileText
} from 'lucide-react';

/* =========================================================================
   1. GlassCard (Clean Medical Card)
   ========================================================================= */
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'light' | 'dark' | 'tinted' | 'interactive';
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'light',
  glow = false,
  ...props
}) => {
  const variantStyles = {
    light: 'bg-white border border-slate-200/90 shadow-xs',
    dark: 'bg-slate-900 border border-slate-800 text-white shadow-sm',
    tinted: 'bg-emerald-50/50 border border-emerald-100 shadow-xs',
    interactive: 'bg-white border border-slate-200/90 hover:border-emerald-500 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer'
  };

  const glowStyles = glow ? 'shadow-md shadow-emerald-500/10' : '';

  return (
    <div 
      className={`rounded-2xl transition-all duration-200 ${variantStyles[variant]} ${glowStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/* =========================================================================
   2. AnimatedCard with Subtle Hover Elevation
   ========================================================================= */
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  depth?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  onClick
}) => {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className={`rounded-2xl transition-shadow duration-200 ${className}`}
    >
      {children}
    </motion.div>
  );
};

/* =========================================================================
   3. StatCard
   ========================================================================= */
interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: string;
  trend?: string;
  trendPositive?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  iconColor = 'bg-emerald-50 text-emerald-600 border-emerald-200',
  trend,
  trendPositive = true,
  className = ''
}) => {
  return (
    <GlassCard className={`p-5 relative overflow-hidden group hover:shadow-md transition-all ${className}`}>
      {/* Decorative gradient corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform ${iconColor}`}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-semibold">
          <span className={trendPositive ? 'text-emerald-700' : 'text-amber-700'}>
            {trend}
          </span>
        </div>
      )}
    </GlassCard>
  );
};

/* =========================================================================
   4. ProgressRing (Circular Animated Progress)
   ========================================================================= */
interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  showPercentageText?: boolean;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 110,
  strokeWidth = 9,
  color = 'url(#progress-gradient)',
  trackColor = '#e2e8f0',
  label,
  sublabel,
  showPercentageText = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <defs>
            <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="50%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Progress Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {showPercentageText && (
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              {Math.round(percentage)}%
            </span>
          )}
          {sublabel && (
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="text-xs font-bold text-slate-700 mt-2 text-center">
          {label}
        </span>
      )}
    </div>
  );
};

/* =========================================================================
   5. StatusBadge
   ========================================================================= */
export type StatusBadgeVariant = 
  | 'low_risk' 
  | 'moderate_risk' 
  | 'high_priority' 
  | 'needs_review' 
  | 'completed' 
  | 'in_progress' 
  | 'incomplete'
  | 'submitted'
  | 'ayush'
  | 'clinical';

interface StatusBadgeProps {
  status: StatusBadgeVariant | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md'
}) => {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, '_');

  const configs: Record<string, { bg: string; text: string; border: string; icon?: React.ReactNode; textLabel: string }> = {
    low_risk: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      textLabel: 'Low Risk'
    },
    moderate_risk: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      textLabel: 'Moderate Risk'
    },
    high_priority: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />,
      textLabel: 'High Priority'
    },
    needs_review: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <Clock className="w-3.5 h-3.5" />,
      textLabel: 'Needs Review'
    },
    completed: {
      bg: 'bg-emerald-100/80',
      text: 'text-emerald-900',
      border: 'border-emerald-300',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      textLabel: 'Completed'
    },
    in_progress: {
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200',
      icon: <Activity className="w-3.5 h-3.5 text-sky-600 animate-spin" />,
      textLabel: 'In Progress'
    },
    incomplete: {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: <Clock className="w-3.5 h-3.5" />,
      textLabel: 'Incomplete'
    },
    submitted: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />,
      textLabel: 'Submitted to Doctor'
    },
    submitted_to_doctor: {
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />,
      textLabel: 'Submitted to Doctor'
    },
    ayush: {
      bg: 'bg-ayush-100',
      text: 'text-ayush-900',
      border: 'border-ayush-300',
      icon: <Sparkles className="w-3 h-3 text-ayush-700" />,
      textLabel: 'AYUSH'
    },
    clinical: {
      bg: 'bg-clinical-100',
      text: 'text-clinical-900',
      border: 'border-clinical-300',
      icon: <Activity className="w-3 h-3 text-clinical-700" />,
      textLabel: 'Clinical'
    }
  };

  const config = configs[normalized] || {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    textLabel: label || status
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2'
  };

  return (
    <span 
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border shadow-2xs ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      {config.icon}
      <span>{label || config.textLabel}</span>
    </span>
  );
};

/* =========================================================================
   6. HealthMetric
   ========================================================================= */
interface HealthMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  variant?: 'emerald' | 'cyan' | 'violet' | 'slate';
}

export const HealthMetric: React.FC<HealthMetricProps> = ({
  label,
  value,
  unit,
  icon,
  variant = 'emerald'
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950',
    cyan: 'bg-cyan-50/60 border-cyan-200/80 text-cyan-950',
    violet: 'bg-violet-50/60 border-violet-200/80 text-violet-950',
    slate: 'bg-slate-100/70 border-slate-200/80 text-slate-900'
  };

  return (
    <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${variantStyles[variant]}`}>
      <div className="space-y-0.5">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          {label}
        </span>
        <div className="text-sm font-extrabold flex items-baseline gap-1">
          <span>{value}</span>
          {unit && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
        </div>
      </div>
      {icon && (
        <div className="w-8 h-8 rounded-xl bg-white/80 border border-slate-200/70 flex items-center justify-center text-slate-700 shadow-2xs">
          {icon}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   7. AnimatedButton
   ========================================================================= */
interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  iconRight?: React.ReactNode;
  iconLeft?: React.ReactNode;
  isLoading?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  iconRight,
  iconLeft,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 border-0',
    secondary: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-sm hover:shadow',
    dark: 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20 border border-slate-800',
    outline: 'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50/60 bg-transparent',
    ghost: 'hover:bg-slate-100 text-slate-700 bg-transparent border-0'
  };

  const sizeStyles = {
    sm: 'px-3.5 py-2 text-xs font-bold rounded-xl gap-1.5',
    md: 'px-5 py-3 text-sm font-bold rounded-2xl gap-2',
    lg: 'px-8 py-4 text-base font-extrabold rounded-2xl gap-2.5'
  };

  return (
    <motion.button
      whileHover={disabled || isLoading ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled || isLoading ? {} : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...(props as any)}
    >
      {isLoading ? (
        <Activity className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {iconLeft}
          <span>{children}</span>
          {iconRight}
        </>
      )}
    </motion.button>
  );
};

/* =========================================================================
   8. PageTransition
   ========================================================================= */
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = ''
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.995 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

/* =========================================================================
   9. FloatingMedicalIcon (3D decorative badge)
   ========================================================================= */
interface FloatingMedicalIconProps {
  icon: 'cross' | 'heart' | 'stethoscope' | 'pill' | 'sparkles' | 'shield';
  color?: string;
  size?: number;
  className?: string;
}

export const FloatingMedicalIcon: React.FC<FloatingMedicalIconProps> = ({
  icon,
  color = 'text-emerald-500',
  size = 24,
  className = ''
}) => {
  const icons = {
    cross: <Activity className="w-full h-full" />,
    heart: <Heart className="w-full h-full" />,
    stethoscope: <Stethoscope className="w-full h-full" />,
    pill: <Pill className="w-full h-full" />,
    sparkles: <Sparkles className="w-full h-full" />,
    shield: <Shield className="w-full h-full" />
  };

  return (
    <div 
      style={{ width: size, height: size }}
      className={`p-2 rounded-2xl bg-white/90 backdrop-blur-md border border-white/90 shadow-md ${color} ${className}`}
    >
      {icons[icon]}
    </div>
  );
};
