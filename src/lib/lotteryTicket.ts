import html2canvas from "html2canvas";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export type TicketData = {
  photoSrc: string;
  ticketNumber: string;
  logoSrc: string;
  qrLeftSrc: string;
  barcodeSrc: string;
  dateTh: string;
  dateEn: string;
  serial: string;
};

function applyDithering(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
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
  ctx.putImageData(imgData, 0, 0);
}

function formatDates(): { dateTh: string; dateEn: string } {
  const monthsTh = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  const monthsEn = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ];
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth();
  return {
    dateTh: `${d} ${monthsTh[m]} ${now.getFullYear() + 543}`,
    dateEn: `${d} ${monthsEn[m]} ${now.getFullYear()}`,
  };
}

function rotateForPrint(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = src.height;
  out.height = src.width;
  const ctx = out.getContext("2d")!;
  ctx.translate(out.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return out;
}

export async function prepareTicketData(
  photoCanvas: HTMLCanvasElement,
  ticketNumber: string,
  logoImg: HTMLImageElement,
  viewUrl: string,
): Promise<TicketData> {
  applyDithering(photoCanvas);
  const photoSrc = photoCanvas.toDataURL("image/png");

  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = logoImg.naturalWidth;
  logoCanvas.height = logoImg.naturalHeight;
  const lCtx = logoCanvas.getContext("2d")!;
  lCtx.drawImage(logoImg, 0, 0);
  const logoSrc = logoCanvas.toDataURL("image/png");

  const qrOpts = { margin: 1, color: { dark: "#000000", light: "#ffffff" } };
  const qrLeftSrc = await QRCode.toDataURL(viewUrl, { ...qrOpts, width: 120 });

  const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(barcodeSvg, ticketNumber, {
    format: "CODE128",
    width: 6,
    height: 120,
    displayValue: false,
    margin: 0,
    xmlDocument: document,
  });
  const svgStr = new XMLSerializer().serializeToString(barcodeSvg);
  const barcodeSrc = `data:image/svg+xml;base64,${btoa(svgStr)}`;

  const serial = `${ticketNumber.slice(0, 2)}-${ticketNumber}${Math.floor(Math.random() * 90 + 10)}`;

  return {
    photoSrc,
    ticketNumber,
    logoSrc,
    qrLeftSrc,
    barcodeSrc,
    ...formatDates(),
    serial,
  };
}

export async function captureTicket(
  element: HTMLDivElement,
): Promise<{ preview: HTMLCanvasElement; print: HTMLCanvasElement }> {
  await document.fonts.ready;

  const canvas = await html2canvas(element, {
    scale: 1,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: 1400,
    height: 696,
    onclone: (_doc: Document, clonedEl: HTMLElement) => {
      clonedEl.style.transform = "none";
    },
  });

  return {
    preview: canvas,
    print: rotateForPrint(canvas),
  };
}
