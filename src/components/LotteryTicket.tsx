import { forwardRef, useEffect, useRef, useState } from "react";

const TICKET_W = 1400;
const TICKET_H = 696;

type Props = {
  photoSrc: string;
  ticketNumber: string;
  logoSrc: string;
  qrLeftSrc: string;
  barcodeSrc: string;
  dateTh: string;
  dateEn: string;
  serial: string;
};

const LotteryTicket = forwardRef<HTMLDivElement, Props>(function LotteryTicket(
  {
    photoSrc,
    ticketNumber,
    logoSrc,
    qrLeftSrc,
    barcodeSrc,
    dateTh,
    dateEn,
    serial,
  },
  ref,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(500 / TICKET_W);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setScale(el.offsetWidth / TICKET_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const digitWords = [
    "ZERO",
    "ONE",
    "TWO",
    "THR",
    "FOR",
    "FIV",
    "SIX",
    "SEV",
    "EIG",
    "NIN",
  ];
  const digitThai = [
    "ศูนย์",
    "หนึ่ง",
    "สอง",
    "สาม",
    "สี่",
    "ห้า",
    "หก",
    "เจ็ด",
    "แปด",
    "เก้า",
  ];
  const digits = ticketNumber.split("");

  return (
    <>
      <div
        ref={wrapperRef}
        className="ltt-wrapper"
        style={{ height: TICKET_H * scale }}
      >
        <div ref={ref} className="ltt" style={{ transform: `scale(${scale})` }}>
          <div className="ltt-inner">
            {/* ===== LEFT SECTION ===== */}
            <div className="ltt-left">
              <div className="ltt-date-row">
                {" "}
                <div>
                  {" "}
                  <img className="ltt-logo" src={logoSrc} alt="" />
                </div>
                <div className="flex flex-col">
                  {" "}
                  <div className="ltt-header-th">สลากกินไม่แบ่ง</div>
                  <div className="ltt-header-en"> LOTTERY</div>
                </div>
              </div>

              <div className="ltt-photo-frame">
                <img className="ltt-photo" src={photoSrc} alt="" />
              </div>

              <div className="ltt-left-bottom">
                <div className="ltt-price-l">
                  <span className="ltt-price-l-num">80</span>
                  <span className="ltt-price-l-unit">บาท</span>
                </div>
                <img className="ltt-qr-s" src={qrLeftSrc} alt="" />
              </div>

              <div className="ltt-slogan">มั่งคั่ง มั่นคง สมหวัง</div>
            </div>

            {/* ===== VERTICAL DIVIDER ===== */}
            <div className="ltt-vdiv" />

            {/* ===== RIGHT SECTION ===== */}
            <div className="ltt-right">
              <div className="ltt-numbox">
                <div className="ltt-numbox-inner">
                  {digits.map((d, i) => (
                    <span key={i} className="ltt-digit">
                      {d}
                      <span className="ltt-digit-en">{digitWords[+d]}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="ltt-period-row">
                <div className="ltt-date-block">
                  <div className="ltt-date-th">{dateTh}</div>
                  <div className="ltt-date-en">{dateEn}</div>
                </div>
                <div className="ltt-period-items">
                  <span className="ltt-period-item">
                    งวดที่ <strong>{ticketNumber[0]}</strong>
                  </span>
                  <span className="ltt-period-item">
                    ชุดที่ <strong>{ticketNumber.slice(1, 3)}</strong>
                  </span>
                </div>
              </div>

              <div className="ltt-barcode-wrap">
                <img className="ltt-barcode" src={barcodeSrc} alt="" />
              </div>
            </div>
          </div>
          {/* Side text (vertical) */}
          <div className="ltt-side">
            {digits.map((d, i) => (
              <div key={i} className="ltt-side-char">{digitThai[+d]}</div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .ltt-wrapper {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
          overflow: hidden;
          border-radius: 4px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          border: 1px solid #e5e7eb;
        }
        .ltt {
          width: ${TICKET_W}px;
          height: ${TICKET_H}px;
          background: #fff;
          position: relative;
          font-family: 'Prompt', sans-serif;
          color: #000;
          box-sizing: border-box;
          border: 3px solid #000;
          padding: 8px;
          transform-origin: top left;
        }
        .ltt-inner {
          border: none;
          width: calc(100% - 70px);
          height: 100%;
          display: flex;
          box-sizing: border-box;
        }

        /* ===== LEFT ===== */
        .ltt-left {
          width: 520px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }
        .ltt-photo-frame {
          border: 2px solid #000;
          line-height: 0;
        }
        .ltt-photo {
          width: 320px;
          height: 320px;
          display: block;
          object-fit: cover;
        }
        .ltt-left-bottom {
          display: flex;
          align-items: center;
          margin-top: 14px;
          gap: 60px;
        }
        .ltt-qr-s {
          width: 90px;
          height: 90px;
          display: block;
        }
        .ltt-price-l {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .ltt-price-l-num {
          font-size: 72px;
          font-weight: 900;
          line-height: 1;
        }
        .ltt-price-l-unit {
          font-size: 22px;
          font-weight: bold;
          line-height: 1.2;
        }
        .ltt-slogan {
          font-size: 28px;
          font-weight: 900;
          text-align: center;
          margin-top: 8px;
        }

        /* ===== DIVIDER ===== */
        .ltt-vdiv {
          width: 1.5px;
          background: #000;
          margin: 10px 0;
          flex-shrink: 0;
        }

        /* ===== RIGHT ===== */
        .ltt-right {
          flex: 1;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 0;
        }
        .ltt-header-th {
          font-size: 48px;
          font-weight: 900;
          text-align: left;
        }
        .ltt-header-en {
          font-size: 18px;
          text-align: left;
          margin-top: 2px;
        }
        .ltt-hr {
          width: 100%;
          height: 1px;
          background: #000;
          margin: 10px 0;
          flex-shrink: 0;
        }
        .ltt-date-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .ltt-date-left {
          text-align: left;
        }
        .ltt-label {
          font-size: 22px;
          font-weight: bold;
        }
        .ltt-date-block {
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ltt-date-th {
          font-size: 52px;
          font-weight: 900;
          line-height: 1.2;
        }
        .ltt-date-en {
          font-size: 34px;
          font-weight: bold;
          color: #d94070;
          line-height: 1.2;
        }
        .ltt-price-r {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .ltt-price-r-num {
          font-size: 36px;
          font-weight: bold;
          line-height: 1;
        }
        .ltt-price-r-unit {
          font-size: 16px;
          font-weight: bold;
          line-height: 1.2;
        }
        .ltt-logo {
          width: 80px;
          height: auto;
        }

        /* ===== NUMBER BOX ===== */
        .ltt-numbox {
          width: calc(100% - 20px);
          border: 3px solid #000;
          padding: 4px;
        }
        .ltt-numbox-inner {
          border: 1.5px solid #000;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 10px 0;
        }
        .ltt-digit {
          font-size: 70px;
          font-weight: bold;
          line-height: 1;
          flex: 1;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .ltt-digit-en {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.1em;
          margin-top: 4px;
        }

        /* ===== PERIOD ROW ===== */
        .ltt-period-row {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 50px;
        }
        .ltt-period-items {
          display: flex;
          gap: 40px;
        }
        .ltt-period-item {
          font-size: 32px;
        }
        .ltt-period-item strong {
          font-size: 44px;
          margin-left: 8px;
        }

        /* ===== QR RIGHT ===== */
        .ltt-barcode-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ltt-barcode {
          width: 100%;
          max-width: 700px;
          height: 80px;
          display: block;
        }

        /* ===== FOOTER ===== */
        .ltt-serial {
          font-size: 14px;
          text-align: center;
        }
        .ltt-footer {
          font-size: 12px;
          text-align: center;
          margin-top: 4px;
        }

        /* ===== SIDE TEXT ===== */
        .ltt-side {
          position: absolute;
          right: 10px;
          top: 8px;
          bottom: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          width: 55px;
        }
        .ltt-side-char {
          font-size: 22px;
          font-weight: 700;
          line-height: 1;
          text-align: center;
          transform: rotate(-90deg);
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </>
  );
});

export default LotteryTicket;
