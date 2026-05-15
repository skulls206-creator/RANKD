import { useRef, useEffect, useCallback } from "react";

export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ down: false, startX: 0, scrollLeft: 0 });
  const draggedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onDown(e: MouseEvent) {
      pos.current = { down: true, startX: e.clientX, scrollLeft: el!.scrollLeft };
      el!.style.cursor = "grabbing";
      el!.style.userSelect = "none";
    }
    function onMove(e: MouseEvent) {
      if (!pos.current.down) return;
      const dx = e.clientX - pos.current.startX;
      if (Math.abs(dx) > 4) draggedRef.current = true;
      el!.scrollLeft = pos.current.scrollLeft - dx;
    }
    function onUp() {
      pos.current.down = false;
      el!.style.cursor = "";
      el!.style.userSelect = "";
    }

    el.addEventListener("mousedown", onDown);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseup", onUp);
    el.addEventListener("mouseleave", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("mouseleave", onUp);
    };
  }, []);

  const wasDrag = useCallback(() => {
    const v = draggedRef.current;
    draggedRef.current = false;
    return v;
  }, []);

  return { ref, wasDrag };
}
