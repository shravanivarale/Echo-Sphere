'use client';

import { useMemo } from 'react';
import type { InterviewSession } from '@/types/interview';

interface InterviewResultsViewProps {
  session: InterviewSession;
  onRestart: () => void;
}

export function InterviewResultsView({
  session,
  onRestart,
}: InterviewResultsViewProps) {
  const evaluation = session.evaluation;

  // Format endedAt date for display
  const formattedEndedAt = useMemo(() => {
    if (!session.endedAt) return 'Just now';
    try {
      return new Date(session.endedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return session.endedAt;
    }
  }, [session.endedAt]);

  // Color helper based on score scale (0-10)
  const getScoreColor = (score: number) => {
    if (score >= 8.0) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 6.0) return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
    if (score >= 4.0) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-red-500 bg-red-500/10 border-red-500/30';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 8.0) return 'bg-emerald-500';
    if (score >= 6.0) return 'bg-blue-500';
    if (score >= 4.0) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (!evaluation) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">No evaluation data available for this session.</p>
        <button
          onClick={onRestart}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      {/* Top Header Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Interview Finalized
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Candidate Evaluation Report
            </h1>
            <p className="text-sm text-muted-foreground">
              Session ID: <code className="font-mono text-foreground">{session.sessionId}</code> • Completed {formattedEndedAt}
            </p>
          </div>
          <button
            onClick={onRestart}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Start New Interview
          </button>
        </div>
      </div>

      {/* Score & Recommendation Banner */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Overall Score Box */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Overall Score
          </span>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-5xl font-extrabold tracking-tight text-foreground">
              {evaluation.overallScore}
            </span>
            <span className="text-xl font-medium text-muted-foreground">/ 10</span>
          </div>
          <span
            className={`mt-1 rounded-full border px-3 py-0.5 text-xs font-semibold ${getScoreColor(
              evaluation.overallScore,
            )}`}
          >
            {evaluation.overallScore >= 8.0
              ? 'Outstanding'
              : evaluation.overallScore >= 6.0
              ? 'Competent'
              : evaluation.overallScore >= 4.0
              ? 'Developing'
              : 'Unsatisfactory'}
          </span>
        </div>

        {/* Recommendation Box */}
        <div className="flex flex-col justify-center rounded-xl border border-border bg-card p-6 shadow-sm md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hiring Recommendation
          </span>
          <h2 className="mt-1 text-lg font-bold text-foreground">
            {evaluation.recommendation}
          </h2>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Phase Reached: <strong className="text-foreground">{session.currentPhase}</strong></span>
            <span>Turns Analyzed: <strong className="text-foreground">{session.completedCandidateTurns} candidate turn(s)</strong></span>
          </div>
        </div>
      </div>

      {/* 8 Dimension Breakdown */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground">Architectural Dimension Breakdown</h3>
        <p className="text-xs text-muted-foreground">
          Evaluation of technical competencies across system design principles.
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {evaluation.dimensionScores.map((item) => (
            <div
              key={item.dimension}
              className="flex flex-col rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm">
                  {item.dimension}
                </span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {item.score} <span className="text-xs text-muted-foreground">/ 10</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="my-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(
                    item.score,
                  )}`}
                  style={{ width: `${(item.score / 10) * 100}%` }}
                />
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.reasoning}
              </p>

              {item.evidenceTurnIds.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>
                    Evidence: {item.evidenceTurnIds.length} candidate turn(s) referenced
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-500">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <h3 className="font-bold text-foreground text-base">Key Technical Strengths</h3>
          </div>
          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            {evaluation.strengths.map((str, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="text-foreground">{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-amber-500">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="font-bold text-foreground text-base">Areas for Improvement</h3>
          </div>
          <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
            {evaluation.weaknesses.map((weak, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="text-foreground">{weak}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
