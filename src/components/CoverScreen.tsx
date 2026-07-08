import { useState } from "react";

type Props = { onStart: (mode: string) => void };

const CARDS = [
  {
    mode: "fortune",
    title: "ดวงวันนี้",
    subtitle: "Today's Fortune",
    desc: "ดวงของคุณวันนี้",
    bg: "linear-gradient(135deg, #9dd5c0 0%, #7ec8b0 100%)",
    border: "#b8d8c8",
    icon: (
      <svg viewBox="0 0 80 80" className="card-icon">
        <circle cx="40" cy="40" r="30" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
        <circle cx="40" cy="40" r="22" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5" />
        <circle cx="40" cy="40" r="14" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" />
        <circle cx="40" cy="40" r="6" fill="#fff" opacity="0.6" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="40"
            y1="10"
            x2="40"
            y2="18"
            stroke="#fff"
            strokeWidth="1"
            opacity="0.5"
            transform={`rotate(${deg} 40 40)`}
          />
        ))}
      </svg>
    ),
  },
  {
    mode: "words",
    title: "สามคำที่เป็นคุณ",
    subtitle: "Your 3 Words",
    desc: "เลือกคำที่ใช่ที่สุด",
    bg: "linear-gradient(135deg, #d4a96a 0%, #c9975a 100%)",
    border: "#d4b896",
    icon: (
      <svg viewBox="0 0 80 80" className="card-icon">
        <path
          d="M20 50c0-16 10-28 20-28s20 12 20 28"
          fill="none"
          stroke="#fff"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <ellipse cx="40" cy="35" rx="18" ry="14" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
        <ellipse cx="40" cy="35" rx="12" ry="9" fill="#fff" opacity="0.3" />
        <circle cx="40" cy="52" r="3" fill="#fff" opacity="0.5" />
      </svg>
    ),
  },
  {
    mode: "lottery",
    title: "จับฉันที",
    subtitle: "Catch Me If You Can",
    desc: "ตอบสนุกกับเกม",
    bg: "linear-gradient(135deg, #f0c4c8 0%, #e8aeb4 100%)",
    border: "#e8c8cc",
    icon: (
      <svg viewBox="0 0 80 80" className="card-icon">
        <circle cx="28" cy="32" r="12" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
        <circle cx="28" cy="32" r="6" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" />
        <circle cx="28" cy="32" r="2" fill="#fff" opacity="0.5" />
        <circle cx="52" cy="32" r="12" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
        <circle cx="52" cy="32" r="6" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" />
        <circle cx="52" cy="32" r="2" fill="#fff" opacity="0.5" />
        <circle cx="40" cy="54" r="10" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
        <circle cx="40" cy="54" r="4" fill="#fff" opacity="0.4" />
      </svg>
    ),
  },
  {
    mode: "vogue",
    title: "YOUR",
    titleLine2: "VOGUE",
    subtitle: "",
    desc: "",
    bg: "#ffffff",
    border: "#d4b896",
    dark: true,
    icon: (
      <svg viewBox="0 0 80 80" className="card-icon card-icon-dark">
        <rect x="18" y="24" width="44" height="32" rx="5" fill="none" stroke="#c9975a" strokeWidth="2" />
        <circle cx="40" cy="40" r="10" fill="none" stroke="#c9975a" strokeWidth="2" />
        <circle cx="40" cy="40" r="4" fill="none" stroke="#c9975a" strokeWidth="1.5" />
        <rect x="28" y="18" width="14" height="6" rx="3" fill="none" stroke="#c9975a" strokeWidth="1.5" />
        <path d="M35 14l5-4 5 4" fill="none" stroke="#c9975a" strokeWidth="1.5" />
      </svg>
    ),
  },
];

