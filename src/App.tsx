import { useRef, useState, useEffect, useCallback } from "react";
import {
  Camera,
  Aperture,
  CheckCircle,
  XCircle,
  SpinnerGap,
  Printer,
  Warning,
  Sparkle,
  ArrowCounterClockwise,
  CaretLeft,
} from "@phosphor-icons/react";
import CoverScreen from "./components/CoverScreen";
import LotteryScreen from "./components/LotteryScreen";
import WordsScreen from "./components/WordsScreen";
import TicketViewer from "./components/TicketViewer";

const PRINTER_URL = "https://printer-hackathon.synoralab.dev";
const CANVAS_W = 696;
const CANVAS_H = 850;
const IMG_SIZE = 600;
const IMG_PAD = 48;
const MAX_POLL = 30;

const FORTUNES = [
  "วันนี้รวยมาก",
  "ระวังคนยืมเงิน",
  "เจอเนื้อคู่ชัวร์",
  "งานรุ่งพุ่งแรง",
  "มีโชคลาภลอย",
  "พักผ่อนบ้างนะ",
  "ถูกหวยแน่นอน",
  "กินอิ่มนอนหลับ",
  "ระวังของหาย",
  "มีคนแอบชอบ",
];

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
      if (x + 1 < width) {
        const n = idx(x + 1, y);
        d[n] = d[n + 1] = d[n + 2] = d[n] + (err * 7) / 16;
      }
      if (x - 1 >= 0 && y + 1 < height) {
        const n = idx(x - 1, y + 1);
        d[n] = d[n + 1] = d[n + 2] = d[n] + (err * 3) / 16;
      }
      if (y + 1 < height) {
        const n = idx(x, y + 1);
        d[n] = d[n + 1] = d[n + 2] = d[n] + (err * 5) / 16;
      }
      if (x + 1 < width && y + 1 < height) {
        const n = idx(x + 1, y + 1);
        d[n] = d[n + 1] = d[n + 2] = d[n] + (err * 1) / 16;
      }
    }
  }
  ctx.putImageData(imgData, startX, startY);
}

type Status = {
  icon: "ok" | "err" | "load" | "print" | "warn" | "";
  text: string;
};
type Toast = { type: "success" | "error"; text: string } | null;

function getViewTicket(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#view=(\d{6})$/);
  return match ? match[1] : null;
}

