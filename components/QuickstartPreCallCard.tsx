'use client';

import { useState } from 'react';
import { Loader2, Briefcase, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllJobRoles, getJobRoleById } from '@/lib/job-roles';

export interface PreCallFormData {
  candidateName: string;
  appliedRole: string;
  jobDescription: string;
}

type QuickstartPreCallCardProps = {
  isLoading: boolean;
  error: string | null;
  onStartConversation: (data: PreCallFormData) => void;
};

export function QuickstartPreCallCard({
  isLoading,
  error,
  onStartConversation,
}: QuickstartPreCallCardProps) {
  const catalog = getAllJobRoles();
  const [candidateName, setCandidateName] = useState('');
  const [appliedRole, setAppliedRole] = useState(catalog[0].id);
  const [jobDescription, setJobDescription] = useState(catalog[0].defaultJobDescription);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRoleChange = (roleId: string) => {
    setAppliedRole(roleId);
    const roleDef = getJobRoleById(roleId);
    setJobDescription(roleDef.defaultJobDescription);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      setValidationError('Candidate name is required.');
      return;
    }
    setValidationError(null);
    onStartConversation({
      candidateName: candidateName.trim(),
      appliedRole,
      jobDescription: jobDescription.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-[min(94vw,34rem)] animate-fade-up flex-col rounded-[20px] border border-[#2b2b2b] px-6 py-8 text-left shadow-[0_10px_24px_rgba(0,0,0,0.28)] md:px-8 md:py-8"
      style={{
        backgroundImage:
          'linear-gradient(164.988deg, rgba(54,54,54,0.2) 1.0596%, rgba(0,0,0,0) 96.089%), linear-gradient(90deg, rgb(16,16,16) 0%, rgb(16,16,16) 100%)',
      }}
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">EchoSphere Interview Panel</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            3-Agent AI Technical Panel (Ada, Alex, Marcus)
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* Candidate Name Input */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <User className="h-3.5 w-3.5 text-primary" />
            Candidate Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            placeholder="e.g. Jane Doe"
            className="w-full rounded-md border border-border bg-black/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {/* Applied Job Role Dropdown */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            Target Job Role
          </label>
          <select
            value={appliedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full rounded-md border border-border bg-black/40 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {catalog.map((role) => (
              <option key={role.id} value={role.id} className="bg-background text-foreground">
                {role.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Job Description Textarea */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            Job Description (Editable Context)
          </label>
          <textarea
            rows={5}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full rounded-md border border-border bg-black/40 px-3 py-2 text-xs font-mono leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {(validationError || error) && (
        <p className="mt-3 text-xs text-destructive">{validationError || error}</p>
      )}

      <Button
        type="submit"
        disabled={isLoading || !candidateName.trim()}
        className="mt-6 h-10 w-full rounded-lg border border-primary bg-primary text-sm font-medium text-black hover:border-white hover:bg-white hover:text-black disabled:hover:border-primary disabled:hover:bg-primary disabled:hover:text-black"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Initializing Panel...
          </>
        ) : (
          'Begin Technical Interview'
        )}
      </Button>
    </form>
  );
}
