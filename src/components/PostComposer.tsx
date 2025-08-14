import React, { useCallback, useRef, useState } from "react";
import "./PostComposer.css";
import { useFeedStore } from "../lib/feedStore";
import { isSuperUser } from "../lib/superUser";
import type { Post } from "../types";

export default function PostComposer() {
  const addPost = useFeedStore((s) => s.addPost);

  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [link, setLink] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);

  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);

  const addImageFiles = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const urls: string[] = [];
    Array.from(files).forEach((f) => {
      if (f.type.startsWith("image/")) {
        urls.push(URL.createObjectURL(f));
      }
    });
    if (urls.length) setImages((arr) => [...urls, ...arr]);
  }, []);

  const addVideoFile = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];
    if (f && f.type.startsWith("video/")) {
      setVideo((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(f);
      });
    }
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgs: File[] = [];
    for (const it of items) {
      if (it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) imgs.push(f);
      }
    }
    if (imgs.length) {
      e.preventDefault();
      const urls = imgs.map((f) => URL.createObjectURL(f));
      setImages((arr) => [...urls, ...arr]);
    }
  }, []);

  function removeImage(i: number) {
    setImages((arr) => {
      const copy = [...arr];
      const [removed] = copy.splice(i, 1);
      if (removed?.startsWith("blob:")) URL.revokeObjectURL(removed);
      return copy;
    });
  }

  function clearVideo() {
    setVideo((v) => {
      if (v?.startsWith("blob:")) URL.revokeObjectURL(v);
      return null;
    });
    if (vidInput.current) vidInput.current.value = "";
  }

  async function handlePost() {
    if (!isSuperUser(key)) {
      alert("Invalid super user key");
      return;
    }
    const hasText = text.trim().length > 0;
    const newPost: Post = {
      id: String(Date.now()),
      author: "@super",
      title: hasText ? text.trim() : link || "New post",
      time: "now",
      images: images.length ? images : undefined,
      video: video || undefined,
      link: link || undefined,
    };
    addPost(newPost);

    // reset composer
    setText("");
    setLink("");
    images.forEach((u) => u.startsWith("blob:") && URL.revokeObjectURL(u));
    setImages([]);
    clearVideo();
    if (imgInput.current) imgInput.current.value = "";
  }

  return (
    <section className="composer">
      <textarea
        className="composer__input"
        placeholder="Share something cosmic…"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={onPaste}
      />

      {/* attachments preview */}
      {(images.length > 0 || video) && (
        <div className="composer__attachments">
          {images.map((src, i) => (
            <div className="att" key={`img-${i}`}>
              <img src={src} alt="" />
              <button
                className="att__x"
                title="Remove"
                onClick={() => removeImage(i)}
              >
                ×
              </button>
            </div>
          ))}
          {video && (
            <div className="att att--video">
              <video src={video} controls playsInline preload="metadata" />
              <button className="att__x" title="Remove" onClick={clearVideo}>
                ×
              </button>
            </div>
          )}
        </div>
      )}

      <div className="composer__row">
        <div className="composer__left">
          <button
            className="composer__tool"
            type="button"
            title="Add image(s)"
            onClick={() => imgInput.current?.click()}
          >
            📷
          </button>
          <input
            ref={imgInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => addImageFiles(e.currentTarget.files)}
          />

          <button
            className="composer__tool"
            type="button"
            title="Add a video"
            onClick={() => vidInput.current?.click()}
          >
            🎬
          </button>
          <input
            ref={vidInput}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => addVideoFile(e.currentTarget.files)}
          />

          <input
            className="composer__link"
            placeholder="Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <div className="composer__right">
          <input
            className="composer__key"
            type="password"
            placeholder="Super user key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <button className="composer__btn" onClick={handlePost}>
            Post
          </button>
        </div>
      </div>
    </section>
  );
}
