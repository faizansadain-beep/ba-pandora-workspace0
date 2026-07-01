import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

/**
 * Enterprise Excel Export Engine
 * @param data Array of objects containing the formatted rows
 * @param sheetName Name of the sheet inside the workbook
 * @param fileName Desired output filename (without extension)
 * @param columnWidths Optional array specifying column widths, e.g., [{ wch: 15 }, { wch: 30 }]
 */
export function exportToExcel(
  data: Record<string, any>[],
  sheetName: string,
  fileName: string,
  columnWidths?: { wch: number }[]
) {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  if (columnWidths) {
    worksheet["!cols"] = columnWidths;
  } else {
    // Default auto-width fallback based on longest header key length
    const keys = Object.keys(data[0]);
    worksheet["!cols"] = keys.map(key => ({ wch: Math.max(key.length + 4, 15) }));
  }

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  
  saveAs(blob, `${fileName.replace(/\s+/g, "_")}.xlsx`);
}

interface WordSectionData {
  id: string;
  title: string;
  details: { label: string; value: string; isMeta?: boolean; color?: string }[];
}

/**
 * Professional Executive Word Document Brief Engine
 * @param reportTitle Title header at the very top of the page
 * @param projectName Context project name
 * @param items Structured section pieces to loop through and print
 * @param fileName Desired output filename (without extension)
 */
export function exportToWordBrief(
  reportTitle: string,
  projectName: string,
  items: WordSectionData[],
  fileName: string
) {
  if (!items || items.length === 0) {
    alert("No data available to export.");
    return;
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: reportTitle,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: `Project: ${projectName} | Generated: ${new Date().toLocaleDateString()}`,
          spacing: { after: 400 }
        }),

        ...items.flatMap((item) => {
          // Break meta details (like priority/status) out into a side-by-side string array
          const metaItems = item.details.filter(d => d.isMeta);
          const blockContent = item.details.filter(d => !d.isMeta);

          const paragraphs = [
            new Paragraph({
              text: `${item.id}: ${item.title}`,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 }
            })
          ];

          if (metaItems.length > 0) {
            paragraphs.push(
              new Paragraph({
                children: metaItems.flatMap(m => [
                  new TextRun({ text: `${m.label}: `, bold: true }),
                  new TextRun({ text: `${m.value}     ` })
                ]),
                spacing: { after: 120 }
              })
            );
          }

          blockContent.forEach(block => {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${block.label}:\n`, bold: true, color: block.color || "444444" }),
                  new TextRun({ text: block.value || "None provided." })
                ],
                spacing: { after: 120 }
              })
            );
          });

          paragraphs.push(
            new Paragraph({ text: "──────────────────────────────────────────────────", spacing: { before: 120, after: 120 } })
          );

          return paragraphs;
        })
      ]
    }]
  });

  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `${fileName.replace(/\s+/g, "_")}.docx`);
  });
}