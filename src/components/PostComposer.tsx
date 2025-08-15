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
  const [pdf, setPdf] = useState<string | null>(null);
  const [model3d, setModel3d] = useState<string | null>(null);

  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);

  const addImageFiles = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) urls.push(URL.createObjectURL(f));
    }
    if (urls.length) setImages((arr) => [...arr, ...urls]);
  }, []);

  const addVideoFile = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];
    if (f && f.type.startsWith("video/")) {
      // replace any previous selection (do not revoke here—PostCard will revoke after load)
      setVideo(URL.createObjectURL(f));
    }
  }, []);

  const addPdfFile = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];
    if (f && f.type === "application/pdf") {
      setPdf(URL.createObjectURL(f));
    }
  }, []);

  const addModelFile = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const f = files[0];
    if (
      f &&
      (f.type.startsWith("model/") || /\.(glb|gltf|obj|stl|3mf)$/i.test(f.name))
    ) {
      setModel3d(URL.createObjectURL(f));
    }
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const urls: string[] = [];
    for (const it of items) {
      if (it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) urls.push(URL.createObjectURL(f));
      }
    }
    if (urls.length) {
      e.preventDefault();
      setImages((arr) => [...arr, ...urls]);
    }
  }, []);

  function removeImage(i: number) {
    setImages((arr) => {
      const next = [...arr];
      const [removed] = next.splice(i, 1);
      // safe to revoke when user removes BEFORE posting
      if (removed?.startsWith("blob:")) {
        try { URL.revokeObjectURL(removed); } catch {}
      }
      return next;
    });
  }

  function clearVideo() {
    setVideo((v) => {
      if (v?.startsWith("blob:")) {
        try { URL.revokeObjectURL(v); } catch {}
      }
      return null;
    });
    if (vidInput.current) vidInput.current.value = "";
  }

  function clearPdf() {
    setPdf((p) => {
      if (p?.startsWith("blob:")) {
        try { URL.revokeObjectURL(p); } catch {}
      }
      return null;
    });
    if (pdfInput.current) pdfInput.current.value = "";
  }

  function clearModel() {
    setModel3d((m) => {
      if (m?.startsWith("blob:")) {
        try { URL.revokeObjectURL(m); } catch {}
      }
      return null;
    });
    if (modelInput.current) modelInput.current.value = "";
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
      pdf: pdf || undefined,
      model3d: model3d || undefined,
      link: link || undefined,
    };

    addPost(newPost);

    // Reset UI (IMPORTANT: do NOT revoke blobs here; PostCard will revoke after load)
    setText("");
    setLink("");
    setImages([]);
    if (imgInput.current) imgInput.current.value = "";
    setVideo(null);
    if (vidInput.current) vidInput.current.value = "";
    setPdf(null);
    if (pdfInput.current) pdfInput.current.value = "";
    setModel3d(null);
    if (modelInput.current) modelInput.current.value = "";
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

      {(images.length > 0 || video || pdf || model3d) && (
        <div className="composer__attachments">
          {images.map((src, i) => (
            <div className="att" key={`img-${i}`}>
              <img src={src} alt="" />
              <button className="att__x" title="Remove" onClick={() => removeImage(i)}>
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
          {pdf && (
            <div className="att att--pdf">
              <iframe src={pdf} title="PDF preview" />
              <button className="att__x" title="Remove" onClick={clearPdf}>
                ×
              </button>
            </div>
          )}
          {model3d && (
            <div className="att att--model">
              <model-viewer src={model3d} camera-controls />
              <button className="att__x" title="Remove" onClick={clearModel}>
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

          <button
            className="composer__tool"
            type="button"
            title="Add a PDF"
            onClick={() => pdfInput.current?.click()}
          >
            📄
          </button>
          <input
            ref={pdfInput}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => addPdfFile(e.currentTarget.files)}
          />

          <button
            className="composer__tool"
            type="button"
            title="Add a 3D model"
            onClick={() => modelInput.current?.click()}
          >
            🧊
          </button>
          <input
            ref={modelInput}
            type="file"
            accept="model/*,.gltf,.glb,.obj,.stl,.3mf"
            hidden
            onChange={(e) => addModelFile(e.currentTarget.files)}
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
