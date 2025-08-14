// src/lib/bus.ts
type Handler<T = any> = (payload: T) => void;

const map = new Map<string, Set<Handler>>();

export type Unsubscribe = () => void;

export function on<T = any>(name: string, fn: Handler<T>): Unsubscribe {
  let set = map.get(name);
  if (!set) {
    set = new Set();
    map.set(name, set);
  }
  set.add(fn as Handler);
  // IMPORTANT: return void, not boolean
  return () => {
    const s = map.get(name);
    if (s) s.delete(fn as Handler);
  };
}

export function emit<T = any>(name: string, payload: T): void {
  map.get(name)?.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      // swallow listener errors
    }
  });
}

export default { on, emit };
