import { useRef, useState, useEffect, useCallback } from "react";
import { generateUniqueNumber, getRemainingCount } from "../lib/ticketNumbers";
import { renderLotteryTicket } from "../lib/lotteryTicket";
import { saveTicketImage } from "../lib/ticketStore";

const PRINTER_URL = "https://printer-hackathon.synoralab.dev";
const MAX_POLL = 30;

type Phase = "camera" | "preview" | "printing" | "done" | "exhausted";
type Toast = { type: "success" | "error"; text: string } | null;

type Props = { onBack: () => void };

export default function LotteryScreen({ onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const printCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState("");
  const [remaining, setRemaining] = useState(getRemainingCount);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [statusText, setStatusText] = useState("");

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Preload logo
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      logoRef.current = img;
    };
    img.src = "/Logo-BlackWhite-small.png";
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraReady(true);
      setCameraError(false);
      return true;
    } catch {
      setCameraError(true);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const snap = useCallback(async () => {
    if (busy) return;

    if (!cameraReady) {
      await startCamera();
      return;
    }

    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    // Check remaining
    if (remaining <= 0) {
      setPhase("exhausted");
      return;
    }

    setBusy(true);

    // Generate unique number
    const num = generateUniqueNumber();
    if (!num) {
      setPhase("exhausted");
      setBusy(false);
      return;
    }
    setTicketNumber(num);
    setRemaining(getRemainingCount());

    // Capture mirrored square crop from video
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

    const photoCanvas = document.createElement("canvas");
    photoCanvas.width = cropW;
    photoCanvas.height = cropH;
    const pCtx = photoCanvas.getContext("2d")!;
    pCtx.translate(cropW, 0);
    pCtx.scale(-1, 1);
    pCtx.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    // Wait for logo
    if (!logoRef.current) {
      await new Promise<void>((r) => {
        const check = setInterval(() => {
          if (logoRef.current) {
            clearInterval(check);
            r();
          }
        }, 50);
      });
    }

    // Render ticket
    const viewUrl = `${window.location.origin}${window.location.pathname}#view=${num}`;
    const { preview, print } = await renderLotteryTicket(
      photoCanvas,
      num,
      logoRef.current!,
      viewUrl,
    );
    printCanvasRef.current = print;

    const dataUrl = preview.toDataURL("image/png");
    await saveTicketImage(num, dataUrl);
    setPreviewSrc(dataUrl);
    setPhase("preview");
    setBusy(false);
    stopCamera();
  }, [busy, cameraReady, remaining, startCamera, stopCamera]);

  const printTicket = useCallback(async () => {
    const canvas = printCanvasRef.current;
    if (!canvas) return;

    setPhase("printing");
    setStatusText("กำลังส่งพิมพ์...");

    canvas.toBlob(async (blob: Blob | null) => {
      if (!blob) {
        setPhase("preview");
        return;
      }

      // Download locally too
      const link = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      link.download = `lottery_${ticketNumber}.png`;
      link.href = objUrl;
      link.click();
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000);

      try {
        const res = await fetch(`${PRINTER_URL}/print?label=62&cut=true`, {
          method: "POST",
          body: blob,
        });

        if (res.status === 201) {
          const data = await res.json();
          const jobId = data.jobId;
          setStatusText(`Job: ${jobId.slice(0, 8)}...`);

          let pollCount = 0;
          const poll = setInterval(async () => {
            pollCount++;
            if (pollCount > MAX_POLL) {
              clearInterval(poll);
              setStatusText("ตรวจสอบนานเกินไป");
              setPhase("done");
              return;
            }
            try {
              const jr = await fetch(`${PRINTER_URL}/jobs/${jobId}`);
              if (!jr.ok) return;
              const job = await jr.json();
              if (job.status === "done") {
                clearInterval(poll);
                setPhase("done");
                showToast("success", "ปริ้นสลากสำเร็จ!");
              } else if (job.status === "failed") {
                clearInterval(poll);
                setPhase("done");
                showToast(
                  "error",
                  `ปริ้นล้มเหลว: ${job.error || "ไม่ทราบสาเหตุ"}`,
                );
              } else if (job.status === "printing") {
                setStatusText("กำลังพ่นหมึก...");
              }
            } catch {
              clearInterval(poll);
              setPhase("done");
              showToast("error", "ขาดการเชื่อมต่อ");
            }
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
  }, [ticketNumber, showToast]);

  const retryNew = useCallback(() => {
    setPreviewSrc(null);
    setTicketNumber("");
    printCanvasRef.current = null;
    setPhase("camera");
    setRemaining(getRemainingCount());
    startCamera();
  }, [startCamera]);

  const handleBack = useCallback(() => {
    stopCamera();
    onBack();
  }, [stopCamera, onBack]);

  return (
    <>
      <div className="lt-container">
        <button className="lt-back" onClick={handleBack}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 4l-6 6 6 6" />
          </svg>
          กลับ
        </button>

        <h2 className="lt-title">จับฉันที</h2>
        <p className="lt-subtitle">Catch Me If You Can</p>

        {phase === "camera" && (
          <>
            <div className="lt-camera-wrap">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`lt-video ${cameraReady ? "" : "lt-hidden"}`}
              />
              {!cameraReady && !cameraError && (
                <div className="lt-camera-placeholder">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 56 56"
                    fill="none"
                    stroke="#999"
                    strokeWidth="1.5"
                  >
                    <rect x="6" y="14" width="44" height="34" rx="5" />
                    <circle cx="28" cy="32" r="10" />
                    <circle cx="28" cy="32" r="4" />
                  </svg>
                  <p>กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
                </div>
              )}
              {cameraError && (
                <div className="lt-camera-error">
                  <p className="lt-err-title">ไม่สามารถเข้าถึงกล้องได้</p>
                  <p className="lt-err-desc">กรุณาเปิดสิทธิ์กล้องแล้วลองใหม่</p>
                  <button
                    className="lt-err-btn"
                    onClick={() => {
                      setCameraError(false);
                      startCamera();
                    }}
                  >
                    ลองใหม่
                  </button>
                </div>
              )}
            </div>

            {!cameraError && (
              <div className="lt-actions">
                <button className="lt-snap-btn" onClick={snap} disabled={busy}>
                  {busy
                    ? "กำลังสร้างสลาก..."
                    : cameraReady
                      ? "จับฉันที!"
                      : "เปิดกล้อง"}
                </button>
              </div>
            )}
          </>
        )}

        {phase === "preview" && previewSrc && (
          <div className="lt-result">
            <img src={previewSrc} alt="Lottery Ticket" className="lt-preview" />

            <div className="lt-result-actions">
              <button className="lt-print-btn" onClick={printTicket}>
                ปริ้นสลาก
              </button>
              <button className="lt-retry-btn" onClick={retryNew}>
                จับใหม่
              </button>
            </div>
          </div>
        )}

        {phase === "printing" && (
          <div className="lt-result">
            {previewSrc && (
              <img
                src={previewSrc}
                alt="Lottery Ticket"
                className="lt-preview"
              />
            )}
            <div className="lt-printing">
              <span className="lt-spinner" />
              <span>{statusText}</span>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="lt-result">
            {previewSrc && (
              <img
                src={previewSrc}
                alt="Lottery Ticket"
                className="lt-preview"
              />
            )}
            <div className="lt-result-actions">
              <button className="lt-snap-btn" onClick={retryNew}>
                จับฉันทีอีก
              </button>
              <button className="lt-retry-btn" onClick={handleBack}>
                กลับหน้าแรก
              </button>
            </div>
          </div>
        )}

        {phase === "exhausted" && (
          <div className="lt-exhausted">
            <p className="lt-err-title">สลากหมดแล้ว!</p>
            <p className="lt-err-desc">ใช้ครบ 80 ใบแล้ว</p>
            <button className="lt-retry-btn" onClick={handleBack}>
              กลับหน้าแรก
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`lt-toast ${toast.type === "success" ? "lt-toast-ok" : "lt-toast-err"}`}
        >
          {toast.text}
        </div>
      )}

      <style>{`
        .lt-container {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: clamp(16px, 5vw, 30px);
          border-radius: 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.05);
          text-align: center;
          max-width: 700px;
          width: 100%;
          position: relative;
        }

        .lt-back {
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
          font-size: 0.85rem;
          font-weight: 500;
          font-family: inherit;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lt-back:hover { background: #e2e8f0; color: #475569; }

        .lt-title {
          font-weight: 600;
          margin: 0;
          color: #555;
          font-size: clamp(1.2rem, 4vw, 1.5rem);
        }
        .lt-subtitle {
          font-size: 0.8rem;
          color: #aaa;
          margin: 2px 0 clamp(12px, 3vw, 20px);
        }

        .lt-camera-wrap {
          position: relative;
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          aspect-ratio: 4/3;
        }
        .lt-video {
          width: 100%;
          height: 100%;
          border-radius: 16px;
          transform: scaleX(-1);
          background: #000;
          display: block;
          object-fit: cover;
          border: 4px solid #fff;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .lt-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .lt-camera-placeholder {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: #f8f9fa;
          border: 3px dashed #d1d5db;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .lt-camera-placeholder p {
          font-size: 0.9rem;
          color: #aaa;
          margin: 0;
        }

        .lt-camera-error {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: #fef2f2;
          border: 2px solid #fecaca;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 20px;
        }
        .lt-err-title {
          font-size: 1rem;
          font-weight: 600;
          color: #b91c1c;
          margin: 0;
        }
        .lt-err-desc {
          font-size: 0.85rem;
          color: #dc2626;
          margin: 0;
          opacity: 0.8;
        }
        .lt-err-btn {
          margin-top: 8px;
          background: #fff;
          color: #b91c1c;
          border: 1.5px solid #fca5a5;
          padding: 8px 20px;
          font-size: 0.85rem;
          font-weight: 500;
          font-family: inherit;
          border-radius: 20px;
          cursor: pointer;
        }

        .lt-actions {
          margin-top: clamp(16px, 4vw, 25px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .lt-snap-btn {
          background: linear-gradient(135deg, #f0c4c8 0%, #e8aeb4 100%);
          color: white;
          border: none;
          padding: 14px 35px;
          font-size: 1.1rem;
          font-weight: 600;
          font-family: inherit;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(232,174,180,0.4);
          width: 100%;
          max-width: 340px;
        }
        .lt-snap-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(232,174,180,0.6); }
        .lt-snap-btn:active { transform: translateY(1px); }
        .lt-snap-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .lt-remaining {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .lt-result {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .lt-preview {
          width: 100%;
          max-width: 320px;
          border-radius: 4px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }
        .lt-num-label {
          font-size: 0.95rem;
          color: #666;
          margin: 0;
          letter-spacing: 0.1em;
        }
        .lt-result-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .lt-print-btn {
          background: linear-gradient(135deg, #6ee7b7 0%, #34d399 100%);
          color: white;
          border: none;
          padding: 12px 32px;
          font-size: 1rem;
          font-weight: 500;
          font-family: inherit;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(52,211,153,0.4);
        }
        .lt-print-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(52,211,153,0.6); }

        .lt-retry-btn {
          background: rgba(255,255,255,0.9);
          color: #64748b;
          border: 2px solid #e2e8f0;
          padding: 10px 24px;
          font-size: 0.9rem;
          font-weight: 500;
          font-family: inherit;
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lt-retry-btn:hover { background: #f1f5f9; }

        .lt-printing {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          font-size: 0.9rem;
        }
        .lt-spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid #e2e8f0;
          border-top-color: #64748b;
          border-radius: 50%;
          animation: lt-spin 0.8s linear infinite;
        }
        @keyframes lt-spin { to { transform: rotate(360deg); } }

        .lt-exhausted {
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .lt-toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          padding: 14px 24px;
          border-radius: 16px;
          font-size: 0.9rem;
          font-weight: 500;
          z-index: 200;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          max-width: calc(100vw - 40px);
          animation: lt-toast-in 0.4s ease, lt-toast-out 0.4s ease 3s forwards;
        }
        .lt-toast-ok { background: #ecfdf5; color: #16a34a; border: 1px solid #a7f3d0; }
        .lt-toast-err { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        @keyframes lt-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes lt-toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(20px); }
        }
      `}</style>
    </>
  );
}
