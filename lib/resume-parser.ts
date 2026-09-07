/**
 * EchoSphere Resume Parser (Server-side)
 * Extracts candidate name and raw resume text. Supports PDF, DOCX, TXT.
 *
 * Uses pdfjs-dist (legacy Node.js build) for PDF parsing and mammoth for DOCX.
 */

import path from 'path';
import { pathToFileURL } from 'url';


export interface ParsedResume {
  candidateName: string;
  resumeText: string;
}

export async function parseResumeFile(file: File | Blob): Promise<ParsedResume> {
  const rawText = await extractResumeText(file);
  const resumeText = cleanResumeText(rawText);
  const candidateName = extractCandidateName(rawText);
  return { candidateName, resumeText };
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const URL_RE = /(?:https?:\/\/|www\.)\S+/i;
const BOILERPLATE = new Set([
  'resume', 'curriculum', 'vitae', 'cv', 'summary', 'profile', 'contact',
  'objective', 'experience', 'education', 'skills', 'projects',
  'certifications', 'languages', 'references',
]);

function cleanName(raw: string): string {
  return raw
    .replace(/^name\s*[:：]\s*/i, '')
    .replace(/[.,;]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the candidate's full name from raw resume text.
 * Looks for an explicit "Name:" label, then falls back to the first
 * plausible capitalized 2-4 word line near the top of the document.
 */
export function extractCandidateName(resumeText: string): string {
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines.slice(0, 20)) {
    const match = line.match(/^name\s*[:：]\s*(.+)$/i);
    if (match && match[1].trim()) return cleanName(match[1].trim());
  }

  for (const line of lines.slice(0, 12)) {
    const cleaned = cleanName(line);
    if (!cleaned) continue;
    const words = cleaned.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) continue;
    if (/\d/.test(line)) continue;
    if (words.some((w) => BOILERPLATE.has(w.toLowerCase()))) continue;
    if (!words.every((w) => /^[A-Z]/.test(w))) continue;
    return cleaned;
  }

  return '';
}

/**
 * Strips contact details and normalizes whitespace in resume text,
 * capping at `maxLength` characters for safe LLM embedding.
 */
export function cleanResumeText(raw: string, maxLength = 6000): string {
  return raw
    .replace(EMAIL_RE, '')
    .replace(PHONE_RE, '')
    .replace(URL_RE, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

/**
 * Extracts text from a PDF buffer using pdfjs-dist (Next.js-safe).
 * Extracts text from a PDF buffer using pdf-parse (Next.js-safe).
 */
async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const nodeBuf = Buffer.from(buffer);
    if (typeof pdfParse === 'function') {
      const data = await pdfParse(nodeBuf);
      return data.text || '';
    } else if (pdfParse?.PDFParser) {
      const parser = new pdfParse.PDFParser();
      const data = await parser.parse(nodeBuf);
      return data?.text || '';
    }
    return '';
  } catch (err) {
    console.warn('[ResumeParser] PDF parsing fallback:', err);
    return '';
  }
}

/**
 * Decodes a resume file (PDF, DOCX, or TXT) into raw text.
 */
export async function extractResumeText(
  file: File | Blob,
  mimeType?: string,
): Promise<string> {
  const type = (mimeType || file.type || '').toLowerCase();
  const name = (file as File).name?.toLowerCase() || '';

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    return extractPdfText(buffer);
  }

  if (
    type.includes('word') ||
    type.includes('docx') ||
    type.includes('officedocument.wordprocessingml') ||
    name.endsWith('.docx')
  ) {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (docxErr: unknown) {
      const msg = docxErr instanceof Error ? docxErr.message : 'Invalid or corrupted document';
      throw new Error(`Failed to parse DOCX file: ${msg}`);
    }
  }

  if (
    type === 'text/plain' ||
    type === 'text/markdown' ||
    name.endsWith('.txt') ||
    name.endsWith('.md')
  ) {
    return await file.text();
  }

  throw new Error(
    `Unsupported resume format: "${type || 'unknown'}". Supported: PDF, DOCX, TXT.`,
  );
}
