'use client';

import Image from 'next/image';
import { Mic, Volume2 } from 'lucide-react';
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
      accentColor: 'border-cyan-500/60 bg-cyan-500/10 text-cyan-400',
      activeRing: 'ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)]',
    },
    {
      role: InterviewRole.PRODUCT_MANAGER,
      accentColor: 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400',
      activeRing: 'ring-2 ring-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.35)]',
    },
    {
      role: InterviewRole.SECURITY_LEAD,
      accentColor: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400',
      activeRing: 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    },
  ];

  return (
    <div className="w-full rounded-2xl border border-border bg-card/90 p-3.5 backdrop-blur-md shadow-lg">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Shravya AI Technical Panel
        </span>
        <span className="text-[10px] font-medium text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          <Volume2 className="h-3 w-3 animate-pulse" />
          Live Voice Arbitration
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {panelRoles.map(({ role, accentColor, activeRing }) => {
          const config = getRoleConfig(role);
          const isActive = role === activeRole;
          const isCurrentlySpeaking = isActive && (isAgentSpeaking || speakerStatus === 'SPEAKING');

          return (
            <div
              key={role}
              className={`relative flex flex-col items-center justify-center rounded-xl border p-3 transition-all duration-300 ${
                isActive
                  ? `${accentColor} ${activeRing} scale-[1.02]`
                  : 'border-border/40 bg-card/40 text-muted-foreground opacity-70 hover:opacity-90'
              }`}
            >
              {isCurrentlySpeaking && (
                <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <Mic className="h-3 w-3 text-primary animate-pulse" />
                </div>
              )}

              {/* Avatar Photo with dynamic active ring */}
              <div className="relative mb-2">
                <div
                  className={`relative h-14 w-14 overflow-hidden rounded-full border-2 transition-all duration-300 ${
                    isActive
                      ? 'border-primary shadow-[0_0_12px_rgba(34,211,238,0.5)] ring-2 ring-primary/40'
                      : 'border-border/60 grayscale-[20%]'
                  }`}
                >
                  <Image
                    src={config.avatarUrl}
                    alt={config.interviewerName}
                    fill
                    sizes="56px"
                    className="object-cover"
                    priority
                  />
                </div>
                {isCurrentlySpeaking && (
                  <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-foreground">
                  {config.interviewerName}
                </span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-muted/60 text-muted-foreground font-semibold">
                  {config.gender === 'female' ? 'F' : 'M'}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground text-center font-medium line-clamp-1">
                {config.displayName}
              </span>

              {isActive ? (
                <span className="mt-2 rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-semibold text-primary animate-pulse">
                  {isCurrentlySpeaking ? 'Speaking' : speakerStatus === 'THINKING' ? 'Thinking' : 'Turn Active'}
                </span>
              ) : (
                <span className="mt-2 text-[9px] text-muted-foreground/60 font-medium">
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
