import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'csv', 'json', 'md', 'xlsx'] as const;
type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export interface ParsedFileResult {
  success: boolean;
  text: string;
  error?: string;
  metadata: {
    name: string;
    size: number;
    type: string;
    extension: string;
    charCount: number;
    lineCount: number;
  };
}

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function isSupportedExtension(ext: string): ext is SupportedExtension {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parseXlsx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (workbook.SheetNames.length > 1) {
      sections.push(`--- Sheet: ${sheetName} ---\n${csv}`);
    } else {
      sections.push(csv);
    }
  }

  return sections.join('\n\n');
}

async function parseTextFile(file: File): Promise<string> {
  return file.text();
}

export async function parseFile(file: File): Promise<ParsedFileResult> {
  const extension = getExtension(file.name);

  const makeResult = (success: boolean, text: string, error?: string): ParsedFileResult => ({
    success,
    text,
    error,
    metadata: {
      name: file.name,
      size: file.size,
      type: file.type || extension,
      extension,
      charCount: text.length,
      lineCount: text ? text.split('\n').length : 0,
    },
  });

  if (file.size > MAX_FILE_SIZE) {
    return makeResult(false, '', `File exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
  }

  if (!isSupportedExtension(extension)) {
    return makeResult(
      false,
      '',
      `Unsupported format ".${extension}". Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`
    );
  }

  try {
    let text: string;

    switch (extension) {
      case 'pdf':
        text = await parsePdf(file);
        break;
      case 'docx':
        text = await parseDocx(file);
        break;
      case 'xlsx':
        text = await parseXlsx(file);
        break;
      default:
        text = await parseTextFile(file);
        break;
    }

    return makeResult(true, text);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    return makeResult(false, '', `Failed to parse ${file.name}: ${message}`);
  }
}
