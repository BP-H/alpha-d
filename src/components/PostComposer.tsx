import { useState } from 'react';
import { useFeedStore } from '../lib/feedStore';
import { isSuperUser } from '../lib/superUser';
import { repost } from '../lib/repost';
import type { Post } from '../types';

export default function PostComposer() {
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const addPost = useFeedStore((s) => s.addPost);

  const handlePost = async () => {
    if (!isSuperUser(key)) {
      alert('Invalid key');
      return;
    }
    const newPost: Post = {
      id: Date.now(),
      author: '@super',
      title: text,
      time: 'now',
      images: ['/vite.svg'],
    };
    addPost(newPost);
    await Promise.all([
      repost('x', text),
      repost('facebook', text),
      repost('linkedin', text),
    ]);
    setText('');
  };

  return (
    <div style={{ display:'grid', gap:10 }}>
      <textarea
        placeholder="Share something cosmic…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{ padding:10, border:'1px solid var(--line)', borderRadius:12, resize:'vertical' }}
      />
      <input
        type="password"
        placeholder="Super user key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        style={{ padding:10, border:'1px solid var(--line)', borderRadius:12 }}
      />
      <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
        <div style={{ color:'var(--ink-2)', fontSize:12 }}>Super user can post</div>
        <button className="btn btn--primary" onClick={handlePost}>
          Post
        </button>
      </div>
    </div>
  );
}
