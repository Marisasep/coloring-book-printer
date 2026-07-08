import QRCode from "qrcode";

// Landscape ticket: height = 696 (printer width), width = long side
const TICKET_W = 1400;
const TICKET_H = 696;

function applyDithering(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sx: number,
  sy: number,
) {
  const imgData = ctx.getImageData(sx, sy, w, h);
  const d = imgData.data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = gray[i];
      const val = old < 128 ? 0 : 255;
      gray[i] = val;
      const err = old - val;
      if (x + 1 < w) gray[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) gray[i + w - 1] += (err * 3) / 16;
        gray[i + w] += (err * 5) / 16;
        if (x + 1 < w) gray[i + w + 1] += (err * 1) / 16;
      }
    }
  }
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i] > 127 ? 255 : 0;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(imgData, sx, sy);
}

function formatThaiDate(): string {
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  const now = new Date();
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;
}

// Rotate landscape canvas 90° CW → 696 wide (printer compatible)
function rotateForPrint(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.height;  // 696
  out.height = src.width;  // 1400
  const ctx = out.getContext("2d")!;
  ctx.translate(out.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return out;
}

export async function renderLotteryTicket(
  photoCanvas: HTMLCanvasElement,
  ticketNumber: string,
  logoImg: HTMLImageElement,
  viewUrl: string,
): Promise<{ preview: HTMLCanvasElement; print: HTMLCanvasElement }> {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = TICKET_W;
  canvas.height = TICKET_H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TICKET_W, TICKET_H);

  // --- Double border ---
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, TICKET_W - 20, TICKET_H - 20);
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, TICKET_W - 36, TICKET_H - 36);

  // ============================================================
  // LEFT SECTION: Photo → Price → Slogan (stacked vertically)
  // ============================================================
  const photoX = 36;
  const photoY = 36;
  const photoSize = 480;

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(photoX - 2, photoY - 2, photoSize + 4, photoSize + 4);
  ctx.drawImage(
    photoCanvas, 0, 0, photoCanvas.width, photoCanvas.height,
    photoX, photoY, photoSize, photoSize,
  );
  applyDithering(ctx, photoSize, photoSize, photoX, photoY);

  // QR code (bottom-left, below photo)
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, viewUrl, {
    width: 120,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrSize = 90;
  ctx.drawImage(qrCanvas, photoX, photoY + photoSize + 14, qrSize, qrSize);

  // Price "80 บาท" (next to QR)
  const leftCenter = photoX + photoSize / 2;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "bold 48px 'Prompt', sans-serif";
  ctx.fillText("80", leftCenter + 80, photoY + photoSize + 14);
  ctx.font = "bold 22px 'Prompt', sans-serif";
  ctx.fillText("บาท", leftCenter + 80, photoY + photoSize + 66);

  // Slogan below price
  ctx.font = "bold 18px 'Prompt', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("มั่งคั่ง มั่นคง สมหวัง", leftCenter, photoY + photoSize + qrSize + 28);

  // Vertical divider after left section
  const divX = photoX + photoSize + 24;
  ctx.beginPath();
  ctx.moveTo(divX, 28);
  ctx.lineTo(divX, TICKET_H - 28);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ============================================================
  // RIGHT SECTION: Header → Date/Logo → Price → Numbers → งวด/ชุด → QR → Footer
  // ============================================================
  const rightStart = divX + 20;
  const rightCenter = rightStart + (TICKET_W - rightStart - 28) / 2;
  const rightW = TICKET_W - rightStart - 28;

  // Header
  ctx.fillStyle = "#000";
  ctx.font = "bold 32px 'Prompt', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("สลากกินแบ่งรัฐบาล", rightCenter, 36);

  ctx.font = "12px 'Prompt', sans-serif";
  ctx.fillText("THAI GOVERNMENT LOTTERY", rightCenter, 72);

  // Divider
  ctx.beginPath();
  ctx.moveTo(rightStart, 95);
  ctx.lineTo(TICKET_W - 28, 95);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Date + Logo row
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "bold 22px 'Prompt', sans-serif";
  ctx.fillText("งวดนี้", rightStart, 105);

  ctx.font = "16px 'Prompt', sans-serif";
  ctx.fillText(formatThaiDate(), rightStart, 132);

  const logoW = 80;
  const logoH = (logoImg.height / logoImg.width) * logoW;
  const logoX = TICKET_W - 28 - logoW - 10;
  ctx.drawImage(logoImg, logoX, 98, logoW, logoH);

  // Price (right section)
  ctx.font = "bold 36px 'Prompt', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("80", TICKET_W - 28 - logoW - 30, 105);
  ctx.font = "bold 16px 'Prompt', sans-serif";
  ctx.fillText("บาท", TICKET_W - 28 - logoW - 30, 145);

  // Divider
  ctx.beginPath();
  ctx.moveTo(rightStart, 170);
  ctx.lineTo(TICKET_W - 28, 170);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.stroke();

  // --- Big number box ---
  const boxX = rightStart + 10;
  const boxY = 182;
  const boxW = rightW - 20;
  const boxH = 100;

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  ctx.strokeRect(boxX, boxY, boxW, boxH);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);

  ctx.font = "bold 70px 'Prompt', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const digitSpacing = boxW / 7;
  for (let i = 0; i < 6; i++) {
    ctx.fillText(ticketNumber[i], boxX + digitSpacing * (i + 0.85), boxY + boxH / 2);
  }

  // Divider
  ctx.beginPath();
  ctx.moveTo(rightStart, 296);
  ctx.lineTo(TICKET_W - 28, 296);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.stroke();

  // งวดที่ + ชุดที่
  ctx.font = "16px 'Prompt', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("งวดที่", rightStart, 308);
  ctx.font = "bold 26px 'Prompt', sans-serif";
  ctx.fillText(ticketNumber[0], rightStart + 55, 302);

  ctx.font = "16px 'Prompt', sans-serif";
  ctx.fillText("ชุดที่", rightStart + 130, 308);
  ctx.font = "bold 26px 'Prompt', sans-serif";
  ctx.fillText(ticketNumber.slice(1, 3), rightStart + 185, 302);

  // Divider
  ctx.beginPath();
  ctx.moveTo(rightStart, 345);
  ctx.lineTo(TICKET_W - 28, 345);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.stroke();

  // --- QR Code (right section) ---
  const qrRight = document.createElement("canvas");
  await QRCode.toCanvas(qrRight, viewUrl, {
    width: 160,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const qrRightSize = 150;
  ctx.drawImage(qrRight, rightCenter - qrRightSize / 2, 360, qrRightSize, qrRightSize);

  // Divider
  ctx.beginPath();
  ctx.moveTo(rightStart, 525);
  ctx.lineTo(TICKET_W - 28, 525);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Serial
  const serial = `${ticketNumber.slice(0, 2)}-${ticketNumber}${Math.floor(Math.random() * 90 + 10)}`;
  ctx.font = "14px 'Prompt', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`เลขที่ ${serial}`, rightCenter, 540);

  // Footer
  ctx.font = "12px 'Prompt', sans-serif";
  ctx.fillText("MY PHOTO BOOTH — จับฉันที", rightCenter, 565);

  // Side text (vertical, right edge)
  ctx.save();
  ctx.font = "11px 'Prompt', sans-serif";
  ctx.translate(TICKET_W - 14, TICKET_H / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("MY PHOTO BOOTH", 0, 0);
  ctx.restore();

  return {
    preview: canvas,
    print: rotateForPrint(canvas),
  };
}
