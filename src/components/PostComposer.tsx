import { useState } from 'react';

export default function PostComposer() {
  const [text, setText] = useState('');
  return (
    <div style={{ display:'grid', gap:10 }}>
      <textarea
        placeholder="Share something cosmic…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{ padding:10, border:'1px solid var(--line)', borderRadius:12, resize:'vertical' }}
      />
      <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
        <div style={{ color:'var(--ink-2)', fontSize:12 }}>Draft only (demo)</div>
        <button className="btn btn--primary" onClick={() => setText('')}>
          Post
        </button>
      </div>
    </div>
  );
}
