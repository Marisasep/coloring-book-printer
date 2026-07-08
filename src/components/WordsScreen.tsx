import { useRef, useState, useEffect, useCallback } from "react";
import { CaretLeft } from "@phosphor-icons/react";

const PRINTER_URL = "https://printer-hackathon.synoralab.dev";
const CANVAS_W = 696;
const CANVAS_H = 850;
const IMG_SIZE = 600;
const IMG_PAD = 48;
const MAX_POLL = 30;

const WORDS = [
  "กล้าหาญ", "อบอุ่น", "ใจดี", "มุ่งมั่น", "สดใส",
  "ซื่อสัตย์", "อ่อนโยน", "เข้มแข็ง", "ร่าเริง", "จริงใจ",
  "ฉลาด", "ขยัน", "อดทน", "ครีเอทีฟ", "มีเสน่ห์",
  "ใจกว้าง", "เปิดใจ", "สุขุม", "รอบคอบ", "มีพลัง",
  "โรแมนติก", "ตลก", "น่ารัก", "เท่", "ลึกซึ้ง",
  "อิสระ", "จริงจัง", "เป็นผู้นำ", "ใส่ใจ", "มองโลกสวย",
];

function pickThreeWords(): string[] {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function applyDithering(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startX: number,
  startY: number,
) {
  const imgData = ctx.getImageData(startX, startY, width, height);
  const d = imgData.data;
  const idx = (x: number, y: number) => (y * width + x) * 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y);
      const gray = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      const val = gray < 128 ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = val;
      const err = gray - val;
      if (x + 1 < width) { const n = idx(x + 1, y); d[n] = d[n + 1] = d[n + 2] = d[n] + (err * 7) / 16; }
      if (x - 1 >= 0 && y + 1 < height) { const n = idx(x - 1, y + 1); d[n] = d[n + 1] = d[n + 2] = d[n] + (err * 3) / 16; }
      if (y + 1 < height) { const n = idx(x, y + 1); d[n] = d[n + 1] = d[n + 2] = d[n] + (err * 5) / 16; }
      if (x + 1 < width && y + 1 < height) { const n = idx(x + 1, y + 1); d[n] = d[n + 1] = d[n + 2] = d[n] + (err * 1) / 16; }
    }
  }
  ctx.putImageData(imgData, startX, startY);
}

type Phase = "camera" | "preview" | "printing" | "done";
type Toast = { type: "success" | "error"; text: string } | null;

type Props = { onBack: () => void };

