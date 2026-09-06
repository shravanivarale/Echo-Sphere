'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

type QuickstartConversationLayoutProps = {
  statusPanel: ReactNode;
  pipelineMetrics: ReactNode;
  /** Optional phase badge rendered in the header. Pass null/undefined to hide. */
  phaseIndicator?: ReactNode;
  transcriptPanel: ReactNode;
  visualizer: ReactNode;
  controls: ReactNode;
  onEndConversation: () => void;
};

export function QuickstartConversationLayout({
  statusPanel,
  pipelineMetrics,
  phaseIndicator,
  transcriptPanel,
  visualizer,
  controls,
  onEndConversation,
}: QuickstartConversationLayoutProps) {
  // Provide safe defaults to avoid React rendering undefined (error #130)
  const _statusPanel = statusPanel ?? null;
  const _pipelineMetrics = pipelineMetrics ?? null;
  const _phaseIndicator = phaseIndicator ?? null;
  const _transcriptPanel = transcriptPanel ?? null;
  const _visualizer = visualizer ?? null;
  const _controls = controls ?? null;
  const _onEndConversation = onEndConversation ?? (() => {});

  return (
    <div className="flex min-h-0 flex-1 flex-col text-left">
      <header className="flex shrink-0 flex-col gap-4 border-b border-border px-4 py-4 md:h-[76px] md:flex-row md:items-center md:justify-between md:px-6 md:py-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-36 shrink-0">
            <Image
              src="/shravya-logo.png"
              alt="Shravya"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <div className="hidden min-w-0 flex-col justify-center gap-1 sm:flex">
            {_pipelineMetrics}
          </div>
        </div>

        <div className="flex items-center gap-2 md:pr-1">
          {_phaseIndicator}
          {_statusPanel}
          <Button
            variant="destructive"
            size="sm"
            className="h-8 rounded-md border border-destructive bg-transparent px-3 text-xs font-medium text-destructive hover:bg-destructive/10"
            onClick={_onEndConversation}
            aria-label="End conversation with AI agent"
            title="End conversation"
          >
            End Conversation
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 px-4 pb-4 pt-4 md:px-6 lg:flex-row lg:gap-0">
        <aside className="order-2 h-64 min-h-0 w-full shrink-0 lg:order-1 lg:h-full lg:w-[26rem]">
          {_transcriptPanel}
        </aside>

        <main className="order-1 flex min-h-0 flex-1 flex-col lg:order-2 lg:border-l lg:border-border/80 lg:pl-6">
          <div className="flex min-h-0 flex-1 flex-col pb-2 pt-3 md:pb-6">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              {_visualizer}
            </div>
            <div className="shrink-0 pt-4">{_controls}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
