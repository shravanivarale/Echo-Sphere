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
      accentColor: 'border-primary/60 bg-primary/10 text-primary',
      activeRing: 'ring-1 ring-primary/80 shadow-[0_0_15px_rgba(34,211,238,0.25)]',
    },
    {
      role: InterviewRole.PRODUCT_MANAGER,
      icon: UserCheck,
      accentColor: 'border-primary/60 bg-primary/10 text-primary',
      activeRing: 'ring-1 ring-primary/80 shadow-[0_0_15px_rgba(34,211,238,0.25)]',
    },
    {
      role: InterviewRole.SECURITY_LEAD,
      icon: ShieldCheck,
      accentColor: 'border-primary/60 bg-primary/10 text-primary',
      activeRing: 'ring-1 ring-primary/80 shadow-[0_0_15px_rgba(34,211,238,0.25)]',
    },
  ];

  return (
    <div className="w-full rounded-xl border border-border bg-card/90 p-3 backdrop-blur-md shadow-sm">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          3-Person Real-Time Panel
        </span>
        <span className="text-[10px] font-medium text-primary flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
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
                  : 'border-border/40 bg-[#0B1220]/40 text-muted-foreground opacity-60'
              }`}
            >
              {isCurrentlySpeaking && (
                <div className="absolute right-1.5 top-1.5 flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <Mic className="h-2.5 w-2.5 text-primary" />
                </div>
              )}

              <div
                className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-full border ${
                  isActive ? 'border-primary/40 bg-background/80 text-primary' : 'border-border/40 bg-muted/30 text-muted-foreground'
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