export default function CoverScreen({ onStart }: Props) {
  const [pressed, setPressed] = useState<number | null>(null);

  return (
    <div className="cover">
      {/* Decorative gold dots */}
      <div className="deco deco-1" />
      <div className="deco deco-2" />
      <div className="deco deco-3" />

      {/* Corner ornaments */}
      <svg className="corner corner-tl" viewBox="0 0 60 60">
        <path d="M2 58 L2 2 L58 2" fill="none" stroke="#c9a96a" strokeWidth="1.5" opacity="0.4" />
        <path d="M8 52 L8 8 L52 8" fill="none" stroke="#c9a96a" strokeWidth="1" opacity="0.25" />
      </svg>
      <svg className="corner corner-tr" viewBox="0 0 60 60">
        <path d="M58 58 L58 2 L2 2" fill="none" stroke="#c9a96a" strokeWidth="1.5" opacity="0.4" />
        <path d="M52 52 L52 8 L8 8" fill="none" stroke="#c9a96a" strokeWidth="1" opacity="0.25" />
      </svg>
      <svg className="corner corner-bl" viewBox="0 0 60 60">
        <path d="M2 2 L2 58 L58 58" fill="none" stroke="#c9a96a" strokeWidth="1.5" opacity="0.4" />
        <path d="M8 8 L8 52 L52 52" fill="none" stroke="#c9a96a" strokeWidth="1" opacity="0.25" />
      </svg>
      <svg className="corner corner-br" viewBox="0 0 60 60">
        <path d="M58 2 L58 58 L2 58" fill="none" stroke="#c9a96a" strokeWidth="1.5" opacity="0.4" />
        <path d="M52 8 L52 52 L8 52" fill="none" stroke="#c9a96a" strokeWidth="1" opacity="0.25" />
      </svg>

      <div className="cover-content">
        <div className="cover-header">
          <h1 className="cover-title">
            <span>MY</span>
            <span>PHOTO</span>
            <span>BOOTH</span>
          </h1>
          <p className="cover-subtitle">SELECT YOUR EXPERIENCE</p>
        </div>

        <div className="card-grid">
          {CARDS.map((card, i) => (
            <button
              key={i}
              className={`card ${pressed === i ? "card-pressed" : ""} ${card.dark ? "card-dark" : ""}`}
              style={{
                background: card.bg,
                borderColor: card.border,
              }}
              onPointerDown={() => setPressed(i)}
              onPointerUp={() => setPressed(null)}
              onPointerLeave={() => setPressed(null)}
              onClick={() => onStart(card.mode)}
            >
              {card.icon}
              <span className="card-title">{card.title}</span>
              {card.titleLine2 && <span className="card-title card-title-big">{card.titleLine2}</span>}
              {card.subtitle && <span className="card-subtitle">{card.subtitle}</span>}
              {card.desc && <span className="card-desc">{card.desc}</span>}
            </button>
          ))}
        </div>

        <p className="cover-hint">เลือกประสบการณ์ที่ต้องการ</p>
      </div>

      <style>{`
        .cover {
          position: fixed;
          inset: 0;
          background: linear-gradient(170deg, #fef0f0 0%, #f5ece3 30%, #eef5ee 60%, #fef0f0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          z-index: 100;
        }

        .deco {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4b07a 0%, #c9975a 100%);
          opacity: 0.5;
        }
        .deco-1 {
          width: 80px;
          height: 80px;
          top: 5%;
          right: 8%;
          opacity: 0.35;
        }
        .deco-2 {
          width: 20px;
          height: 20px;
          top: 12%;
          left: 15%;
          opacity: 0.25;
        }
        .deco-3 {
          width: 14px;
          height: 14px;
          bottom: 18%;
          right: 12%;
          opacity: 0.2;
        }

        .corner {
          position: absolute;
          width: clamp(30px, 8vw, 50px);
          height: clamp(30px, 8vw, 50px);
        }
        .corner-tl { top: clamp(12px, 3vw, 24px); left: clamp(12px, 3vw, 24px); }
        .corner-tr { top: clamp(12px, 3vw, 24px); right: clamp(12px, 3vw, 24px); }
        .corner-bl { bottom: clamp(12px, 3vw, 24px); left: clamp(12px, 3vw, 24px); }
        .corner-br { bottom: clamp(12px, 3vw, 24px); right: clamp(12px, 3vw, 24px); }

        .cover-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(20px, 5vw, 36px);
          padding: clamp(24px, 6vw, 48px) clamp(16px, 4vw, 32px);
          max-width: 460px;
          width: 100%;
        }

        .cover-header {
          text-align: center;
        }

        .cover-title {
          font-family: 'Playfair Display', 'Cormorant Garamond', serif;
          font-weight: 400;
          font-style: italic;
          color: #3a3530;
          margin: 0;
          line-height: 1.05;
          display: flex;
          flex-direction: column;
        }
        .cover-title span:nth-child(1) {
          font-size: clamp(2rem, 8vw, 3.2rem);
          letter-spacing: 0.15em;
        }
        .cover-title span:nth-child(2) {
          font-size: clamp(3rem, 12vw, 5rem);
          letter-spacing: 0.08em;
          margin: -4px 0;
        }
        .cover-title span:nth-child(3) {
          font-size: clamp(2.2rem, 9vw, 3.6rem);
          letter-spacing: 0.22em;
        }

        .cover-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 500;
          font-size: clamp(0.7rem, 2.5vw, 0.9rem);
          letter-spacing: 0.25em;
          color: #8a7e72;
          margin: clamp(8px, 2vw, 14px) 0 0;
          text-transform: uppercase;
        }

        .card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(10px, 3vw, 16px);
          width: 100%;
        }

        .card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          aspect-ratio: 1;
          border-radius: clamp(14px, 4vw, 20px);
          border: 2.5px solid;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          padding: 12px;
          -webkit-tap-highlight-color: transparent;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          inset: 3px;
          border-radius: inherit;
          border: 1px solid rgba(255,255,255,0.25);
          pointer-events: none;
        }
        .card-dark::before {
          border-color: rgba(201,151,90,0.15);
        }
        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }
        .card:active, .card-pressed {
          transform: translateY(1px) scale(0.97);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .card-icon {
          width: clamp(40px, 12vw, 60px);
          height: clamp(40px, 12vw, 60px);
          margin-bottom: 4px;
        }
        .card-icon-dark {
          opacity: 0.8;
        }

        .card-title {
          font-family: 'Prompt', sans-serif;
          font-weight: 600;
          font-size: clamp(0.8rem, 3vw, 1rem);
          color: #fff;
          line-height: 1.2;
        }
        .card-dark .card-title {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 700;
          color: #c9975a;
          font-size: clamp(0.85rem, 3.2vw, 1.05rem);
          letter-spacing: 0.1em;
        }
        .card-title-big {
          font-size: clamp(1.2rem, 5vw, 1.6rem) !important;
          letter-spacing: 0.15em !important;
        }

        .card-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(0.55rem, 2vw, 0.7rem);
          color: rgba(255,255,255,0.8);
          font-weight: 500;
          letter-spacing: 0.05em;
          font-style: italic;
        }
        .card-dark .card-subtitle {
          color: #b08a5a;
        }

        .card-desc {
          font-family: 'Prompt', sans-serif;
          font-size: clamp(0.5rem, 1.8vw, 0.6rem);
          color: rgba(255,255,255,0.6);
          font-weight: 300;
        }
        .card-dark .card-desc {
          color: #b0a090;
        }

        .cover-hint {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 500;
          font-size: clamp(0.7rem, 2.5vw, 0.85rem);
          letter-spacing: 0.15em;
          color: #b0a090;
          margin: 0;
        }

        @keyframes coverFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cover-header {
          animation: coverFadeIn 0.8s ease both;
        }
        .card-grid {
          animation: coverFadeIn 0.8s ease 0.2s both;
        }
        .cover-hint {
          animation: coverFadeIn 0.8s ease 0.4s both;
        }
      `}</style>
    </div>
  );
}
