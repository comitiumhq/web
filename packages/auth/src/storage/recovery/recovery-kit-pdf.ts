import { COMITIUM_MARK_PATH } from '@comitium/ui/comitium-mark';
import { breakTextIntoLines, PageSizes, PDFDocument, PDFName, PDFString, rgb, StandardFonts } from 'pdf-lib';

export async function createRecoveryKit(code: string, appOrigin: string, email: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const [regular, bold] = await Promise.all([
    document.embedFont(StandardFonts.Helvetica),
    document.embedFont(StandardFonts.HelveticaBold),
  ]);
  const page = document.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  const margin = 52;
  const contentWidth = width - margin * 2;
  const ink = rgb(0.04, 0.04, 0.04);
  const muted = rgb(0.38, 0.38, 0.38);
  const blue = rgb(0, 0.4, 0.95);
  const panel = rgb(0.96, 0.96, 0.96);
  const recoveryPage = new URL('/account/recovery', appOrigin);
  const recoveryAddress = `${recoveryPage.host}${recoveryPage.pathname}`;
  const savedOn = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date());

  document.setTitle('Comitium recovery kit');
  document.setAuthor('Comitium');
  page.setFont(regular);
  page.setFontSize(12);
  page.setFontColor(ink);

  page.drawSvgPath(COMITIUM_MARK_PATH, { x: margin, y: height - 52, scale: 28 / 1080, color: ink });
  page.drawText('Comitium', { x: margin + 37, y: height - 74, font: bold, size: 22 });

  const accountWidth = contentWidth - 180;
  let emailSize = 10;
  let emailLines = breakTextIntoLines(email, [''], accountWidth, (text) => regular.widthOfTextAtSize(text, emailSize));

  while (emailLines.length * (emailSize + 3) > 64) {
    emailSize -= 1;
    emailLines = breakTextIntoLines(email, [''], accountWidth, (text) => regular.widthOfTextAtSize(text, emailSize));
  }

  for (const [index, line] of emailLines.entries()) {
    page.drawText(line, {
      x: width - margin - regular.widthOfTextAtSize(line, emailSize),
      y: height - 58 - index * (emailSize + 3),
      size: emailSize,
      color: ink,
    });
  }

  page.drawText(savedOn, {
    x: width - margin - regular.widthOfTextAtSize(savedOn, 10),
    y: height - 65 - emailLines.length * (emailSize + 3),
    size: 10,
    color: muted,
  });

  page.drawText('Recovery kit', { x: margin, y: height - 174, font: bold, size: 32 });
  page.drawText('Recover your encrypted data if you forget your password.', {
    x: margin,
    y: height - 205,
    size: 14,
    color: muted,
  });

  page.drawSvgPath(
    `M 14 0 H ${contentWidth - 14} Q ${contentWidth} 0 ${contentWidth} 14 V 150 Q ${contentWidth} 164 ${contentWidth - 14} 164 H 14 Q 0 164 0 150 V 14 Q 0 0 14 0 Z`,
    { x: margin, y: height - 265, color: panel },
  );
  page.drawText('Recovery code', { x: margin + 24, y: height - 300, font: bold, size: 12, color: muted });

  let codeWidth = 0;

  for (const character of code) {
    codeWidth += bold.widthOfTextAtSize(character, 1);
  }

  const codeSize = Math.min(23, (contentWidth - 48) / codeWidth);

  page.drawText(code, {
    x: margin + 24,
    y: height - 369,
    font: bold,
    size: codeSize,
    color: ink,
  });

  page.drawText('Recover your data', { x: margin, y: height - 518, font: bold, size: 14 });
  page.drawText(recoveryAddress, { x: margin, y: height - 548, size: 13, color: blue });

  const link = document.context.register(
    document.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [margin, height - 552, margin + regular.widthOfTextAtSize(recoveryAddress, 13), height - 535],
      Border: [0, 0, 0],
      A: { S: 'URI', URI: PDFString.of(recoveryPage.href) },
    }),
  );

  page.node.set(PDFName.of('Annots'), document.context.obj([link]));
  page.drawText('Sign in, open Password > Change, then select Forgot password?', {
    x: margin,
    y: height - 580,
    lineHeight: 18,
    maxWidth: contentWidth,
    color: muted,
  });

  page.drawLine({
    start: { x: margin, y: 112 },
    end: { x: width - margin, y: 112 },
    color: rgb(0.86, 0.86, 0.86),
  });
  page.drawText(
    'Keep this code private and store it outside Comitium.\nReplace this document whenever you replace your recovery code.',
    {
      x: margin,
      y: 88,
      size: 10,
      lineHeight: 16,
      color: muted,
    },
  );

  return document.save();
}
