import { useEffect, useRef } from "react";
import type { HeadingItem } from "@/utils/markdown/types";
import { useActiveHeading } from "@/hooks/useActiveHeading";

interface Props {
  headings: Array<HeadingItem>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function TableOfContents({ headings, containerRef }: Props) {
  const activeId = useActiveHeading(headings);
  const activeRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (activeRef.current && containerRef?.current) {
      const container = containerRef.current;
      const active = activeRef.current;

      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      const relativeTop = activeRect.top - containerRect.top;
      const relativeBottom = activeRect.bottom - containerRect.top;

      if (relativeTop < 0) {
        container.scrollTop += relativeTop - 8;
      } else if (relativeBottom > container.clientHeight) {
        container.scrollTop += relativeBottom - container.clientHeight + 8;
      }
    }
  }, [activeId, containerRef]);

  if (headings.length === 0) return null;

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav className="toc-nav">
      <ul className="toc-list">
        {headings.map((heading) => (
          <li
            key={heading.id}
            className="toc-item"
            style={{ paddingLeft: `${(heading.level - minLevel) * 12}px` }}
            ref={activeId === heading.id ? activeRef : null}
          >
            <button
              onClick={() => handleClick(heading.id)}
              className={`toc-link ${activeId === heading.id ? "toc-active" : ""}`}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
