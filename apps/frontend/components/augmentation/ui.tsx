import React from "react";

// ---- Section Card -----------------------------------------------------------

interface SectionCardProps {
  number: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  color?: string;
  className?: string;
  headerAction?: React.ReactNode;
  subtitle?: string;
  bodyClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  number,
  title,
  icon,
  children,
  color = "#3B82F6",
  className = "",
  headerAction,
  subtitle,
  bodyClassName = "p-3.5 sm:p-4",
}) => (
  <div
    className={`bg-[#32353A] rounded-xl border border-[#454950] shadow-sm overflow-hidden flex flex-col ${className}`}
  >
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-[#454950] bg-[#2C2F34]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-5 h-5 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs"
          style={{ backgroundColor: color }}
        >
          {number}
        </div>
        <div className="shrink-0" style={{ color }}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#E5E7EB] leading-snug truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-[#A5A9B0] font-normal leading-tight truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {headerAction && (
        <div className="shrink-0 flex items-center gap-2">{headerAction}</div>
      )}
    </div>
    <div className={`flex-1 ${bodyClassName}`}>{children}</div>
  </div>
);

// ---- Stat Card -------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: string;
  alert?: boolean;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color = "#3B82F6",
  alert = false,
  subtext,
}) => (
  <div
    className={`flex flex-col gap-1 px-3 py-2 rounded-lg border transition-colors ${
      alert
        ? "border-amber-500/50 bg-amber-950/20 text-amber-200"
        : "border-[#454950] bg-[#27292D] text-[#E5E7EB]"
    }`}
  >
    <div className="flex items-center justify-between gap-1.5">
      <span className="text-[11px] font-medium text-[#A5A9B0] truncate">
        {label}
      </span>
      {icon && (
        <span className="shrink-0" style={{ color: alert ? "#F59E0B" : color }}>
          {icon}
        </span>
      )}
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-lg font-bold tracking-tight text-[#E5E7EB]">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      {subtext && (
        <span className="text-[10px] text-[#A5A9B0] font-mono">{subtext}</span>
      )}
    </div>
  </div>
);

// ---- Toggle Switch ---------------------------------------------------------

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}) => (
  <label
    htmlFor={id}
    className={`flex items-center gap-2.5 select-none ${
      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
    }`}
  >
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        checked ? "bg-blue-600" : "bg-[#454950]"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
    {(label || description) && (
      <div className="min-w-0">
        {label && (
          <p className="text-xs font-medium text-[#E5E7EB] leading-tight truncate">
            {label}
          </p>
        )}
        {description && (
          <p className="text-[10px] text-[#A5A9B0] leading-tight mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>
    )}
  </label>
);

// ---- Badge -----------------------------------------------------------------

interface BadgeProps {
  children: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "slate";
  className?: string;
}

const BADGE_STYLES: Record<string, string> = {
  blue: "bg-blue-900/40 text-blue-300 border-blue-700/60",
  green: "bg-emerald-900/40 text-emerald-300 border-emerald-700/60",
  red: "bg-red-900/40 text-red-300 border-red-700/60",
  yellow: "bg-amber-900/40 text-amber-300 border-amber-700/60",
  purple: "bg-purple-900/40 text-purple-300 border-purple-700/60",
  slate: "bg-[#27292D] text-[#A5A9B0] border-[#454950]",
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = "slate",
  className = "",
}) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${BADGE_STYLES[color]} ${className}`}
  >
    {children}
  </span>
);

// ---- Button ----------------------------------------------------------------

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  }[size];

  const variantClasses = {
    primary:
      "bg-blue-600 hover:bg-blue-500 text-white shadow-xs border border-blue-500",
    secondary:
      "bg-[#3C4046] hover:bg-[#454950] text-[#E5E7EB] border border-[#454950]",
    danger: "bg-red-600 hover:bg-red-500 text-white border border-red-500",
    ghost: "bg-transparent hover:bg-[#3C4046] text-[#A5A9B0] hover:text-[#E5E7EB]",
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-0.5 h-3.5 w-3.5 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

// ---- Alert Banner ----------------------------------------------------------

interface AlertProps {
  type: "info" | "warning" | "error" | "success";
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  children,
  className = "",
}) => {
  const styles = {
    info: "border-blue-700/50 bg-blue-950/30 text-blue-200",
    warning: "border-amber-700/50 bg-amber-950/30 text-amber-200",
    error: "border-red-700/50 bg-red-950/30 text-red-200",
    success: "border-emerald-700/50 bg-emerald-950/30 text-emerald-200",
  }[type];

  return (
    <div
      className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs leading-tight ${styles} ${className}`}
    >
      {children}
    </div>
  );
};
