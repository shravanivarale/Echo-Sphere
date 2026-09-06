import { extractResumeText, extractCandidateName, cleanResumeText } from '../lib/resume-parser';

async function testResumeParser() {
  console.log('Testing extractResumeText with mock PDF file...');
  const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT
/F1 24 Tf
100 700 Td
(Jane Doe Software Engineer) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000242 00000 n 
0000000347 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
426
%%EOF`;

  const blob = new Blob([minimalPdf], { type: 'application/pdf' });
  const rawText = await extractResumeText(blob, 'application/pdf');
  console.log('Extracted raw text:', JSON.stringify(rawText));

  const name = extractCandidateName(rawText);
  console.log('Extracted name:', JSON.stringify(name));

  const cleaned = cleanResumeText(rawText);
  console.log('Cleaned text:', JSON.stringify(cleaned));

  if (!rawText.includes('Jane Doe')) {
    throw new Error('Failed to extract Jane Doe from PDF');
  }

  console.log('SUCCESS! PDF parsing works without error!');
}

testResumeParser();
