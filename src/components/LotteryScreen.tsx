import { useRef, useState, useEffect, useCallback } from "react";
import { generateUniqueNumber, getRemainingCount } from "../lib/ticketNumbers";
import { prepareTicketData, captureTicket, type TicketData } from "../lib/lotteryTicket";
import { saveTicketImage } from "../lib/ticketStore";
import LotteryTicket from "./LotteryTicket";
import { CaretLeft } from "@phosphor-icons/react";

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
  const ticketRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [ticketNumber, setTicketNumber] = useState("");
  const [remaining, setRemaining] = useState(getRemainingCount);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [statusText, setStatusText] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

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

    if (remaining <= 0) {
      setPhase("exhausted");
      return;
    }

    setBusy(true);

    const num = generateUniqueNumber();
    if (!num) {
      setPhase("exhausted");
      setBusy(false);
      return;
    }
    setTicketNumber(num);
    setRemaining(getRemainingCount());

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

    const baseUrl = window.location.hostname === "localhost"
      ? "https://coloring-book-printer.pages.dev"
      : window.location.origin;
    const viewUrl = `${baseUrl}/#view=${num}`;
    const data = await prepareTicketData(
      photoCanvas,
      num,
      logoRef.current!,
      viewUrl,
    );
    setTicketData(data);
    setPhase("preview");
    setBusy(false);
    stopCamera();
  }, [busy, cameraReady, remaining, startCamera, stopCamera]);

  // Capture the rendered ticket to image after it mounts
  useEffect(() => {
    if (!ticketData || !ticketRef.current) return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelled || !ticketRef.current) return;
      const { preview, print } = await captureTicket(ticketRef.current);
      if (cancelled) return;
      printCanvasRef.current = print;
      const dataUrl = preview.toDataURL("image/png");
      setPreviewSrc(dataUrl);
      await saveTicketImage(ticketData.ticketNumber, dataUrl);
    })();
    return () => { cancelled = true; };
  }, [ticketData]);

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
    setTicketData(null);
    setTicketNumber("");
    setPreviewSrc(null);
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
      <button
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white/80 text-slate-600 shadow-md backdrop-blur border-none cursor-pointer transition-all duration-200 hover:bg-white hover:text-slate-800"
        onClick={handleBack}
      >
        <CaretLeft size={32} />
      </button>
      <div className="relative w-full max-w-[500px] rounded-3xl bg-white/85 text-center shadow-[0_10px_40px_rgba(0,0,0,0.05)] backdrop-blur-[10px] p-[clamp(16px,5vw,30px)]">

        <h2 className="m-0 font-semibold text-[#555] text-[clamp(1.2rem,4vw,1.5rem)]">สลากกินไม่แบ่ง</h2>
        <p className="text-[0.8rem] text-[#aaa] mt-0.5 mb-[clamp(12px,3vw,20px)]">Photo Lottery</p>

        {phase === "camera" && (
          <>
            <div className="relative mx-auto w-full max-w-[500px] aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full rounded-2xl -scale-x-100 bg-black block object-cover border-4 border-white shadow-[0_4px_15px_rgba(0,0,0,0.05)] ${cameraReady ? "" : "absolute w-px h-px opacity-0 pointer-events-none"}`}
              />
              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-3 border-dashed border-gray-300 bg-[#f8f9fa]">
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
                  <p className="m-0 text-[0.9rem] text-[#aaa]">กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-red-200 bg-red-50 p-5">
                  <p className="m-0 text-base font-semibold text-red-700">ไม่สามารถเข้าถึงกล้องได้</p>
                  <p className="m-0 text-[0.85rem] text-red-600 opacity-80">กรุณาเปิดสิทธิ์กล้องแล้วลองใหม่</p>
                  <button
                    className="mt-2 cursor-pointer rounded-[20px] border-[1.5px] border-red-300 bg-white px-5 py-2 text-[0.85rem] font-medium text-red-700 font-[inherit]"
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
              <div className="mt-[clamp(16px,4vw,25px)] flex flex-col items-center gap-2">
                <button
                  className="lt-snap-btn w-full max-w-[340px] cursor-pointer rounded-[30px] border-none px-9 py-3.5 text-[1.1rem] font-semibold text-white font-[inherit] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:!transform-none"
                  onClick={snap}
                  disabled={busy}
                >
                  {busy
                    ? "กำลังสร้างสลาก..."
                    : cameraReady
                      ? "ลุ้นโชค!"
                      : "เปิดกล้อง"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Hidden ticket for html2canvas capture */}
        {ticketData && !previewSrc && (
          <div className="flex flex-col items-center gap-3">
            <LotteryTicket ref={ticketRef} {...ticketData} />
            <div className="flex items-center gap-2 text-[0.9rem] text-slate-500">
              <span className="lt-spinner size-[18px] rounded-full border-[2.5px] border-slate-200 border-t-slate-500" />
              <span>กำลังสร้างสลาก...</span>
            </div>
          </div>
        )}

        {phase === "preview" && previewSrc && (
          <div className="flex flex-col items-center gap-3">
            <img src={previewSrc} alt="สลาก" className="w-full max-w-[500px] rounded" />
            <div className="flex flex-wrap justify-center gap-3">
              <button
                className="lt-print-btn cursor-pointer rounded-[30px] border-none px-8 py-3 text-base font-medium text-white font-[inherit] transition-all duration-300"
                onClick={printTicket}
              >
                ปริ้นสลาก
              </button>
              <button
                className="cursor-pointer rounded-[30px] border-2 border-slate-200 bg-white/90 px-6 py-2.5 text-[0.9rem] font-medium text-slate-500 font-[inherit] transition-all duration-200 hover:bg-slate-100"
                onClick={retryNew}
              >
                ลุ้นใหม่
              </button>
            </div>
          </div>
        )}

        {phase === "printing" && previewSrc && (
          <div className="flex flex-col items-center gap-3">
            <img src={previewSrc} alt="สลาก" className="w-full max-w-[500px] rounded" />
            <div className="flex items-center gap-2 text-[0.9rem] text-slate-500">
              <span className="lt-spinner size-[18px] rounded-full border-[2.5px] border-slate-200 border-t-slate-500" />
              <span>{statusText}</span>
            </div>
          </div>
        )}

        {phase === "done" && previewSrc && (
          <div className="flex flex-col items-center gap-3">
            <img src={previewSrc} alt="สลาก" className="w-full max-w-[500px] rounded" />
            <div className="flex flex-wrap justify-center gap-3">
              <button
                className="lt-snap-btn w-full max-w-[340px] cursor-pointer rounded-[30px] border-none px-9 py-3.5 text-[1.1rem] font-semibold text-white font-[inherit] transition-all duration-300"
                onClick={retryNew}
              >
                ลุ้นอีกครั้ง
              </button>
              <button
                className="cursor-pointer rounded-[30px] border-2 border-slate-200 bg-white/90 px-6 py-2.5 text-[0.9rem] font-medium text-slate-500 font-[inherit] transition-all duration-200 hover:bg-slate-100"
                onClick={handleBack}
              >
                กลับหน้าแรก
              </button>
            </div>
          </div>
        )}

        {phase === "exhausted" && (
          <div className="flex flex-col items-center gap-2 px-5 py-10">
            <p className="m-0 text-base font-semibold text-red-700">สลากหมดแล้ว!</p>
            <p className="m-0 text-[0.85rem] text-red-600 opacity-80">ใช้ครบ 80 ใบแล้ว</p>
            <button
              className="cursor-pointer rounded-[30px] border-2 border-slate-200 bg-white/90 px-6 py-2.5 text-[0.9rem] font-medium text-slate-500 font-[inherit] transition-all duration-200 hover:bg-slate-100"
              onClick={handleBack}
            >
              กลับหน้าแรก
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`lt-toast fixed bottom-[30px] left-1/2 -translate-x-1/2 rounded-2xl px-6 py-3.5 text-[0.9rem] font-medium shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-[200] max-w-[calc(100vw-40px)] ${toast.type === "success" ? "bg-emerald-50 text-green-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}
        >
          {toast.text}
        </div>
      )}

      <style>{`
        .lt-snap-btn {
          background: linear-gradient(135deg, #f0c4c8 0%, #e8aeb4 100%);
          box-shadow: 0 6px 20px rgba(232,174,180,0.4);
        }
        .lt-snap-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(232,174,180,0.6); }
        .lt-snap-btn:active { transform: translateY(1px); }
        .lt-print-btn {
          background: linear-gradient(135deg, #6ee7b7 0%, #34d399 100%);
          box-shadow: 0 6px 20px rgba(52,211,153,0.4);
        }
        .lt-print-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(52,211,153,0.6); }
        .lt-spinner { animation: lt-spin 0.8s linear infinite; }
        @keyframes lt-spin { to { transform: rotate(360deg); } }
        .lt-toast { animation: lt-toast-in 0.4s ease, lt-toast-out 0.4s ease 3s forwards; }
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
