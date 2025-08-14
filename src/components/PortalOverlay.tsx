// src/components/PortalOverlay.tsx
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type PortalHandle = {
  openAt: (x: number, y: number, to: string) => void;
};

const PortalOverlay = forwardRef<PortalHandle>(function PortalOverlay(_, ref) {
  const el = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useImperativeHandle(ref, () => ({
    openAt(x: number, y: number, to: string) {
      const node = el.current!;
      node.style.setProperty('--px', `${x}px`);
      node.style.setProperty('--py', `${y}px`);
      node.classList.add('on');
      window.setTimeout(() => {
        navigate(to);
        node.classList.remove('on');
      }, 650); // matches CSS timing
    },
  }));

  return <div ref={el} className="portal-overlay" />;
});

export function usePortal() {
  const ref = useRef<PortalHandle>(null);
  const open = (x: number, y: number, to: string) => ref.current?.openAt(x, y, to);
  return { ref, open };
}

export function useIsWorldRoute() {
  const { pathname } = useLocation();
  return pathname.startsWith('/world') || pathname.startsWith('/portal');
}

export default PortalOverlay;
