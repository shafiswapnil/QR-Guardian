import * as React from "react"

const MOBILE_BREAKPOINT = 768
const SMALL_BREAKPOINT = 640

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}

export function useResponsive() {
  const [breakpoint, setBreakpoint] = React.useState({
    isMobile: undefined,
    isSmall: undefined,
    isTablet: undefined,
    isDesktop: undefined
  })

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      setBreakpoint({
        isMobile: width < SMALL_BREAKPOINT,
        isSmall: width >= SMALL_BREAKPOINT && width < MOBILE_BREAKPOINT,
        isTablet: width >= MOBILE_BREAKPOINT && width < 1024,
        isDesktop: width >= 1024
      })
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", updateBreakpoint)
    updateBreakpoint()
    
    return () => mql.removeEventListener("change", updateBreakpoint)
  }, [])

  return breakpoint
}
