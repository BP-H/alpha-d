// src/components/feed/PostCard.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PostCard from "./PostCard";
import type { Post } from "../../types";

describe("PostCard image carousel", () => {
  const post: Post = {
    id: 1,
    author: "@user",
    images: ["/a.jpg", "/b.jpg", "/c.jpg"],
  };

  it("shows and navigates multiple images", () => {
    const { container } = render(<PostCard post={post} />);
    const media = container.querySelector(".pc-media") as HTMLElement;

    // initial image
    let imgs = Array.from(media.querySelectorAll(":scope > img")) as HTMLImageElement[];
    expect(imgs[0].style.display).toBe("block");
    expect(imgs[1].style.display).toBe("none");

    // navigate to next image
    fireEvent.click(media.querySelector(".pc-nav.next") as HTMLElement);

    imgs = Array.from(media.querySelectorAll(":scope > img")) as HTMLImageElement[];
    expect(imgs[1].style.display).toBe("block");
  });
});

