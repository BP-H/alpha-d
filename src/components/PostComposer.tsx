import React, { useState } from "react";
import "./PostComposer.css";
import { useFeedStore } from "../lib/feedStore";
import { isSuperUser } from "../lib/superUser";
import type { Post } from "../types";

export default function PostComposer() {
  const addPost = useFeedStore((s) => s.addPost);

  const [text, setText] = useState("");
  const [key, setKey] = useState("");

  async function handlePost() {
    if (!isSuperUser(key)) {
      alert("Invalid super user key");
      return;
    }
    if (!text.trim()) return;

    const newPost: Post = {
      id: String(Date.now()),
      author: "@super",
      title: text.trim(),
      time: "now",
      images: ["/vite.svg"],
    };

    addPost(newPost);
    setText("");
  }

  return (
    <section className="composer">
      <textarea
        className="composer__input"
        placeholder="Share something cosmic…"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="composer__row">
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
    </section>
  );
}
