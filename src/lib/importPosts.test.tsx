import React from "react";
import { describe, it, beforeEach, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useFeedStore } from "./feedStore";
import { importExternalPosts } from "./importPosts";
import Feed from "../components/feed/Feed";

describe("importExternalPosts", () => {
  beforeEach(() => {
    useFeedStore.getState().setPosts([]);
    vi.restoreAllMocks();
  });

  it("fetches posts and renders them in the feed", async () => {
    const mock = [
      { id: 1, title: "hello" },
      { id: 2, title: "world" },
    ];
    vi.spyOn(global, "fetch" as any).mockResolvedValue({
      json: async () => mock,
    } as any);

    await importExternalPosts("token");
    render(<Feed />);

    expect(await screen.findByText("hello")).not.toBeNull();
    expect(await screen.findByText("world")).not.toBeNull();
  });
});

