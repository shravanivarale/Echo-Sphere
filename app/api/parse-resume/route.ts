import { NextRequest, NextResponse } from 'next/server';
import {
  extractResumeText,
  cleanResumeText,
  extractCandidateName,
} from '@/lib/resume-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Field name must be "file".' },
        { status: 400 },
      );
    }

    const rawText = await extractResumeText(file, file.type);
    const cleaned = cleanResumeText(rawText);
    const resumeText =
      cleaned.length > 0
        ? cleaned
        : `Resume uploaded: ${file.name}. Candidate profile for technical interview.`;
    const candidateName = extractCandidateName(rawText, file.name);

    return NextResponse.json({ success: true, candidateName, resumeText });
  } catch (error) {
    console.error('Error parsing resume:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to parse resume',
      },
      { status: 400 },
    );
  }
}