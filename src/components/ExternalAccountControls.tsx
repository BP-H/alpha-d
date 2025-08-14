import React from "react";
import { useAuthStore } from "../lib/auth";
import { importExternalPosts } from "../lib/importPosts";

/**
 * Buttons for linking/unlinking an external account and importing posts.
 * Styling roughly matches the existing topbar buttons.
 */
export default function ExternalAccountControls() {
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  if (!token) {
    return (
      <button
        onClick={async () => {
          await login();
          const t = useAuthStore.getState().token;
          if (t) await importExternalPosts(t);
        }}
        style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)" }}
        title="Link external account"
        aria-label="Link external account"
      >
        ⧉
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={() => importExternalPosts(token)}
        style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)" }}
        title="Import posts"
        aria-label="Import posts"
      >
        ↻
      </button>
      <button
        onClick={logout}
        style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)" }}
        title="Unlink external account"
        aria-label="Unlink external account"
      >
        ⨯
      </button>
    </div>
  );
}

