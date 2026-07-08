import { useState, useEffect } from "react";
import { getTicketImage } from "../lib/ticketStore";

type Props = { ticketNumber: string; onClose: () => void };

export default function TicketViewer({ ticketNumber, onClose }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTicketImage(ticketNumber)
      .then((src) => { setImageSrc(src); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticketNumber]);

  const download = () => {
    if (!imageSrc) return;
    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = `lottery_${ticketNumber}.png`;
    link.click();
  };

  const share = async () => {
    if (!imageSrc) return;
    try {
      const res = await fetch(imageSrc);
      const blob = await res.blob();
      const file = new File([blob], `lottery_${ticketNumber}.png`, { type: "image/png" });
      await navigator.share({ files: [file], title: `สลาก ${ticketNumber}` });
    } catch {
      download();
    }
  };

  return (
    <div className="tv-overlay">
      <div className="tv-card">
        <h2 className="tv-title">สลากของคุณ</h2>
        <p className="tv-number">เลขที่ <strong>{ticketNumber}</strong></p>

        {loading && <p className="tv-msg">กำลังโหลด...</p>}

        {!loading && !imageSrc && (
          <div className="tv-not-found">
            <p>ไม่พบสลากหมายเลขนี้</p>
            <p className="tv-hint">สลากอาจถูกสร้างจากเครื่องอื่น หรือข้อมูลถูกล้างไปแล้ว</p>
          </div>
        )}

        {imageSrc && (
          <>
            <img src={imageSrc} alt={`สลาก ${ticketNumber}`} className="tv-img" />
            <div className="tv-actions">
              {navigator.share && (
                <button className="tv-share-btn" onClick={share}>แชร์</button>
              )}
              <button className="tv-dl-btn" onClick={download}>ดาวน์โหลด</button>
            </div>
          </>
        )}

        <button className="tv-close" onClick={onClose}>ปิด</button>
      </div>

      <style>{`
        .tv-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #ffd6e0 0%, #c8e7ff 50%, #fff3b0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 200;
        }
        .tv-card {
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(10px);
          border-radius: 24px;
          padding: clamp(20px, 5vw, 32px);
          max-width: 600px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.08);
        }
        .tv-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: #444;
          margin: 0 0 4px;
        }
        .tv-number {
          font-size: 1rem;
          color: #888;
          margin: 0 0 16px;
          letter-spacing: 0.15em;
        }
        .tv-msg {
          color: #999;
          font-size: 0.9rem;
        }
        .tv-not-found p {
          margin: 4px 0;
          color: #b91c1c;
          font-weight: 500;
        }
        .tv-hint {
          color: #999 !important;
          font-weight: 400 !important;
          font-size: 0.8rem;
        }
        .tv-img {
          width: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
          margin-bottom: 16px;
        }
        .tv-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 12px;
        }
        .tv-share-btn, .tv-dl-btn {
          padding: 10px 28px;
          font-size: 0.95rem;
          font-weight: 500;
          font-family: inherit;
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .tv-share-btn {
          background: linear-gradient(135deg, #6ee7b7, #34d399);
          color: white;
          box-shadow: 0 4px 12px rgba(52,211,153,0.3);
        }
        .tv-dl-btn {
          background: linear-gradient(135deg, #93c5fd, #60a5fa);
          color: white;
          box-shadow: 0 4px 12px rgba(96,165,250,0.3);
        }
        .tv-share-btn:hover, .tv-dl-btn:hover {
          transform: translateY(-1px);
        }
        .tv-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 0.85rem;
          font-family: inherit;
          cursor: pointer;
          padding: 8px 16px;
        }
        .tv-close:hover { color: #64748b; }
      `}</style>
    </div>
  );
}