export default function App() {
  const [viewTicket, setViewTicket] = useState<string | null>(getViewTicket);
  const [mode, setMode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<Status>({ icon: "", text: "" });
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [fortune, setFortune] = useState("");
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
      setStatus({ icon: "", text: "" });
      return true;
    } catch {
      setCameraError(true);
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = useCallback(async () => {
    if (busy || printing) return;

    if (!cameraReady) {
      const ok = await startCamera();
      if (!ok) return;
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setStatus({ icon: "load", text: "กล้องกำลังโหลด... กรุณากดอีกครั้ง" });
      return;
    }

    setBusy(true);
    setPreviewSrc(null);
    setStatus({ icon: "load", text: "กำลังประมวลผลรูปภาพ..." });

    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let cropW = vw,
      cropH = vh,
      sx = 0,
      sy = 0;
    if (vw > vh) {
      cropW = vh;
      sx = (vw - cropW) / 2;
    } else {
      cropH = vw;
      sy = (vh - cropH) / 2;
    }

    const tmp = document.createElement("canvas");
    tmp.width = cropW;
    tmp.height = cropH;
    const tCtx = tmp.getContext("2d")!;
    tCtx.translate(cropW, 0);
    tCtx.scale(-1, 1);
    tCtx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    ctx.drawImage(
      tmp,
      0,
      0,
      cropW,
      cropH,
      IMG_PAD,
      IMG_PAD,
      IMG_SIZE,
      IMG_SIZE,
    );
    applyDithering(ctx, IMG_SIZE, IMG_SIZE, IMG_PAD, IMG_PAD);

    const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    setFortune(f);
    await document.fonts.ready;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let fontSize = 70;
    const maxTextWidth = CANVAS_W - IMG_PAD * 2;
    do {
      ctx.font = `bold ${fontSize}px 'Prompt', Arial, sans-serif`;
    } while (ctx.measureText(f).width > maxTextWidth && --fontSize > 20);
    const tw = ctx.measureText(f).width;
    ctx.fillText(f, (CANVAS_W - tw) / 2, 750);

    const dataUrl = canvas.toDataURL("image/png");
    setPreviewSrc(dataUrl);
    setBusy(false);
    setStatus({ icon: "", text: "" });
  }, [busy, printing, cameraReady, startCamera]);

  const printPhoto = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || printing) return;

    setPrinting(true);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setPrinting(false);
        return;
      }

      try {
        setStatus({ icon: "print", text: "กำลังส่งพิมพ์..." });
        const res = await fetch(`${PRINTER_URL}/print?label=62&cut=true`, {
          method: "POST",
          body: blob,
        });

        if (res.status === 201) {
          const data = await res.json();
          const jobId = data.jobId;
          setStatus({
            icon: "load",
            text: `Job: ${jobId.slice(0, 8)}... กำลังตรวจสอบ`,
          });

          let pollCount = 0;
          const poll = setInterval(async () => {
            pollCount++;
            if (pollCount > MAX_POLL) {
              clearInterval(poll);
              setStatus({ icon: "warn", text: "ตรวจสอบสถานะนานเกินไป" });
              setPrinting(false);
              return;
            }
            try {
              const jr = await fetch(`${PRINTER_URL}/jobs/${jobId}`);
              if (!jr.ok) return;
              const job = await jr.json();
              if (job.status === "done") {
                clearInterval(poll);
                setStatus({ icon: "", text: "" });
                setPrinting(false);
                showToast("success", `ปริ้นสำเร็จแล้ว! คำทำนาย: ${fortune}`);
              } else if (job.status === "failed") {
                clearInterval(poll);
                setPrinting(false);
                showToast(
                  "error",
                  `การปริ้นล้มเหลว: ${job.error || "ไม่ทราบสาเหตุ"}`,
                );
                setStatus({ icon: "err", text: "ปริ้นล้มเหลว" });
              } else if (job.status === "printing") {
                setStatus({ icon: "print", text: `กำลังพ่นหมึก...` });
              }
            } catch {
              clearInterval(poll);
              setPrinting(false);
              showToast("error", "ขาดการเชื่อมต่อระหว่างตรวจสอบสถานะ");
              setStatus({ icon: "err", text: "ขาดการเชื่อมต่อ" });
            }
          }, 1000);
        } else {
          setPrinting(false);
          showToast("error", `ส่งพิมพ์ไม่สำเร็จ (รหัส ${res.status})`);
          setStatus({ icon: "err", text: `รหัส ${res.status}` });
        }
      } catch {
        setPrinting(false);
        showToast("error", "ส่งพิมพ์ไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ต");
        setStatus({ icon: "err", text: "ส่งพิมพ์ไม่สำเร็จ" });
      }
    }, "image/png");
  }, [printing, fortune, showToast]);

  const resetForNewPhoto = useCallback(() => {
    setPreviewSrc(null);
    setFortune("");
    setBusy(false);
    setPrinting(false);
    setStatus({ icon: "", text: "" });
  }, []);

  const goBack = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    setCameraError(false);
    setPreviewSrc(null);
    setFortune("");
    setBusy(false);
    setPrinting(false);
    setStatus({ icon: "", text: "" });
    setToast(null);
    setMode(null);
  }, []);

  if (viewTicket) {
    return (
      <TicketViewer
        ticketNumber={viewTicket}
        onClose={() => {
          window.location.hash = "";
          setViewTicket(null);
        }}
      />
    );
  }

  if (!mode) {
    return <CoverScreen onStart={(m) => setMode(m)} />;
  }

  if (mode === "lottery") {
    return <LotteryScreen onBack={() => setMode(null)} />;
  }

  if (mode === "words") {
    return <WordsScreen onBack={() => setMode(null)} />;
  }

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white/80 text-slate-600 shadow-md backdrop-blur border-none cursor-pointer transition-all duration-200 hover:bg-white hover:text-slate-800"
        style={{ fontFamily: "inherit" }}
        onClick={goBack}
      >
        <CaretLeft size={32} />
      </button>
      <div className="container">
        {status.text && (
          <div
            className={`status ${status.icon === "ok" ? "status-ok" : status.icon === "err" ? "status-err" : status.icon === "warn" ? "status-warn" : ""}`}
          >
            {status.icon === "ok" && (
              <CheckCircle className="icon-inline" weight="fill" />
            )}
            {status.icon === "err" && (
              <XCircle className="icon-inline" weight="fill" />
            )}
            {status.icon === "load" && (
              <SpinnerGap className="icon-inline icon-spin" weight="bold" />
            )}
            {status.icon === "print" && (
              <Printer className="icon-inline" weight="fill" />
            )}
            {status.icon === "warn" && (
              <Warning className="icon-inline" weight="fill" />
            )}{" "}
            {status.text}
          </div>
        )}
        <h2>
          <Sparkle className="icon-inline" weight="fill" /> ดวงวันนี้{" "}
          <Sparkle className="icon-inline" weight="fill" />
        </h2>

        {!previewSrc && (
          <>
            <div className="camera-wrapper">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`camera ${cameraReady ? "" : "camera-hidden"}`}
              />
              {!cameraReady && !cameraError && (
                <div className="camera-placeholder">
                  <Camera className="placeholder-icon" weight="light" />
                  <p>กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
                </div>
              )}
              {cameraError && (
                <div className="camera-error">
                  <div className="camera-error-icon">
                    <XCircle size={40} weight="fill" />
                  </div>
                  <p className="camera-error-title">ไม่สามารถเข้าถึงกล้องได้</p>
                  <p className="camera-error-desc">
                    กรุณาเปิดสิทธิ์กล้องในเบราว์เซอร์แล้วลองใหม่
                  </p>
                  <button
                    className="camera-error-btn"
                    onClick={() => {
                      setCameraError(false);
                      startCamera();
                    }}
                  >
                    <ArrowCounterClockwise
                      className="icon-inline"
                      weight="bold"
                    />{" "}
                    ลองใหม่
                  </button>
                </div>
              )}
            </div>

            {!cameraError && (
              <div className="controls">
                <button onClick={snap} disabled={busy} className="snap-btn">
                  {cameraReady ? (
                    <>
                      <Aperture className="icon-inline" weight="bold" /> แชะ!
                    </>
                  ) : (
                    <>
                      <Camera className="icon-inline" weight="bold" /> เปิดกล้อง
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {previewSrc && (
          <div className="result">
            <img src={previewSrc} alt="Polaroid Preview" className="preview" />
            <div className="result-actions">
              <button
                onClick={printPhoto}
                disabled={printing}
                className="print-btn"
              >
                {printing ? (
                  <>
                    <SpinnerGap
                      className="icon-inline icon-spin"
                      weight="bold"
                    />{" "}
                    กำลังปริ้น...
                  </>
                ) : (
                  <>
                    <Printer className="icon-inline" weight="bold" /> ปริ้น
                  </>
                )}
              </button>
              <button
                onClick={resetForNewPhoto}
                disabled={printing}
                className="new-photo-btn"
              >
                <ArrowCounterClockwise className="icon-inline" weight="bold" />{" "}
                ถ่ายใหม่
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="icon-inline" weight="fill" size={20} />
          ) : (
            <XCircle className="icon-inline" weight="fill" size={20} />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="hidden"
      />

      <style>{`
        .container {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: clamp(16px, 5vw, 30px);
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
          text-align: center;
          max-width: 500px;
          width: 100%;
          position: relative;
        }

        .back-btn {
          position: absolute;
          top: clamp(12px, 3vw, 18px);
          left: clamp(12px, 3vw, 18px);
          display: flex;
          align-items: center;
          gap: 4px;
          background: #f1f5f9;
          color: #64748b;
          border: none;
          padding: 6px 14px;
          font-size: clamp(0.75rem, 2vw, 0.85rem);
          font-weight: 500;
          font-family: inherit;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          background: #e2e8f0;
          color: #475569;
        }

        h2 {
          font-weight: 600;
          margin: 0 0 clamp(12px, 3vw, 20px);
          color: #555;
          font-size: clamp(1.1rem, 4vw, 1.5rem);
          line-height: 1.4;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        h2 .icon-inline {
          color: #f0c040;
        }

        .camera-wrapper {
          position: relative;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          aspect-ratio: 4/3;
        }

        .camera {
          width: 100%;
          height: 100%;
          border-radius: clamp(10px, 3vw, 16px);
          transform: scaleX(-1);
          background: #fff;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          border: 4px solid #fff;
          display: block;
          object-fit: cover;
        }
        .camera-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .camera-placeholder {
          position: absolute;
          inset: 0;
          border-radius: clamp(10px, 3vw, 16px);
          background: #f8f9fa;
          border: 3px dashed #d1d5db;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .placeholder-icon {
          width: clamp(36px, 10vw, 56px);
          height: clamp(36px, 10vw, 56px);
          opacity: 0.4;
          color: #9ca3af;
        }
        .camera-placeholder p {
          font-size: clamp(0.8rem, 2.5vw, 0.95rem);
          color: #aaa;
          margin: 0;
        }

        .camera-error {
          position: absolute;
          inset: 0;
          border-radius: clamp(10px, 3vw, 16px);
          background: #fef2f2;
          border: 2px solid #fecaca;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 20px;
        }
        .camera-error-icon {
          color: #f87171;
          margin-bottom: 4px;
        }
        .camera-error-title {
          font-size: clamp(0.9rem, 3vw, 1.05rem);
          font-weight: 600;
          color: #b91c1c;
          margin: 0;
        }
        .camera-error-desc {
          font-size: clamp(0.75rem, 2.2vw, 0.85rem);
          color: #dc2626;
          margin: 0;
          opacity: 0.8;
          text-align: center;
          line-height: 1.5;
        }
        .camera-error-btn {
          margin-top: 8px;
          background: #fff;
          color: #b91c1c;
          border: 1.5px solid #fca5a5;
          padding: 8px 20px;
          font-size: clamp(0.8rem, 2.5vw, 0.9rem);
          font-weight: 500;
          font-family: inherit;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .camera-error-btn:hover {
          background: #fef2f2;
          border-color: #f87171;
        }

        .controls {
          margin-top: clamp(16px, 4vw, 25px);
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }

        .snap-btn {
          background: linear-gradient(135deg, #E5C060 0%, #B8860B 100%);
          color: white;
          border: none;
          padding: clamp(12px, 3vw, 14px) clamp(24px, 6vw, 35px);
          font-size: clamp(15px, 4vw, 18px);
          font-weight: 500;
          font-family: inherit;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(212,175,55,0.4);
          width: 100%;
          max-width: 340px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .snap-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(212,175,55,0.6);
        }
        .snap-btn:active {
          transform: translateY(1px);
        }
        .snap-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .status {
          position: absolute;
          top: clamp(12px, 3vw, 18px);
          right: clamp(12px, 3vw, 18px);
          font-weight: 500;
          color: #64748b;
          font-size: clamp(0.7rem, 2vw, 0.8rem);
          background: #f1f5f9;
          padding: 6px 12px;
          border-radius: 14px;
          max-width: 60%;
          word-break: break-word;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .result {
          animation: fadeIn 0.5s ease;
        }
        .result h3 {
          font-weight: 500;
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          color: #7a7a7a;
          margin: 0 0 15px;
        }

        .preview {
          width: 100%;
          max-width: 280px;
          border-radius: 4px;
          background: white;
          padding: clamp(6px, 2vw, 10px) clamp(6px, 2vw, 10px) clamp(24px, 8vw, 40px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          margin: 0 auto;
          display: block;
        }

        .result-actions {
          margin-top: 20px;
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .print-btn {
          background: linear-gradient(135deg, #E5C060 0%, #B8860B 100%);
          color: white;
          border: none;
          padding: 12px 32px;
          font-size: clamp(15px, 4vw, 17px);
          font-weight: 500;
          font-family: inherit;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(212,175,55,0.4);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .print-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(212,175,55,0.6);
        }
        .print-btn:active {
          transform: translateY(1px);
        }
        .print-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .new-photo-btn {
          background: rgba(255, 255, 255, 0.9);
          color: #64748b;
          border: 2px solid #e2e8f0;
          padding: 10px 24px;
          font-size: clamp(14px, 3.5vw, 16px);
          font-weight: 500;
          font-family: inherit;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .new-photo-btn:hover {
          background: #f1f5f9;
          transform: translateY(-1px);
        }
        .new-photo-btn:active {
          transform: translateY(1px);
        }
        .new-photo-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .toast {
          position: fixed;
          bottom: clamp(20px, 5vw, 40px);
          left: 50%;
          transform: translateX(-50%);
          padding: 14px 24px;
          border-radius: 16px;
          font-size: clamp(0.85rem, 2.5vw, 0.95rem);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 200;
          animation: toastIn 0.4s ease, toastOut 0.4s ease 3s forwards;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          max-width: calc(100vw - 40px);
        }
        .toast-success {
          background: #ecfdf5;
          color: #16a34a;
          border: 1px solid #a7f3d0;
        }
        .toast-error {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }

        .icon-inline {
          display: inline-block;
          vertical-align: -0.15em;
          width: 1.1em;
          height: 1.1em;
          flex-shrink: 0;
        }
        .icon-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .status-ok {
          background: #ecfdf5;
          color: #16a34a;
        }
        .status-err {
          background: #fef2f2;
          color: #dc2626;
        }
        .status-warn {
          background: #fffbeb;
          color: #d97706;
        }

        .hidden {
          display: none;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
