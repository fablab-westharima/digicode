import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // 初期値は useState 初期化子で計算（mount 時の setState を回避）
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    // query が動的変化したときの同期: matchMedia は外部ストアなので effect 内 setState が必要
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// プリセットブレイクポイント
export function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isTabletLandscape = useMediaQuery('(min-width: 1024px) and (max-width: 1279px)');
  const isDesktop = useMediaQuery('(min-width: 1280px)');

  return {
    isMobile,
    isTablet,
    isTabletLandscape,
    isDesktop,
    // 便利なエイリアス
    isMobileOrTablet: isMobile || isTablet,
    isTabletOrLarger: !isMobile,
    isDesktopOrLarger: isDesktop || isTabletLandscape,
  };
}
