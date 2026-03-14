'use client';

interface NovusLogoProps {
  variant?: 'dark' | 'light' | 'error' | 'notfound' | 'loading' | 'empty';
  size?: number;
  showText?: boolean;
  showSlogan?: boolean;
  className?: string;
}

export default function NovusLogo({
  variant = 'dark',
  size = 36,
  showText = true,
  showSlogan = false,
  className = '',
}: NovusLogoProps) {

  const icon = () => {
    switch (variant) {
      case 'error':
        return (
          <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
            <line x1="40" y1="42" x2="68" y2="68" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
            <line x1="120" y1="42" x2="92" y2="68" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
            <line x1="40" y1="118" x2="68" y2="92" stroke="rgba(239,68,68,0.25)" strokeWidth="2"/>
            <line x1="120" y1="118" x2="92" y2="92" stroke="rgba(239,68,68,0.25)" strokeWidth="2"/>
            <circle cx="40" cy="42" r="8" fill="white" opacity={0.4}/>
            <circle cx="120" cy="42" r="8" fill="white" opacity={0.4}/>
            <circle cx="40" cy="118" r="8" fill="#EF4444" opacity={0.6}/>
            <circle cx="120" cy="118" r="8" fill="#EF4444" opacity={0.6}/>
            <circle cx="80" cy="80" r="14" fill="#EF4444" opacity={0.2}/>
            <circle cx="80" cy="80" r="10" fill="#EF4444"/>
          </svg>
        );
      case 'notfound':
        return (
          <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
            <line x1="40" y1="42" x2="68" y2="68" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="6 6"/>
            <line x1="120" y1="42" x2="92" y2="68" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="6 6"/>
            <line x1="40" y1="118" x2="68" y2="92" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="6 6"/>
            <line x1="120" y1="118" x2="92" y2="92" stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeDasharray="6 6"/>
            <circle cx="40" cy="42" r="8" fill="white" opacity={0.15} stroke="white" strokeWidth="1" strokeOpacity={0.2} strokeDasharray="4 4"/>
            <circle cx="120" cy="42" r="8" fill="white" opacity={0.15} stroke="white" strokeWidth="1" strokeOpacity={0.2} strokeDasharray="4 4"/>
            <circle cx="40" cy="118" r="8" fill="white" opacity={0.15} stroke="white" strokeWidth="1" strokeOpacity={0.2} strokeDasharray="4 4"/>
            <circle cx="120" cy="118" r="8" fill="white" opacity={0.15} stroke="white" strokeWidth="1" strokeOpacity={0.2} strokeDasharray="4 4"/>
            <circle cx="80" cy="80" r="14" fill="none" stroke="#3B82F6" strokeWidth="2" strokeDasharray="6 6" opacity={0.4}/>
          </svg>
        );
      case 'loading':
        return (
          <svg width={size} height={size} viewBox="0 0 160 160" fill="none" className="animate-pulse">
            <line x1="40" y1="42" x2="68" y2="68" stroke="#3B82F6" strokeWidth="2" opacity={0.15}/>
            <line x1="120" y1="42" x2="92" y2="68" stroke="#3B82F6" strokeWidth="2" opacity={0.15}/>
            <line x1="40" y1="118" x2="68" y2="92" stroke="#10B981" strokeWidth="2" opacity={0.15}/>
            <line x1="120" y1="118" x2="92" y2="92" stroke="#10B981" strokeWidth="2" opacity={0.15}/>
            <circle cx="40" cy="42" r="8" fill="#94a3b8" opacity={0.5}/>
            <circle cx="120" cy="42" r="8" fill="#94a3b8" opacity={0.5}/>
            <circle cx="40" cy="118" r="8" fill="#10B981" opacity={0.5}/>
            <circle cx="120" cy="118" r="8" fill="#10B981" opacity={0.5}/>
            <circle cx="80" cy="80" r="12" fill="#3B82F6"/>
          </svg>
        );
      case 'empty':
        return (
          <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
            <line x1="40" y1="42" x2="68" y2="68" stroke="#e2e8f0" strokeWidth="2"/>
            <line x1="120" y1="42" x2="92" y2="68" stroke="#e2e8f0" strokeWidth="2"/>
            <line x1="40" y1="118" x2="68" y2="92" stroke="#e2e8f0" strokeWidth="2"/>
            <line x1="120" y1="118" x2="92" y2="92" stroke="#e2e8f0" strokeWidth="2"/>
            <circle cx="40" cy="42" r="8" fill="#e2e8f0"/>
            <circle cx="120" cy="42" r="8" fill="#e2e8f0"/>
            <circle cx="40" cy="118" r="8" fill="#e2e8f0"/>
            <circle cx="120" cy="118" r="8" fill="#e2e8f0"/>
            <circle cx="80" cy="80" r="12" fill="#cbd5e1"/>
          </svg>
        );
      case 'light':
        return (
          <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
            <line x1="40" y1="42" x2="68" y2="68" stroke="rgba(15,23,42,0.12)" strokeWidth="2.5"/>
            <line x1="120" y1="42" x2="92" y2="68" stroke="rgba(15,23,42,0.12)" strokeWidth="2.5"/>
            <line x1="40" y1="118" x2="68" y2="92" stroke="rgba(16,185,129,0.25)" strokeWidth="2.5"/>
            <line x1="120" y1="118" x2="92" y2="92" stroke="rgba(16,185,129,0.25)" strokeWidth="2.5"/>
            <circle cx="40" cy="42" r="10" fill="#0f172a" opacity={0.6}/>
            <circle cx="120" cy="42" r="10" fill="#0f172a" opacity={0.6}/>
            <circle cx="40" cy="118" r="10" fill="#10B981"/>
            <circle cx="120" cy="118" r="10" fill="#10B981"/>
            <circle cx="80" cy="80" r="16" fill="#3B82F6"/>
          </svg>
        );
      default: // dark
        return (
          <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
            <line x1="40" y1="42" x2="68" y2="68" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"/>
            <line x1="120" y1="42" x2="92" y2="68" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5"/>
            <line x1="40" y1="118" x2="68" y2="92" stroke="rgba(16,185,129,0.35)" strokeWidth="2.5"/>
            <line x1="120" y1="118" x2="92" y2="92" stroke="rgba(16,185,129,0.35)" strokeWidth="2.5"/>
            <circle cx="40" cy="42" r="10" fill="white" opacity={0.9}/>
            <circle cx="120" cy="42" r="10" fill="white" opacity={0.9}/>
            <circle cx="40" cy="118" r="10" fill="#10B981"/>
            <circle cx="120" cy="118" r="10" fill="#10B981"/>
            <circle cx="80" cy="80" r="16" fill="#3B82F6"/>
          </svg>
        );
    }
  };

  const isDark = ['dark', 'error', 'notfound'].includes(variant);

  if (!showText) return <div className={className}>{icon()}</div>;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {icon()}
      <div>
        <div
          className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
          style={{ fontSize: size * 0.55, letterSpacing: size * 0.08 }}
        >
          Novus
        </div>
        {showSlogan && (
          <div
            className={isDark ? 'text-white/30' : 'text-slate-400'}
            style={{ fontSize: Math.max(8, size * 0.22), letterSpacing: size * 0.04, marginTop: -1 }}
          >
            Clarity in Every Workflow
          </div>
        )}
      </div>
    </div>
  );
}
