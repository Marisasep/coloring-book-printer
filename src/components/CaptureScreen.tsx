import { useRef, useState, useCallback } from "react";

const PRINT_W = 696;

function resizeForPrint(src: HTMLCanvasElement): HTMLCanvasElement {
  const scale = PRINT_W / src.width;
  const h = Math.round(src.height * scale);
  const c = document.createElement("canvas");
  c.width = PRINT_W;
  c.height = h;
  c.getContext("2d")!.drawImage(src, 0, 0, PRINT_W, h);
  return c;
}

type Props = { onCapture: (canvas: HTMLCanvasElement) => void };

export default function CaptureScreen({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);

  const startCam = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCamOn(true);
    } catch { /* denied */ }
  }, []);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  }, []);

  const snap = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    stopCam();
    onCapture(resizeForPrint(c));
  }, [onCapture, stopCam]);

  const pickFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d")!.drawImage(img, 0, 0);
        onCapture(resizeForPrint(c));
      };
      img.src = URL.createObjectURL(f);
    },
    [onCapture],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Sticker Printer</h1>
        <p className="text-sm text-fg-muted mt-0.5">ถ่ายรูปหรืออัปโหลด แล้วแต่งสติกเกอร์ได้เลย</p>
      </div>

      {/* Camera preview */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-5 overflow-auto">
        <div className="relative w-full max-w-[500px] aspect-[4/3] bg-[#0e0e0d] rounded-2xl overflow-hidden shadow-lg">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover block" />
          {!camOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#666]">
              <svg className="w-16 h-16 stroke-[#555] fill-none" strokeWidth={1} viewBox="0 0 56 56">
                <rect x="6" y="14" width="44" height="34" rx="5" />
                <circle cx="28" cy="32" r="10" />
                <circle cx="28" cy="32" r="4" />
                <rect x="20" y="8" width="16" height="6" rx="3" />
              </svg>
              <span className="text-sm">เริ่มจากกดเปิดกล้องหรืออัปโหลดรูป</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap justify-center w-full max-w-[500px]">
          {!camOn ? (
            <button
              onClick={startCam}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition shadow-sm"
            >
              <svg className="w-4.5 h-4.5 fill-none stroke-current" strokeWidth={2} viewBox="0 0 20 20">
                <rect x="2" y="5" width="16" height="12" rx="2" />
                <circle cx="10" cy="11" r="3.5" />
              </svg>
              เปิดกล้อง
            </button>
          ) : (
            <>
              <button
                onClick={snap}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition shadow-sm"
              >
                ถ่ายรูป
              </button>
              <button
                onClick={stopCam}
                className="px-5 py-3 rounded-xl text-sm font-semibold border border-border-strong bg-card text-fg hover:bg-border transition"
              >
                ปิดกล้อง
              </button>
            </>
          )}

          <label className="flex-1 min-w-[140px] relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-border-strong bg-card text-fg hover:bg-border transition cursor-pointer">
            <svg className="w-4.5 h-4.5 fill-none stroke-current" strokeWidth={2} viewBox="0 0 20 20">
              <path d="M3 14l4-5 3 3.5 2.5-3L17 14" />
              <rect x="2" y="3" width="16" height="14" rx="2" />
            </svg>
            อัปโหลดรูป
            <input type="file" accept="image/*" onChange={pickFile} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>
      </div>
    </div>
  );
}
