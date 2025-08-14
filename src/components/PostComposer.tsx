import { useState } from 'react';
import { isSuperUser } from '../lib/superUser';
import { repostTo, SocialTarget } from '../lib/repost';

export default function PostComposer() {
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [target, setTarget] = useState<SocialTarget>('x');

  const handlePost = async () => {
    if (!isSuperUser(key)) {
      alert('Invalid super user key');
      return;
    }
    await repostTo(target, text);
    setText('');
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <textarea
        placeholder="Share something cosmic…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 12, resize: 'vertical' }}
      />
      <input
        type="password"
        placeholder="Super user key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 12 }}
      />
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value as SocialTarget)}
        style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 12 }}
      >
        <option value="x">X/Twitter</option>
        <option value="facebook">Facebook</option>
        <option value="linkedin">LinkedIn</option>
        <option value="instagram">Instagram</option>
      </select>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>Draft only (demo)</div>
        <button className="btn btn--primary" onClick={handlePost}>
          Post
        </button>
      </div>
    </div>
  );
}
