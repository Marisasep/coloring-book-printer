import { useRef, useReducer, useState, useCallback, useEffect } from "react";
import { editorReducer, initialState } from "../lib/editorReducer";
import { EMOJIS, loadEmojiImage, getEmojiImage } from "../lib/emojis";
import { loadImage, getCachedImage } from "../lib/imageCache";
import type { EditorElement } from "../lib/types";

function toBW(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width, h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  }
  // Floyd-Steinberg dithering
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = gray[i];
      const val = old < 128 ? 0 : 255;
      gray[i] = val;
      const err = old - val;
      if (x + 1 < w) gray[i + 1] += err * 7 / 16;
      if (y + 1 < h) {
        if (x > 0) gray[i + w - 1] += err * 3 / 16;
        gray[i + w] += err * 5 / 16;
        if (x + 1 < w) gray[i + w + 1] += err * 1 / 16;
      }
    }
  }
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i] > 127 ? 255 : 0;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

type Props = {
  baseImage: HTMLCanvasElement;
  onBack: () => void;
  onPrint: (canvas: HTMLCanvasElement) => void;
};

type Tool = "text" | "emoji" | "image" | null;

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

let nextId = 1;

export default function EditorScreen({ baseImage, onBack, onPrint }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>(null);
  const [txtInput, setTxtInput] = useState("");
  const [txtSize, setTxtSize] = useState(32);
  const [emojiSize, setEmojiSize] = useState(60);
  const [imgSize, setImgSize] = useState(150);
  const [preview, setPreview] = useState<{ original: HTMLCanvasElement; bw: HTMLCanvasElement } | null>(null);
  const dragRef = useRef<{ id: number; ox: number; oy: number } | null>(null);

  const selectedEl = state.elements.find((el) => el.id === selectedId) ?? null;

  const getElBounds = useCallback((el: EditorElement) => {
    if (el.type === "text") {
      const c = document.createElement("canvas").getContext("2d")!;
      c.font = `bold ${el.size}px system-ui, sans-serif`;
      const m = c.measureText(el.content);
      return { x: el.x, y: el.y, w: m.width, h: el.size * 1.2 };
    }
    if (el.type === "image") {
      const r = el.ratio ?? 1;
      return { x: el.x, y: el.y, w: el.size, h: el.size * r };
    }
    return { x: el.x, y: el.y, w: el.size, h: el.size };
  }, []);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, el: EditorElement) => {
    const b = getElBounds(el);
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.save();
    if (el.rotation) {
      ctx.translate(cx, cy);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    if (el.type === "text") {
      ctx.font = `bold ${el.size}px system-ui, sans-serif`;
      ctx.fillStyle = "#000";
      ctx.textBaseline = "top";
      ctx.fillText(el.content, el.x, el.y);
    } else if (el.type === "emoji") {
      const img = getEmojiImage(el.content);
      if (img) ctx.drawImage(img, el.x, el.y, el.size, el.size);
    } else if (el.type === "image") {
      const img = getCachedImage(el.content);
      const r = el.ratio ?? 1;
      if (img) ctx.drawImage(img, el.x, el.y, el.size, el.size * r);
    }
    ctx.restore();
  }, [getElBounds]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(baseImage, 0, 0);

    state.elements.forEach((el) => {
      drawElement(ctx, el);
      if (el.id === selectedId) {
        const b = getElBounds(el);
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        ctx.save();
        if (el.rotation) {
          ctx.translate(cx, cy);
          ctx.rotate((el.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }
        ctx.strokeStyle = "#0d9488";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(b.x - 4, b.y - 4, b.w + 8, b.h + 8);
        ctx.setLineDash([]);
        ctx.restore();
      }
    });
  }, [baseImage, state.elements, selectedId, getElBounds, drawElement]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = baseImage.width;
    c.height = baseImage.height;
    draw();
  }, [baseImage, draw]);

  const canvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const hitTest = (px: number, py: number) => {
    for (let i = state.elements.length - 1; i >= 0; i--) {
      const el = state.elements[i];
      const b = getElBounds(el);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const rad = -(el.rotation * Math.PI) / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const rx = cos * (px - cx) - sin * (py - cy) + cx;
      const ry = sin * (px - cx) + cos * (py - cy) + cy;
      if (rx >= b.x - 6 && rx <= b.x + b.w + 6 && ry >= b.y - 6 && ry <= b.y + b.h + 6) {
        return el.id;
      }
    }
    return null;
  };

  const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const p = canvasCoords(e);
    const hit = hitTest(p.x, p.y);
    if (hit != null) {
      const el = state.elements.find((e) => e.id === hit)!;
      setSelectedId(hit);
      setTool(null);
      dragRef.current = { id: hit, ox: p.x - el.x, oy: p.y - el.y };
    } else {
      setSelectedId(null);
    }
    draw();
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const p = canvasCoords(e);
    dispatch({
      type: "move",
      id: dragRef.current.id,
      x: p.x - dragRef.current.ox,
      y: p.y - dragRef.current.oy,
    });
  };

  const handleUp = () => {
    dragRef.current = null;
  };

  const addText = () => {
    if (!txtInput.trim()) return;
    dispatch({
      type: "add",
      element: {
        id: nextId++,
        type: "text",
        x: baseImage.width / 2 - 50,
        y: baseImage.height / 2,
        size: txtSize,
        rotation: 0,
        content: txtInput.trim(),
      },
    });
    setTxtInput("");
  };

  const addFortune = () => {
    const txt = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    const out = document.createElement("canvas");
    out.width = baseImage.width;
    out.height = baseImage.height;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(baseImage, 0, 0);
    state.elements.forEach((el) => drawElement(ctx, el));
    const fontSize = 40;
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const cx = out.width / 2;
    const cy = out.height - 80;
    ctx.fillStyle = "#fff";
    const tw = ctx.measureText(txt).width;
    ctx.fillRect(cx - tw / 2 - 16, cy - fontSize / 2 - 10, tw + 32, fontSize + 20);
    ctx.fillStyle = "#000";
    ctx.fillText(txt, cx, cy);
    onPrint(toBW(out));
  };

  const addEmoji = async (src: string) => {
    await loadEmojiImage(src);
    dispatch({
      type: "add",
      element: {
        id: nextId++,
        type: "emoji",
        x: baseImage.width / 2 - emojiSize / 2,
        y: baseImage.height / 2 - emojiSize / 2,
        size: emojiSize,
        rotation: 0,
        content: src,
      },
    });
  };

  const addImage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const img = await loadImage(dataUrl);
        const ratio = img.height / img.width;
        dispatch({
          type: "add",
          element: {
            id: nextId++,
            type: "image",
            x: baseImage.width / 2 - imgSize / 2,
            y: baseImage.height / 2 - (imgSize * ratio) / 2,
            size: imgSize,
            rotation: 0,
            content: dataUrl,
            ratio,
          },
        });
      };
      reader.readAsDataURL(f);
      e.target.value = "";
    },
    [baseImage, imgSize],
  );

  const flattenCanvas = (): HTMLCanvasElement => {
    const out = document.createElement("canvas");
    out.width = baseImage.width;
    out.height = baseImage.height;
    const ctx = out.getContext("2d")!;
    ctx.drawImage(baseImage, 0, 0);
    state.elements.forEach((el) => drawElement(ctx, el));
    return out;
  };

  const showPreview = () => {
    setSelectedId(null);
    setTool(null);
    requestAnimationFrame(() => {
      const flat = flattenCanvas();
      setPreview({ original: flat, bw: toBW(flat) });
    });
  };

  if (preview) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <button onClick={() => setPreview(null)} className="w-9 h-9 flex items-center justify-center rounded-lg text-fg-muted hover:bg-border hover:text-fg transition">
            <svg className="w-5 h-5 fill-none stroke-current" strokeWidth={2} viewBox="0 0 20 20"><path d="M13 4l-6 6 6 6" /></svg>
          </button>
          <h1 className="text-[0.95rem] font-semibold flex-1">รูป Preview</h1>
          <button
            onClick={() => { const bw = preview.bw; setPreview(null); onPrint(bw); }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-accent text-white hover:bg-accent-hover transition shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth={2.2} viewBox="0 0 16 16">
              <rect x="3" y="8" width="10" height="5" rx="1" />
              <path d="M4 8V3h8v5" />
              <path d="M1 8h14v4a1 1 0 01-1 1H2a1 1 0 01-1-1V8z" />
            </svg>
            ยืนยันปริ้น
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 flex flex-col items-center gap-4">
          <p className="text-sm text-fg-muted">ภาพขาวดำตามที่จะปริ้นออกมาจริง</p>
          <div className="max-w-[460px] w-full bg-white rounded-2xl overflow-hidden shadow-lg">
            <canvas
              ref={(el) => {
                if (el && preview) {
                  el.width = preview.bw.width;
                  el.height = preview.bw.height;
                  el.getContext("2d")!.drawImage(preview.bw, 0, 0);
                }
              }}
              className="w-full block"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-lg text-fg-muted hover:bg-border hover:text-fg transition">
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth={2} viewBox="0 0 20 20"><path d="M13 4l-6 6 6 6" /></svg>
        </button>
        <h1 className="text-[0.95rem] font-semibold flex-1">แต่งรูป</h1>
        <button
          onClick={showPreview}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-accent text-white hover:bg-accent-hover transition shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth={2.2} viewBox="0 0 16 16">
            <rect x="3" y="8" width="10" height="5" rx="1" />
            <path d="M4 8V3h8v5" />
            <path d="M1 8h14v4a1 1 0 01-1 1H2a1 1 0 01-1-1V8z" />
          </svg>
          ปริ้น
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-canvas-bg">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full cursor-crosshair shadow-xl rounded-sm"
          onMouseDown={handleDown}
          onMouseMove={handleMove}
          onMouseUp={handleUp}
          onMouseLeave={handleUp}
          onTouchStart={handleDown}
          onTouchMove={handleMove}
          onTouchEnd={handleUp}
        />
      </div>

      {/* Sub-tool panels */}
      {tool === "text" && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-accent-soft shrink-0 flex-wrap">
          <input
            value={txtInput}
            onChange={(e) => setTxtInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addText()}
            placeholder="พิมพ์ข้อความ..."
            autoFocus
            className="flex-1 min-w-[120px] px-3 py-2 border border-border-strong rounded-lg bg-card text-fg text-sm"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-[0.65rem] text-fg-faint font-semibold uppercase tracking-wider">ขนาด</span>
            <input type="range" min={16} max={80} value={txtSize} onChange={(e) => setTxtSize(+e.target.value)} className="w-20 accent-accent" />
          </div>
          <button onClick={addText} className="px-4 py-2 rounded-lg text-xs font-bold bg-accent text-white hover:bg-accent-hover transition">
            เพิ่ม
          </button>
        </div>
      )}

      {tool === "emoji" && (
        <div className="border-t border-border bg-accent-soft shrink-0">
          <div className="flex items-center gap-2 px-4 py-2">
            <span className="text-[0.65rem] text-fg-faint font-semibold uppercase tracking-wider">ขนาด</span>
            <input type="range" min={30} max={140} value={emojiSize} onChange={(e) => setEmojiSize(+e.target.value)} className="w-24 accent-accent" />
            <span className="text-xs text-fg-muted font-mono">{emojiSize}px</span>
          </div>
          <div className="grid grid-cols-8 gap-1 px-3 pb-3 max-h-[140px] overflow-y-auto">
            {EMOJIS.map((em) => (
              <button
                key={em.id}
                onClick={() => addEmoji(em.src)}
                className="aspect-square flex items-center justify-center bg-card border border-border rounded-lg hover:border-accent hover:bg-white transition"
              >
                <img src={em.src} alt={em.label} className="w-7 h-7" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tool === "image" && (
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-accent-soft shrink-0">
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-border-strong bg-card text-fg hover:bg-border transition cursor-pointer">
            <svg className="w-4 h-4 fill-none stroke-current" strokeWidth={2} viewBox="0 0 20 20">
              <path d="M3 14l4-5 3 3.5 2.5-3L17 14" />
              <rect x="2" y="3" width="16" height="14" rx="2" />
            </svg>
            เลือกรูปวางทับ
            <input type="file" accept="image/*" onChange={addImage} className="hidden" />
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.65rem] text-fg-faint font-semibold uppercase tracking-wider">ขนาด</span>
            <input type="range" min={40} max={400} value={imgSize} onChange={(e) => setImgSize(+e.target.value)} className="w-24 accent-accent" />
          </div>
        </div>
      )}

      {selectedEl && tool == null && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border bg-accent-soft shrink-0 flex-wrap">
          <span className="text-xs text-fg-muted">
            {selectedEl.type === "text" ? "ข้อความ" : selectedEl.type === "emoji" ? "อิโมจิ" : "รูปภาพ"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.65rem] text-fg-faint font-semibold uppercase tracking-wider">ขนาด</span>
            <input
              type="range"
              min={10}
              max={400}
              value={selectedEl.size}
              onChange={(e) => dispatch({ type: "resize", id: selectedEl.id, size: +e.target.value })}
              className="w-24 accent-accent"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.65rem] text-fg-faint font-semibold uppercase tracking-wider">หมุน</span>
            <input
              type="range"
              min={-180}
              max={180}
              value={selectedEl.rotation}
              onChange={(e) => dispatch({ type: "rotate", id: selectedEl.id, rotation: +e.target.value })}
              className="w-24 accent-accent"
            />
            <span className="text-xs text-fg-muted font-mono w-[3ch] text-right">{selectedEl.rotation}°</span>
          </div>
          <button
            onClick={() => { dispatch({ type: "delete", id: selectedEl.id }); setSelectedId(null); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-danger border border-danger/30 bg-danger-soft hover:bg-danger/10 transition"
          >
            ลบ
          </button>
        </div>
      )}

      {/* Main toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-border bg-card shrink-0">
        <ToolBtn active={tool === "text"} onClick={() => { setTool(tool === "text" ? null : "text"); setSelectedId(null); }} title="ข้อความ">
          <path d="M5 4h10M10 4v12" strokeWidth={2.2} />
        </ToolBtn>
        <ToolBtn active={tool === "emoji"} onClick={() => { setTool(tool === "emoji" ? null : "emoji"); setSelectedId(null); }} title="อิโมจิ">
          <circle cx="10" cy="10" r="7.5" />
          <circle cx="7.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
          <path d="M7.5 12.5a3 3 0 005 0" />
        </ToolBtn>
        <ToolBtn active={tool === "image"} onClick={() => { setTool(tool === "image" ? null : "image"); setSelectedId(null); }} title="รูปภาพ">
          <rect x="2.5" y="4" width="15" height="12" rx="2" />
          <path d="M3 13l4-4.5 3 3 2.5-3L17 13" />
          <circle cx="6.5" cy="7.5" r="1.5" />
        </ToolBtn>
        <ToolBtn onClick={() => { addFortune(); setTool(null); setSelectedId(null); }} title="สุ่มคำทำนาย">
          <path d="M10 2v3M14.5 3.5l-2 2M17 8h-3M3 8h3M5.5 3.5l2 2" />
          <circle cx="10" cy="11" r="6" />
          <path d="M10 8v3.5l2 1.5" />
        </ToolBtn>
        <div className="w-px h-6 bg-border mx-1" />
        <ToolBtn onClick={() => dispatch({ type: "undo" })} title="ย้อนกลับ">
          <path d="M4 8l4-4M4 8l4 4M5 8h8a4 4 0 010 8H10" />
        </ToolBtn>
        <ToolBtn onClick={() => { dispatch({ type: "clear" }); setSelectedId(null); }} title="ล้างทั้งหมด">
          <path d="M5 5l10 10M15 5L5 15" />
        </ToolBtn>
      </div>
    </div>
  );
}

function ToolBtn({ children, active, onClick, title }: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-10 h-10 flex items-center justify-center rounded-xl border transition ${
        active
          ? "bg-accent-soft border-accent text-accent"
          : "border-transparent text-fg-muted hover:bg-border hover:text-fg"
      }`}
    >
      <svg className="w-5 h-5 stroke-current fill-none" strokeWidth={1.6} viewBox="0 0 20 20" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
