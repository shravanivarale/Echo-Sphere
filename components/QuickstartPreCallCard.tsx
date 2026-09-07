'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Briefcase, FileText, UploadCloud, CheckCircle2, X, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllJobRoles, getJobRoleById, type JobRoleDefinition } from '@/lib/job-roles';

export interface PreCallFormData {
  candidateName: string;
  appliedRole: string;
  jobDescription: string;
  resumeText?: string;
  fileName?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [appliedRole, setAppliedRole] = useState(catalog[0].id);
  const [selectedRoleDef, setSelectedRoleDef] = useState<JobRoleDefinition>(catalog[0]);
  const [jobDescription, setJobDescription] = useState(catalog[0].defaultJobDescription);
  const [candidateName, setCandidateName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleRoleChange = (roleId: string) => {
    setAppliedRole(roleId);
    const roleDef = getJobRoleById(roleId);
    setSelectedRoleDef(roleDef);
    setJobDescription(roleDef.defaultJobDescription);
  };

  const handleFileProcess = async (file: File) => {
    setValidationError(null);
    setIsParsing(true);

    try {
      // PDF files are now accepted; they will be processed by the resume parser.
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      // If the response is not OK, read the body as text first and try to extract a useful error message
      if (!res.ok) {
        let errorMessage = 'Failed to parse resume (non‑JSON response)';
        const errText = await res.text();
        try {
          const parsed = JSON.parse(errText);
          if (parsed && typeof parsed.error === 'string') {
            errorMessage = parsed.error;
          } else {
            errorMessage = errText;
          }
        } catch {
          // Not JSON – use raw text (could be plain error string)
          if (errText) errorMessage = errText;
        }
        throw new Error(errorMessage);
      }

      // Parse JSON only when the response is successful
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to parse resume');
      }

      const extractedName = data.candidateName?.trim() || 'Candidate';
      setCandidateName(extractedName);
      setResumeText(data.resumeText || '');
      setUploadedFileName(file.name);
    } catch (err: any) {
      console.error('Resume parsing error:', err);
      setValidationError(err.message || 'Error processing resume file. Please upload PDF, DOCX, or TXT.');
      setCandidateName('');
      setResumeText('');
      setUploadedFileName('');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleRemoveResume = () => {
    setCandidateName('');
    setResumeText('');
    setUploadedFileName('');
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText || !uploadedFileName) {
      setValidationError('Please upload your resume to begin the interview.');
      return;
    }
    setValidationError(null);
    onStartConversation({
      candidateName: candidateName.trim() || 'Candidate',
      appliedRole,
      jobDescription: jobDescription.trim(),
      resumeText,
      fileName: uploadedFileName,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-[min(94vw,36rem)] animate-fade-up flex-col rounded-[24px] border border-border bg-card px-6 py-7 text-left shadow-[0_16px_40px_rgba(11,18,32,0.7)] md:px-8 md:py-8"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(34,211,238,0.04) 0%, rgba(21,31,50,0.98) 100%)',
      }}
    >
      {/* Brand Header with Logo & Agent Avatars */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div className="flex items-center justify-between">
          <div className="relative h-12 w-44">
            <Image
              src="/shravya-logo.png"
              alt="Shravya - AI Technical Interview Platform"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            3-Agent Voice Panel
          </span>
        </div>

        {/* Panelists Showcase with real photos */}
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5">
          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-cyan-400/60 ring-1 ring-cyan-400/30">
              <Image src="/shravya.jpg" alt="Neerja" fill className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs font-bold text-foreground">Neerja</span>
                <span className="text-[8px] font-bold text-cyan-400 bg-cyan-950/60 px-1 rounded">F</span>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">Architect</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-indigo-400/60 ring-1 ring-indigo-400/30">
              <Image src="/prabhat.jpg" alt="Prabhat" fill className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs font-bold text-foreground">Prabhat</span>
                <span className="text-[8px] font-bold text-indigo-400 bg-indigo-950/60 px-1 rounded">M</span>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">Product</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-emerald-400/60 ring-1 ring-emerald-400/30">
              <Image src="/madhur.jpg" alt="Madhur" fill className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs font-bold text-foreground">Madhur</span>
                <span className="text-[8px] font-bold text-emerald-400 bg-emerald-950/60 px-1 rounded">M</span>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">Security</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* Resume Upload Dropzone */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground">
            <span className="flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-primary" />
              Candidate Resume <span className="text-destructive">*</span>
            </span>
            <span className="text-[11px] text-muted-foreground">PDF, DOCX, TXT</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="resume-upload-input"
          />

          {isParsing ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-primary/60 bg-primary/5 p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="mt-2 text-xs font-medium text-foreground">Analyzing resume & extracting candidate profile...</p>
              <p className="text-[11px] text-muted-foreground">Extracting experience, skills, and identity</p>
            </div>
          ) : uploadedFileName ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-card/70 p-3.5">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {candidateName || 'Candidate Profile'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {uploadedFileName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveResume}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                title="Remove resume"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card/50 hover:border-primary/60 hover:bg-card/80'
              }`}
            >
              <UploadCloud className="h-6 w-6 text-primary" />
              <p className="mt-2 text-xs font-medium text-foreground">
                <span className="text-primary underline">Click to upload</span> or drag and drop
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Name & technical background will be auto-detected
              </p>
            </div>
          )}
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
            className="w-full rounded-md border border-border bg-card/70 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {catalog.map((role) => (
              <option key={role.id} value={role.id} className="bg-card text-foreground">
                {role.profileLabel ?? role.displayName}
              </option>
            ))}
          </select>

          {/* Role detail panel — requirements & interview focus */}
          {(selectedRoleDef.requirements.length > 0 || selectedRoleDef.interviewFocus) && (
            <div className="mt-2 rounded-md border border-border/70 bg-card/50 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1.5">
              {selectedRoleDef.requirements.length > 0 && (
                <div>
                  <span className="font-semibold text-foreground/80">Requirements: </span>
                  {selectedRoleDef.requirements.join(' · ')}
                </div>
              )}
              {selectedRoleDef.interviewFocus && (
                <div>
                  <span className="font-semibold text-foreground/80">Interview focus: </span>
                  {selectedRoleDef.interviewFocus}
                </div>
              )}
            </div>
          )}
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
            className="w-full rounded-md border border-border bg-card/70 px-3 py-2 text-xs font-mono leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {(validationError || error) && (
        <p className="mt-3 text-xs text-destructive">{validationError || error}</p>
      )}

      <Button
        type="submit"
        disabled={isLoading || isParsing || !uploadedFileName}
        className="mt-6 h-10 w-full rounded-lg border border-primary bg-primary text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none"
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
