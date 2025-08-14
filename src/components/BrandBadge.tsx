import { useState } from "react";
import bus from "../lib/bus";

export default function BrandBadge({ onEnterUniverse }: { onEnterUniverse: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="brand-wrap">
        <button
          className="brand-dot"
          aria-label="Toggle brand menu"
          onClick={() => setOpen(o => !o)}
          onDoubleClick={() => bus.emit("sidebar:toggle", undefined)} /* bus.emit expects (event, payload) */
        >
          <img
            src="/supernova.png"
            alt="Supernova 2177 logo"
            width={40}
            height={40}
            loading="lazy"
            decoding="async"
            onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'; }}
          />
        </button>
        <div className="brand-label">superNova2177</div>
      </div>

      {open && (
        <div className="brand-menu">
          <button onClick={() => bus.emit("chat:add", { role:"system", text:"Command palette (stub)" })}>
            <svg className="ico" viewBox="0 0 24 24"><path d="M5 12h14M5 7h10M5 17h7" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            <span>Command</span>
          </button>
          <button onClick={() => bus.emit("chat:add", { role:"assistant", text:"Remix current image (stub)" })}>
            <svg className="ico" viewBox="0 0 24 24"><path d="M7 7h10v4H7zm0 6h6v4H7z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            <span>Remix</span>
          </button>
          <button onClick={onEnterUniverse}>
            <svg className="ico" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            <span>Enter Universe</span>
          </button>
        </div>
      )}
    </>
  );
}
