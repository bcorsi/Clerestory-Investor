import { NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, LevelFormat, TabStopType, TabStopPosition,
} from 'docx';

// Colliers brand colors
const DARK_BLUE = '00467F';
const LIGHT_BLUE = '0093D0';
const YELLOW = 'FFC425';
const PALE_BLUE = 'DFEFF9';
const LIGHT_GRAY = 'F5F5F5';
const MED_GRAY = 'CCCCCC';

const border = { style: BorderStyle.SINGLE, size: 1, color: MED_GRAY };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function labelCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: PALE_BLUE, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({ text, bold: true, font: 'Arial', size: 18, color: DARK_BLUE })],
    })],
  });
}

function valueCell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({
        text: text || '—',
        font: 'Arial',
        size: 18,
        color: opts.color || '333333',
        bold: opts.bold || false,
      })],
    })],
  });
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DARK_BLUE, space: 4 } },
    children: [new TextRun({ text, bold: true, font: 'Arial', size: 22, color: DARK_BLUE })],
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const p = body.property || {};
    const comps = body.leaseComps || [];
    const saleComps = body.saleComps || [];
    const deals = body.deals || [];

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const colWidths = { label: 2400, value: 7000 };
    const fullWidth = 9400;
    const halfLabel = 2200;
    const halfValue = 2500;

    const children = [];

    // ── TITLE ──
    children.push(new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: 'PROPERTY INTELLIGENCE MEMO', bold: true, font: 'Arial', size: 28, color: DARK_BLUE })],
    }));
    children.push(new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: YELLOW, space: 6 } },
      children: [
        new TextRun({ text: p.address || 'Property', bold: true, font: 'Arial', size: 36, color: '111111' }),
        new TextRun({ text: `  ·  ${p.city || ''}`, font: 'Arial', size: 24, color: '666666' }),
      ],
    }));
    children.push(new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: `Prepared: ${today}  |  Confidential`, font: 'Arial', size: 18, color: '999999', italics: true })],
    }));

    // ── PROPERTY OVERVIEW ──
    children.push(sectionTitle('Property Overview'));
    const overviewRows = [
      ['Address', p.address],
      ['City / Submarket', [p.city, p.submarket].filter(Boolean).join(' · ')],
      ['Record Type', p.record_type],
      ['Property Type', p.prop_type],
      ['Building SF', p.building_sf ? `${Number(p.building_sf).toLocaleString()} SF` : null],
      ['Land Area', p.land_acres ? `${p.land_acres} Acres` : null],
      ['Year Built', p.year_built ? String(p.year_built) : null],
      ['Clear Height', p.clear_height ? `${p.clear_height}'` : null],
      ['Dock Doors / GL Doors', [p.dock_doors ? `${p.dock_doors} Dock` : null, p.grade_doors ? `${p.grade_doors} GL` : null].filter(Boolean).join(' · ') || null],
      ['Zoning', p.zoning],
    ].filter(([, v]) => v);

    if (overviewRows.length) {
      children.push(new Table({
        width: { size: fullWidth, type: WidthType.DXA },
        columnWidths: [colWidths.label, colWidths.value],
        rows: overviewRows.map(([label, value]) =>
          new TableRow({ children: [labelCell(label, colWidths.label), valueCell(value, colWidths.value)] })
        ),
      }));
    }

    // ── OWNERSHIP & TENANCY ──
    children.push(sectionTitle('Ownership & Tenancy'));
    const ownerRows = [
      ['Owner', p.owner],
      ['Owner Type', p.owner_type],
      ['Vacancy Status', p.vacancy_status],
      ['Tenant', p.tenant],
      ['Lease Type', p.lease_type],
      ['Lease Expiration', p.lease_expiration],
      ['In-Place Rent', p.in_place_rent ? `$${Number(p.in_place_rent).toFixed(2)} /SF/Mo` : null],
    ].filter(([, v]) => v);

    if (ownerRows.length) {
      children.push(new Table({
        width: { size: fullWidth, type: WidthType.DXA },
        columnWidths: [colWidths.label, colWidths.value],
        rows: ownerRows.map(([label, value]) =>
          new TableRow({ children: [labelCell(label, colWidths.label), valueCell(value, colWidths.value)] })
        ),
      }));
    }

    // ── CATALYST TAGS ──
    if (p.catalyst_tags?.length) {
      children.push(sectionTitle('Intelligence Signals'));
      children.push(new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({
          text: p.catalyst_tags.join('  ·  '),
          font: 'Arial', size: 20, color: DARK_BLUE, bold: true,
        })],
      }));
      if (p.probability) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: 'Probability Score: ', font: 'Arial', size: 18, color: '666666' }),
            new TextRun({ text: `${p.probability}%`, font: 'Arial', size: 20, color: DARK_BLUE, bold: true }),
          ],
        }));
      }
    }

    // ── APNs ──
    if (p.apns?.length) {
      children.push(sectionTitle('Parcel Information'));
      const apnHeaderRow = new TableRow({
        children: [
          new TableCell({
            borders, width: { size: 4700, type: WidthType.DXA },
            shading: { fill: DARK_BLUE, type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: 'APN', bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })] })],
          }),
          new TableCell({
            borders, width: { size: 4700, type: WidthType.DXA },
            shading: { fill: DARK_BLUE, type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: 'Acres', bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })] })],
          }),
        ],
      });
      const apnRows = p.apns.map(a => new TableRow({
        children: [
          valueCell(a.apn, 4700),
          valueCell(a.acres ? `${a.acres} ac` : '—', 4700),
        ],
      }));
      children.push(new Table({
        width: { size: fullWidth, type: WidthType.DXA },
        columnWidths: [4700, 4700],
        rows: [apnHeaderRow, ...apnRows],
      }));
    }

    // ── NOTES ──
    if (p.notes) {
      children.push(sectionTitle('Notes & Research'));
      p.notes.split('\n').forEach(line => {
        children.push(new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: line, font: 'Arial', size: 18, color: '444444' })],
        }));
      });
    }

    // ── COMPARABLE LEASES ──
    if (comps.length > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(sectionTitle(`Comparable Leases (${comps.length})`));

      const compColWidths = [2200, 1200, 1200, 1000, 800, 800, 800, 1400];
      const compHeader = new TableRow({
        children: ['Address', 'Tenant', 'RSF', 'Rate', 'Type', 'Term', 'FR', 'Start'].map((h, i) =>
          new TableCell({
            borders, width: { size: compColWidths[i], type: WidthType.DXA },
            shading: { fill: DARK_BLUE, type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, font: 'Arial', size: 16, color: 'FFFFFF' })] })],
          })
        ),
      });

      const compRows = comps.slice(0, 25).map(c => new TableRow({
        children: [
          valueCell(c.address, compColWidths[0]),
          valueCell(c.tenant, compColWidths[1]),
          valueCell(c.rsf ? Number(c.rsf).toLocaleString() : null, compColWidths[2]),
          valueCell(c.rate ? `$${Number(c.rate).toFixed(2)}` : null, compColWidths[3], { bold: true, color: DARK_BLUE }),
          valueCell(c.lease_type, compColWidths[4]),
          valueCell(c.term_months ? `${c.term_months} mo` : null, compColWidths[5]),
          valueCell(c.free_rent_months ? `${c.free_rent_months} mo` : null, compColWidths[6]),
          valueCell(c.start_date ? c.start_date.slice(0, 10) : null, compColWidths[7]),
        ],
      }));

      children.push(new Table({
        width: { size: fullWidth, type: WidthType.DXA },
        columnWidths: compColWidths,
        rows: [compHeader, ...compRows],
      }));
    }

    // ── COMPARABLE SALES ──
    if (saleComps.length > 0) {
      children.push(sectionTitle(`Comparable Sales (${saleComps.length})`));
      const saleColWidths = [2000, 1200, 1200, 1200, 1000, 1400, 1400];
      const saleHeader = new TableRow({
        children: ['Address', 'Bldg SF', 'Sale Price', '$/SF', 'Cap', 'Date', 'Buyer'].map((h, i) =>
          new TableCell({
            borders, width: { size: saleColWidths[i], type: WidthType.DXA },
            shading: { fill: DARK_BLUE, type: ShadingType.CLEAR }, margins: cellMargins,
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, font: 'Arial', size: 16, color: 'FFFFFF' })] })],
          })
        ),
      });

      const saleRows = saleComps.slice(0, 20).map(c => new TableRow({
        children: [
          valueCell(c.address, saleColWidths[0]),
          valueCell(c.building_sf ? Number(c.building_sf).toLocaleString() : null, saleColWidths[1]),
          valueCell(c.sale_price ? `$${Number(c.sale_price).toLocaleString()}` : null, saleColWidths[2]),
          valueCell(c.price_psf ? `$${Number(c.price_psf).toFixed(0)}` : null, saleColWidths[3], { bold: true, color: DARK_BLUE }),
          valueCell(c.cap_rate ? `${Number(c.cap_rate).toFixed(2)}%` : null, saleColWidths[4]),
          valueCell(c.sale_date ? c.sale_date.slice(0, 10) : null, saleColWidths[5]),
          valueCell(c.buyer, saleColWidths[6]),
        ],
      }));

      children.push(new Table({
        width: { size: fullWidth, type: WidthType.DXA },
        columnWidths: saleColWidths,
        rows: [saleHeader, ...saleRows],
      }));
    }

    // ── BUILD DOC ──
    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Arial', size: 20 } } },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 28, bold: true, font: 'Arial', color: DARK_BLUE },
            paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 24, bold: true, font: 'Arial', color: DARK_BLUE },
            paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
        ],
      },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1200, bottom: 1080, left: 1200 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 0 },
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: YELLOW, space: 4 } },
              children: [
                new TextRun({ text: 'COLLIERS', bold: true, font: 'Arial', size: 16, color: DARK_BLUE }),
                new TextRun({ text: '  |  Property Intelligence Memo', font: 'Arial', size: 14, color: '999999' }),
              ],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Confidential  |  Colliers International', font: 'Arial', size: 14, color: '999999' })],
            })],
          }),
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${(p.address || 'Property').replace(/[^a-zA-Z0-9]/g, '_')}_Memo.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export memo error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
