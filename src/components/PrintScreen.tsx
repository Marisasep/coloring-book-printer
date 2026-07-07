import { useRef, useEffect, useState } from "react";

const PRINTER_URL = "https://printer-hackathon.synoralab.dev";

type Props = {
  printCanvas: HTMLCanvasElement;
  onBack: () => void;
  onHome: () => void;
};

export default function PrintScreen({ printCanvas, onBack, onHome }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<{ msg: string; type: "info" | "ok" | "err" } | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = printCanvas.width;
    c.height = printCanvas.height;
    c.getContext("2d")!.drawImage(printCanvas, 0, 0);
  }, [printCanvas]);

  const doPrint = async () => {
    setPrinting(true);
    setStatus({ msg: "กำลังส่งไปยัง printer...", type: "info" });

    try {
      const canvas = canvasRef.current!;
      const blob = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));

      const res = await fetch(`${PRINTER_URL}/print?label=62&cut=true`, { method: "POST", body: blob });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ msg: `Error: ${data.error || res.statusText}`, type: "err" });
        setPrinting(false);
        return;
      }

      setStatus({ msg: `Job ${data.jobId.slice(0, 8)}... กำลังพิมพ์`, type: "info" });

      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const jr = await fetch(`${PRINTER_URL}/jobs/${data.jobId}`);
          const job = await jr.json();
          if (job.status === "done") {
            clearInterval(poll);
            setStatus({ msg: "ปริ้นสำเร็จ!", type: "ok" });
            setPrinting(false);
          } else if (job.status === "failed") {
            clearInterval(poll);
            setStatus({ msg: `ปริ้นล้มเหลว: ${job.error}`, type: "err" });
            setPrinting(false);
          } else if (attempts > 30) {
            clearInterval(poll);
            setStatus({ msg: "Timeout — ตรวจสอบ printer", type: "err" });
            setPrinting(false);
          }
        } catch { /* keep polling */ }
      }, 1000);
    } catch (e) {
      setStatus({ msg: `เชื่อมต่อไม่ได้: ${(e as Error).message}`, type: "err" });
      setPrinting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-lg text-fg-muted hover:bg-border hover:text-fg transition">
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth={2} viewBox="0 0 20 20"><path d="M13 4l-6 6 6 6" /></svg>
        </button>
        <h1 className="text-[0.95rem] font-semibold flex-1">พิมพ์สติกเกอร์</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-5">
        <div className="max-w-[420px] w-full bg-white rounded-2xl overflow-hidden shadow-lg">
          <canvas ref={canvasRef} className="w-full block" />
        </div>

        <button
          onClick={doPrint}
          disabled={printing}
          className="w-full max-w-[420px] py-3.5 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent-hover disabled:opacity-40 transition shadow-sm flex items-center justify-center gap-2"
        >
          {printing && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {printing ? "กำลังพิมพ์..." : "พิมพ์สติกเกอร์"}
        </button>

        {status && (
          <div className={`text-sm px-5 py-3.5 rounded-xl text-center w-full max-w-[420px] font-medium ${
            status.type === "ok" ? "bg-green-soft text-green" :
            status.type === "err" ? "bg-danger-soft text-danger" :
            "bg-card text-fg-muted border border-border"
          }`}>
            {status.type === "ok" && "✓ "}{status.msg}
          </div>
        )}

        {status?.type === "ok" && (
          <button
            onClick={onHome}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-border-strong bg-card text-fg hover:bg-border transition"
          >
            ถ่ายรูปใหม่
          </button>
        )}
      </div>
    </div>
  );
}
