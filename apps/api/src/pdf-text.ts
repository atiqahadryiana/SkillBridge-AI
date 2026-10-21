import { PDFParse } from "pdf-parse";

/** Extract locally and always release the parser, including on malformed input. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    return (await parser.getText({ first: 100 })).text;
  } finally {
    await parser.destroy();
  }
}
