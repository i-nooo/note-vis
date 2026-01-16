import { useEffect, useMemo, useState } from "react";
import { useStore } from "@tanstack/react-store";
import type { FootnotePosition } from "@/utils/footnotes";
import { store, toggleFootnoteVisibility } from "@/store";
import {
  collectFootnotePositions,
  parseFootnoteContent,
} from "@/utils/footnotes";

export function useFootnotes(footnotes: string) {
  const [positionedFootnotes, setPositionedFootnotes] = useState<
    Array<FootnotePosition>
  >([]);
  const [hoveredFootnote, setHoveredFootnote] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  const isVisible = useStore(store, (state) => state.footnoteVisible);

  // 호버된 각주의 내용 찾기
  const hoveredFootnoteContent = useMemo(() => {
    return parseFootnoteContent(hoveredFootnote, footnotes);
  }, [hoveredFootnote, footnotes]);

  // 전역 마우스 이벤트로 모든 기능 처리
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      // 각주가 보이는 상태일 때는 호버 이벤트 무시
      if (isVisible) return;

      const target = e.target as Element;
      const sup = target.closest("sup");

      if (sup && sup.querySelector('a[href^="#footnote-"]')) {
        const link = sup.querySelector(
          'a[href^="#footnote-"]',
        ) as HTMLAnchorElement;
        const footnoteId = link.getAttribute("href")?.replace("#footnote-", "");

        if (footnoteId && footnoteId !== hoveredFootnote) {
          console.log("Mouse over footnote:", footnoteId);
          const rect = sup.getBoundingClientRect();
          setTooltipPosition({
            x: rect.right + 10,
            y: rect.top,
          });
          setHoveredFootnote(footnoteId);
        }
      } else if (hoveredFootnote) {
        console.log("Mouse left footnote area");
        setHoveredFootnote(null);
        setTooltipPosition({ x: 0, y: 0 });
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const sup = target.closest("sup");

      if (sup && sup.querySelector('a[href^="#footnote-"]')) {
        console.log("Footnote click prevented");
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (hoveredFootnote) {
        console.log("Click - hiding tooltip");
        setHoveredFootnote(null);
        setTooltipPosition({ x: 0, y: 0 });
      }
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("click", handleClick, true);
    };
  }, [hoveredFootnote, isVisible]);

  // 위치 정보 수집
  useEffect(() => {
    if (!footnotes) return;

    const updatePositions = () => {
      const positions = collectFootnotePositions(footnotes);
      setPositionedFootnotes(positions);
    };

    setTimeout(updatePositions, 500);
  }, [footnotes]);

  return {
    isVisible,
    positionedFootnotes,
    hoveredFootnote,
    hoveredFootnoteContent,
    tooltipPosition,
    toggleVisibility: toggleFootnoteVisibility,
  };
}
