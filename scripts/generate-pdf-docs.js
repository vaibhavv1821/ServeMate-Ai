import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const outputPdfPath = path.join(docsDir, 'ServMate-Complete-Technical-Documentation.pdf');

async function generatePDF() {
  console.log('Generating ServMate Technical Documentation PDF...');

  const docFiles = fs.readdirSync(docsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    bufferPages: true
  });

  const writeStream = fs.createWriteStream(outputPdfPath);
  doc.pipe(writeStream);

  // Cover Title
  doc.fontSize(28).fillColor('#1E293B').text('ServMate', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor('#3B82F6').text('Complete Technical Documentation', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#64748B').text('AI-Assisted Hyperlocal Service Marketplace', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#94A3B8').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.moveDown(2);
  doc.rect(50, doc.y, 495, 2).fill('#E2E8F0');
  doc.moveDown(2);

  // Document Content
  for (const file of docFiles) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    doc.addPage();
    doc.fontSize(18).fillColor('#0F172A').text(file.replace('.md', ''), { underline: false });
    doc.moveDown(0.5);

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.3);
        continue;
      }

      if (trimmed.startsWith('# ')) {
        doc.fontSize(16).fillColor('#1E3A8A').text(trimmed.replace('# ', ''), { bold: true });
        doc.moveDown(0.4);
      } else if (trimmed.startsWith('## ')) {
        doc.fontSize(14).fillColor('#1D4ED8').text(trimmed.replace('## ', ''), { bold: true });
        doc.moveDown(0.3);
      } else if (trimmed.startsWith('### ')) {
        doc.fontSize(12).fillColor('#2563EB').text(trimmed.replace('### ', ''), { bold: true });
        doc.moveDown(0.2);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        doc.fontSize(10).fillColor('#334155').text(`  • ${trimmed.substring(2)}`);
      } else if (trimmed.startsWith('```')) {
        doc.fontSize(9).fillColor('#475569').text(trimmed, { oblique: true });
      } else {
        doc.fontSize(10).fillColor('#334155').text(trimmed, { align: 'left' });
      }
    }
  }

  // Page Numbers
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#94A3B8').text(
      `ServMate Documentation | Page ${i + 1} of ${range.count}`,
      50,
      doc.page.height - 35,
      { align: 'center', width: doc.page.width - 100 }
    );
  }

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`PDF successfully generated at: ${outputPdfPath}`);
      resolve();
    });
    writeStream.on('error', reject);
  });
}

generatePDF().catch(err => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
