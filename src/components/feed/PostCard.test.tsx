import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PostCard from './PostCard';
import type { Post } from '../../types';

describe('PostCard media crossOrigin', () => {
  it('adds crossOrigin for remote images', () => {
    const post: Post = {
      id: 1,
      title: 'Remote Image',
      author: 'Alice',
      images: ['https://example.com/image.jpg'],
      authorAvatar: ''
    };
    render(<PostCard post={post} />);
    const img = screen.getByAltText('Remote Image') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://example.com/image.jpg');
    expect(img.getAttribute('crossorigin')).toBe('anonymous');
  });

  it('omits crossOrigin for blob images', () => {
    const post: Post = {
      id: 2,
      title: 'Blob Image',
      author: 'Bob',
      images: ['blob:http://localhost/image'],
      authorAvatar: ''
    };
    render(<PostCard post={post} />);
    const img = screen.getByAltText('Blob Image') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('blob:http://localhost/image');
    expect(img.getAttribute('crossorigin')).toBeNull();
  });
});
