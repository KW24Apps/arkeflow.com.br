'use client'

const RAYS = [
  { left: '8%',  height: '220px', width: '2px',  dur: '7s', delay: '0s'    },
  { left: '18%', height: '180px', width: '2px',  dur: '6s', delay: '-2.1s' },
  { left: '32%', height: '260px', width: '3px',  dur: '8s', delay: '-4.5s' },
  { left: '48%', height: '160px', width: '2px',  dur: '5s', delay: '-1.3s' },
  { left: '60%', height: '240px', width: '3px',  dur: '7s', delay: '-3.7s' },
  { left: '72%', height: '190px', width: '2px',  dur: '6s', delay: '-0.8s' },
  { left: '85%', height: '210px', width: '2px',  dur: '5s', delay: '-5.2s' },
]

const BUBBLES = [
  { size: 6,  bottom: '10px',  left: '7%',  dur: '5s', delay: '0s'    },
  { size: 10, bottom: '30px',  left: '15%', dur: '6s', delay: '-1.2s' },
  { size: 4,  bottom: '50px',  left: '23%', dur: '4s', delay: '-3.0s' },
  { size: 14, bottom: '20px',  left: '31%', dur: '7s', delay: '-0.7s' },
  { size: 7,  bottom: '80px',  left: '40%', dur: '5s', delay: '-2.5s' },
  { size: 5,  bottom: '15px',  left: '47%', dur: '6s', delay: '-4.1s' },
  { size: 12, bottom: '60px',  left: '54%', dur: '7s', delay: '-1.8s' },
  { size: 8,  bottom: '35px',  left: '61%', dur: '5s', delay: '-3.3s' },
  { size: 6,  bottom: '90px',  left: '68%', dur: '4s', delay: '-0.4s' },
  { size: 10, bottom: '25px',  left: '74%', dur: '6s', delay: '-5.0s' },
  { size: 4,  bottom: '70px',  left: '80%', dur: '5s', delay: '-2.2s' },
  { size: 13, bottom: '45px',  left: '86%', dur: '7s', delay: '-1.0s' },
  { size: 7,  bottom: '110px', left: '92%', dur: '6s', delay: '-3.8s' },
  { size: 5,  bottom: '55px',  left: '94%', dur: '4s', delay: '-4.6s' },
  { size: 9,  bottom: '18px',  left: '12%', dur: '7s', delay: '-2.9s' },
  { size: 6,  bottom: '100px', left: '27%', dur: '5s', delay: '-1.5s' },
  { size: 11, bottom: '40px',  left: '38%', dur: '6s', delay: '-0.2s' },
  { size: 4,  bottom: '75px',  left: '57%', dur: '4s', delay: '-3.6s' },
  { size: 8,  bottom: '22px',  left: '71%', dur: '7s', delay: '-4.9s' },
  { size: 6,  bottom: '65px',  left: '88%', dur: '5s', delay: '-1.7s' },
]

export function OceanBackground() {
  return (
    <div
      className="ocean-bg"
      style={{
        position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden',
        background: 'linear-gradient(160deg, #2a7a9a 0%, #1e6080 30%, #174f6a 65%, #0f3a52 100%)',
      }}
    >
      <style>{`
        @keyframes sway {
          0%, 100% { transform: skewX(-4deg); opacity: 0.05; }
          50%       { transform: skewX(4deg);  opacity: 0.13; }
        }
        @keyframes bob {
          0%   { transform: translateY(0);      opacity: 0.7; }
          100% { transform: translateY(-260px); opacity: 0;   }
        }
      `}</style>

      {RAYS.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', top: 0,
            left: r.left, width: r.width, height: r.height,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '2px',
            transformOrigin: 'top center',
            animation: `sway ${r.dur} ease-in-out ${r.delay} infinite`,
          }}
        />
      ))}

      {BUBBLES.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: b.bottom, left: b.left,
            width: `${b.size}px`, height: `${b.size}px`,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.45)',
            animation: `bob ${b.dur} linear ${b.delay} infinite`,
          }}
        />
      ))}
    </div>
  )
}
