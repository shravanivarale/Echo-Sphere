'use client';

import { UserCheck, ShieldCheck, Cpu, Mic } from 'lucide-react';
import { InterviewRole, SpeakerStatus } from '@/types/interview';
import { getRoleConfig } from '@/lib/interview-roles';

interface PanelInterviewersCardProps {
  activeRole: InterviewRole;
  isAgentSpeaking?: boolean;
  speakerStatus?: SpeakerStatus;
}

export function PanelInterviewersCard({
  activeRole,
  isAgentSpeaking = false,
  speakerStatus = 'IDLE',
}: PanelInterviewersCardProps) {
  const panelRoles = [
    {
      role: InterviewRole.SYSTEM_ARCHITECT,
      icon: Cpu,
      accentColor: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
      activeRing: 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    },
    {
      role: InterviewRole.PRODUCT_MANAGER,
      icon: UserCheck,
      accentColor: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
      activeRing: 'ring-2 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    },
    {
      role: InterviewRole.SECURITY_LEAD,
      icon: ShieldCheck,
      accentColor: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
      activeRing: 'ring-2 ring-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    },
  ];

  return (
    <div className="w-full rounded-xl border border-border/80 bg-black/40 p-3 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          3-Person Real-Time Panel
        </span>
        <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Audio Arbitration Active
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {panelRoles.map(({ role, icon: Icon, accentColor, activeRing }) => {
          const config = getRoleConfig(role);
          const isActive = role === activeRole;
          const isCurrentlySpeaking = isActive && (isAgentSpeaking || speakerStatus === 'SPEAKING');

          return (
            <div
              key={role}
              className={`relative flex flex-col items-center justify-center rounded-lg border p-2.5 transition-all duration-200 ${
                isActive
                  ? `${accentColor} ${activeRing}`
                  : 'border-border/40 bg-muted/20 text-muted-foreground opacity-60'
              }`}
            >
              {isCurrentlySpeaking && (
                <div className="absolute right-1.5 top-1.5 flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <Mic className="h-2.5 w-2.5 text-emerald-400" />
                </div>
              )}

              <div
                className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border ${
                  isActive ? 'bg-background/80' : 'bg-muted/40'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>

              <span className="text-xs font-semibold text-foreground">
                {config.interviewerName}
              </span>
              <span className="text-[10px] text-muted-foreground text-center line-clamp-1">
                {config.displayName}
              </span>

              {isActive ? (
                <span className="mt-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                  {isCurrentlySpeaking ? 'Speaking' : speakerStatus === 'THINKING' ? 'Thinking' : 'Turn Active'}
                </span>
              ) : (
                <span className="mt-1.5 text-[9px] text-muted-foreground/60 font-medium">
                  Listening
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