export default function WordsScreen({ onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [_words, setWords] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [statusText, setStatusText] = useState("");
  const [facing, setFacing] = useState<"user" | "environment">("user");

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const startCamera = useCallback(async (mode: "user" | "environment" = facing) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
      setCameraError(false);
      return true;
    } catch {
      setCameraError(true);
      return false;
    }
  }, [facing]);

  const flipCamera = useCallback(async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await startCamera(next);
  }, [facing, startCamera]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const snap = useCallback(async () => {
    if (busy) return;
    if (!cameraReady) { await startCamera(); return; }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    setBusy(true);

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let cropW = vw, cropH = vh, sx = 0, sy = 0;
    if (vw > vh) { cropW = vh; sx = (vw - cropW) / 2; }
    else { cropH = vw; sy = (vh - cropH) / 2; }

    const tmp = document.createElement("canvas");
    tmp.width = cropW; tmp.height = cropH;
    const tCtx = tmp.getContext("2d")!;
    if (facing === "user") {
      tCtx.translate(cropW, 0);
      tCtx.scale(-1, 1);
    }
    tCtx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    ctx.drawImage(tmp, 0, 0, cropW, cropH, IMG_PAD, IMG_PAD, IMG_SIZE, IMG_SIZE);
    applyDithering(ctx, IMG_SIZE, IMG_SIZE, IMG_PAD, IMG_PAD);

    const three = pickThreeWords();
    setWords(three);
    await document.fonts.ready;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const label = three.join("  ·  ");
    let fontSize = 44;
    const maxTextWidth = CANVAS_W - IMG_PAD * 2;
    do {
      ctx.font = `bold ${fontSize}px 'Prompt', Arial, sans-serif`;
    } while (ctx.measureText(label).width > maxTextWidth && --fontSize > 20);
    const tw = ctx.measureText(label).width;
    ctx.fillText(label, (CANVAS_W - tw) / 2, 750);

    setPreviewSrc(canvas.toDataURL("image/png"));
    setPhase("preview");
    setBusy(false);
    stopCamera();
  }, [busy, cameraReady, startCamera, stopCamera]);

  const printPhoto = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setPhase("printing");
    setStatusText("กำลังส่งพิมพ์...");

    canvas.toBlob(async (blob) => {
      if (!blob) { setPhase("preview"); return; }

      try {
        const res = await fetch(`${PRINTER_URL}/print?label=62&cut=true`, { method: "POST", body: blob });
        if (res.status === 201) {
          const data = await res.json();
          const jobId = data.jobId;
          setStatusText(`Job: ${jobId.slice(0, 8)}...`);
          let pollCount = 0;
          const poll = setInterval(async () => {
            pollCount++;
            if (pollCount > MAX_POLL) { clearInterval(poll); setPhase("done"); return; }
            try {
              const jr = await fetch(`${PRINTER_URL}/jobs/${jobId}`);
              if (!jr.ok) return;
              const job = await jr.json();
              if (job.status === "done") { clearInterval(poll); setPhase("done"); showToast("success", "ปริ้นสำเร็จ!"); }
              else if (job.status === "failed") { clearInterval(poll); setPhase("done"); showToast("error", `ปริ้นล้มเหลว: ${job.error || "ไม่ทราบสาเหตุ"}`); }
              else if (job.status === "printing") { setStatusText("กำลังพ่นหมึก..."); }
            } catch { clearInterval(poll); setPhase("done"); showToast("error", "ขาดการเชื่อมต่อ"); }
          }, 1000);
        } else {
          setPhase("preview");
          showToast("error", `ส่งพิมพ์ไม่สำเร็จ (รหัส ${res.status})`);
        }
      } catch {
        setPhase("preview");
        showToast("error", "ส่งพิมพ์ไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ต");
      }
    }, "image/png");
  }, [showToast]);

  const retryNew = useCallback(() => {
    setPreviewSrc(null);
    setWords([]);
    setPhase("camera");
    startCamera();
  }, [startCamera]);

  const handleBack = useCallback(() => {
    stopCamera();
    onBack();
  }, [stopCamera, onBack]);

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white/80 text-slate-600 shadow-md backdrop-blur border-none cursor-pointer transition-all duration-200 hover:bg-white hover:text-slate-800"
        onClick={handleBack}
      >
        <CaretLeft size={32} />
      </button>

      <div className="relative w-full max-w-[500px] rounded-3xl bg-white/85 text-center shadow-[0_10px_40px_rgba(0,0,0,0.05)] backdrop-blur-[10px] p-[clamp(16px,5vw,30px)]">
        <h2 className="m-0 font-semibold text-[#555] text-[clamp(1.2rem,4vw,1.5rem)]">สามคำที่เป็นคุณ</h2>
        <p className="text-[0.8rem] text-[#aaa] mt-0.5 mb-[clamp(12px,3vw,20px)]">Your 3 Words</p>

        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="hidden" />

        {phase === "camera" && (
          <>
            <div className="relative mx-auto w-full max-w-[500px] aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay playsInline muted
                className={`w-full h-full rounded-2xl bg-black block object-cover border-4 border-white shadow-[0_4px_15px_rgba(0,0,0,0.05)] ${facing === "user" ? "-scale-x-100" : ""} ${cameraReady ? "" : "absolute w-px h-px opacity-0 pointer-events-none"}`}
              />
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-3 border-dashed border-gray-300 bg-[#f8f9fa]">
                  <p className="m-0 text-[0.9rem] text-[#aaa]">กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-red-200 bg-red-50 p-5">
                  <p className="m-0 text-base font-semibold text-red-700">ไม่สามารถเข้าถึงกล้องได้</p>
                  <button
                    className="mt-2 cursor-pointer rounded-[20px] border-[1.5px] border-red-300 bg-white px-5 py-2 text-[0.85rem] font-medium text-red-700 font-[inherit]"
                    onClick={() => { setCameraError(false); startCamera(); }}
                  >
                    ลองใหม่
                  </button>
                </div>
              )}
            </div>
            {!cameraError && (
              <div className="mt-[clamp(16px,4vw,25px)] flex items-center justify-center gap-3">
                <button
                  className="ws-snap-btn flex-1 max-w-[340px] cursor-pointer rounded-[30px] border-none px-9 py-3.5 text-[1.1rem] font-semibold text-white font-[inherit] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={snap} disabled={busy}
                >
                  {busy ? "กำลังสร้าง..." : cameraReady ? "ค้นหาตัวเอง!" : "เปิดกล้อง"}
                </button>
                {cameraReady && (
                  <button
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 border-2 border-gray-200 cursor-pointer shadow-md transition-all duration-200 hover:bg-white shrink-0"
                    onClick={flipCamera}
                    title="สลับกล้อง"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 16v4H4v-4" /><path d="M4 8V4h16v4" /><polyline points="7 13 4 16 1 13" /><polyline points="17 11 20 8 23 11" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {phase === "preview" && previewSrc && (
          <div className="flex flex-col items-center gap-3">
            <img src={previewSrc} alt="3 คำ" className="w-full max-w-[500px] rounded" />
            <div className="flex flex-wrap justify-center gap-3">
              <button className="ws-print-btn cursor-pointer rounded-[30px] border-none px-8 py-3 text-base font-medium text-white font-[inherit] transition-all duration-300" onClick={printPhoto}>
                ปริ้น
              </button>
              <button className="cursor-pointer rounded-[30px] border-2 border-slate-200 bg-white/90 px-6 py-2.5 text-[0.9rem] font-medium text-slate-500 font-[inherit] transition-all duration-200 hover:bg-slate-100" onClick={retryNew}>
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {phase === "printing" && previewSrc && (
          <div className="flex flex-col items-center gap-3">
            <img src={previewSrc} alt="3 คำ" className="w-full max-w-[500px] rounded" />
            <div className="flex items-center gap-2 text-[0.9rem] text-slate-500">
              <span className="ws-spinner size-[18px] rounded-full border-[2.5px] border-slate-200 border-t-slate-500" />
              <span>{statusText}</span>
            </div>
          </div>
        )}

        {phase === "done" && previewSrc && (
          <div className="flex flex-col items-center gap-3">
            <img src={previewSrc} alt="3 คำ" className="w-full max-w-[500px] rounded" />
            <div className="flex flex-wrap justify-center gap-3">
              <button className="ws-snap-btn w-full max-w-[340px] cursor-pointer rounded-[30px] border-none px-9 py-3.5 text-[1.1rem] font-semibold text-white font-[inherit] transition-all duration-300" onClick={retryNew}>
                ลองอีกครั้ง
              </button>
              <button className="cursor-pointer rounded-[30px] border-2 border-slate-200 bg-white/90 px-6 py-2.5 text-[0.9rem] font-medium text-slate-500 font-[inherit] transition-all duration-200 hover:bg-slate-100" onClick={handleBack}>
                กลับหน้าแรก
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`ws-toast fixed top-[30px] left-1/2 -translate-x-1/2 rounded-2xl px-6 py-3.5 text-[0.9rem] font-medium shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-[200] max-w-[calc(100vw-40px)] ${toast.type === "success" ? "bg-emerald-50 text-green-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {toast.text}
        </div>
      )}

      <style>{`
        .ws-snap-btn {
          background: linear-gradient(135deg, #E5C060 0%, #B8860B 100%);
          box-shadow: 0 6px 20px rgba(212,175,55,0.4);
        }
        .ws-snap-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(212,175,55,0.6); }
        .ws-snap-btn:active { transform: translateY(1px); }
        .ws-print-btn {
          background: linear-gradient(135deg, #E5C060 0%, #B8860B 100%);
          box-shadow: 0 6px 20px rgba(212,175,55,0.4);
        }
        .ws-print-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(212,175,55,0.6); }
        .ws-spinner { animation: ws-spin 0.8s linear infinite; }
        @keyframes ws-spin { to { transform: rotate(360deg); } }
        .ws-toast { animation: ws-toast-in 0.4s ease, ws-toast-out 0.4s ease 3s forwards; }
        @keyframes ws-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes ws-toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `}</style>
    </>
  );
}
