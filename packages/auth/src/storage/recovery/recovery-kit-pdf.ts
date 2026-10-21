import { PageSizes, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function createRecoveryKit(code: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const [regular, bold, monospace] = await Promise.all([
    document.embedFont(StandardFonts.Helvetica),
    document.embedFont(StandardFonts.HelveticaBold),
    document.embedFont(StandardFonts.CourierBold),
  ]);
  const page = document.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  const margin = 48;
  const contentWidth = width - margin * 2;
  const textColor = rgb(0.08, 0.08, 0.08);
  const mutedColor = rgb(0.4, 0.4, 0.4);

  document.setTitle('Comitium recovery kit');
  document.setAuthor('Comitium');
  page.setFont(regular);
  page.setFontSize(11);
  page.setFontColor(textColor);

  page.drawText('Comitium', { x: margin, y: height - 56, font: bold, size: 18, color: rgb(0, 0.4, 0.95) });
  page.drawText('Recovery kit', { x: margin, y: height - 108, font: bold, size: 26 });
  page.drawText('Use this code if you forget your password.', { x: margin, y: height - 136, color: mutedColor });
  page.drawText('Recovery code', { x: margin, y: height - 190, font: bold });
  page.drawRectangle({
    x: margin,
    y: height - 272,
    width: contentWidth,
    height: 64,
    color: rgb(0.96, 0.96, 0.97),
  });
  page.drawText(code, {
    x: (width - monospace.widthOfTextAtSize(code, 17)) / 2,
    y: height - 249,
    font: monospace,
    size: 17,
  });

  page.drawText('How to recover', { x: margin, y: height - 320, font: bold, size: 14 });
  page.drawText(
    '1. Log in to Comitium.\n2. Choose Forgot password and enter your recovery code.\n3. Create a new password and save your new recovery code.',
    { x: margin, y: height - 348, lineHeight: 22, maxWidth: contentWidth },
  );

  page.drawText('Keep this kit private', { x: margin, y: height - 450, font: bold, size: 14 });
  page.drawText(
    'Store it somewhere safe outside Comitium. Anyone with this code and access to your account can open your encrypted data. If you generate a new recovery code, replace this kit.',
    { x: margin, y: height - 474, lineHeight: 18, maxWidth: contentWidth },
  );
  page.drawText('Complete setup in Comitium to activate this code.', {
    x: margin,
    y: height - 580,
    color: mutedColor,
  });
  page.drawText('comitium.co', { x: margin, y: margin, size: 10, color: mutedColor });

  return document.save();
}
