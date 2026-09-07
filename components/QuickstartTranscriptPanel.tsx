'use client';

import { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

type TranscriptMessage = {
  turn_id?: string | number;
  uid: number;
  text?: string;
  speakerName?: string;
  createdAt?: number;
};

type QuickstartTranscriptPanelProps = {
  messageList: TranscriptMessage[];
  currentInProgressMessage: TranscriptMessage | null;
  agentUID: string;
  candidateUID?: string;
};

function formatMessageTime(createdAt?: number) {
  if (!createdAt) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

const PANELIST_LABELS: Record<string, { name: string; avatar: string }> = {
  '1001': { name: 'Neerja (System Architect)', avatar: '/shravya.jpg' },
  '1002': { name: 'Prabhat (Product Manager)', avatar: '/prabhat.jpg' },
  '1003': { name: 'Madhur (Security Lead)', avatar: '/madhur.jpg' },
};

function getInterviewerAvatar(speakerName?: string, uidStr?: string): string {
  if (uidStr && PANELIST_LABELS[uidStr]) {
    return PANELIST_LABELS[uidStr].avatar;
  }
  if (speakerName) {
    if (speakerName.includes('Prabhat')) return '/prabhat.jpg';
    if (speakerName.includes('Madhur')) return '/madhur.jpg';
    if (speakerName.includes('Neerja') || speakerName.includes('Shravya')) return '/shravya.jpg';
  }
  return '/shravya.jpg';
}

export function QuickstartTranscriptPanel({
  messageList,
  currentInProgressMessage,
  agentUID,
  candidateUID,
}: QuickstartTranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = useMemo(
    () =>
      currentInProgressMessage
        ? [...messageList, currentInProgressMessage]
        : messageList,
    [currentInProgressMessage, messageList],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  return (
    <section
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/60 shadow-sm backdrop-blur-sm"
      aria-label="Transcription panel"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Transcript</h2>
          <p className="text-xs text-muted-foreground">Live multi-agent turns</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Start speaking to see the live transcript here.
          </div>
        ) : (
          messages.map((message, index) => {
            const uidStr = String(message.uid);
            const isKnownPanelist = uidStr === '1001' || uidStr === '1002' || uidStr === '1003';
            const isAgent =
              isKnownPanelist ||
              uidStr === agentUID ||
              (candidateUID ? uidStr !== candidateUID : false) ||
              !!message.speakerName;

            let label = 'You';
            let labelColor = 'text-primary';

            if (message.speakerName) {
              label = message.speakerName;
              labelColor = 'text-foreground font-semibold';
            } else if (PANELIST_LABELS[uidStr]) {
              label = PANELIST_LABELS[uidStr].name;
              labelColor = 'text-foreground font-semibold';
            } else if (isAgent) {
              label = 'Interviewer';
              labelColor = 'text-foreground font-semibold';
            }

            const text = message.text?.trim();
            const time = formatMessageTime(message.createdAt);
            const avatarUrl = isAgent ? getInterviewerAvatar(message.speakerName, uidStr) : null;

            return (
              <article
                key={`${message.turn_id ?? message.uid}-${index}`}
                className={`flex gap-2.5 ${isAgent ? 'flex-row items-start' : 'flex-row-reverse items-start'}`}
              >
                {/* Avatar Icon / Photo */}
                {isAgent ? (
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-primary/40 mt-1" aria-hidden="true">
                    <Image
                      src={avatarUrl || '/shravya.jpg'}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/20 text-primary mt-1" aria-hidden="true">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </div>
                )}

                <div className={`flex flex-col max-w-[85%] ${isAgent ? 'items-start' : 'items-end'}`}>
                  <div className={`mb-1 flex items-center gap-2 px-1 text-xs ${labelColor}`}>
                    <span>{label}</span>
                    {time && <span className="font-normal text-muted-foreground">{time}</span>}
                  </div>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
                      isAgent
                        ? 'border border-border bg-card/90 text-foreground'
                        : 'border border-primary/30 bg-primary/10 text-foreground'
                    }`}
                  >
                    {text || '...'}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
