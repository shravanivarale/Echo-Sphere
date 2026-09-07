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
export function extractCandidateName(resumeText: string, fileName?: string): string {
  if (resumeText) {
    const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (const line of lines.slice(0, 20)) {
      const match = line.match(/^name\s*[:：\-]\s*(.+)$/i);
      if (match && match[1].trim()) return cleanName(match[1].trim());
    }

    for (const line of lines.slice(0, 15)) {
      const cleaned = cleanName(line);
      if (!cleaned) continue;
      const words = cleaned.split(/\s+/);
      if (words.length >= 1 && words.length <= 4) {
        if (!EMAIL_RE.test(line) && !PHONE_RE.test(line) && !URL_RE.test(line) && !/\d/.test(line)) {
          if (!words.some((w) => BOILERPLATE.has(w.toLowerCase()))) {
            const candidate = cleaned.replace(/^[•\-\*\|]\s*/, '').trim();
            if (candidate.length >= 2 && candidate.length <= 40) {
              return candidate;
            }
          }
        }
      }
    }
  }

  // Fallback to filename (e.g. "Shravani_Varale_Resume.pdf" -> "Shravani Varale")
  if (fileName) {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const cleanBase = baseName
      .replace(/[_-]+/g, ' ')
      .replace(/\b(resume|cv|profile|latest|v\d+|\d+|final|updated|draft)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanBase.length >= 2) {
      return cleanBase
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return 'Candidate';
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
 * Extracts text from a PDF buffer using pdf-parse v2 PDFParse class (Next.js-safe).
 */
async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const nodeBuf = Buffer.from(buffer);

  // Method 1: pdf-parse v2 PDFParse class
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule: any = await import('pdf-parse');
    const PDFParseClass =
      pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule;

    if (typeof PDFParseClass === 'function' && PDFParseClass.prototype?.getText) {
      const parser = new PDFParseClass({ data: nodeBuf });
      const res = await parser.getText();
      if (res && typeof res.text === 'string' && res.text.trim()) {
        return res.text.trim();
      }
    }

    if (typeof pdfParseModule === 'function') {
      const res = await pdfParseModule(nodeBuf);
      if (res && typeof res.text === 'string' && res.text.trim()) {
        return res.text.trim();
      }
    }
  } catch (err) {
    console.warn('[ResumeParser] pdf-parse parser attempt failed:', err);
  }

  // Method 2: Stream text regex fallback for text-encoded PDFs
  try {
    const raw = nodeBuf.toString('binary');
    const textChunks: string[] = [];
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(raw)) !== null) {
      if (tjMatch[1] && tjMatch[1].length > 1) {
        textChunks.push(tjMatch[1]);
      }
    }
    if (textChunks.length > 5) {
      return textChunks.join(' ');
    }
  } catch (err) {
    console.warn('[ResumeParser] Stream text fallback failed:', err);
  }

  return '';
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
