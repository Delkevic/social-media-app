"use client"

import * as React from "react"

const HoverButton = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const buttonRef = React.useRef(null)
    const [isListening, setIsListening] = React.useState(false)
    const [circles, setCircles] = React.useState([])
    const lastAddedRef = React.useRef(0)

    const createCircle = React.useCallback((x, y) => {
      const buttonWidth = buttonRef.current?.offsetWidth || 0
      const xPos = x / buttonWidth
      const color = `linear-gradient(to right, var(--circle-start) ${xPos * 100}%, var(--circle-end) ${
        xPos * 100
      }%)`

      setCircles((prev) => [
        ...prev,
        { id: Date.now(), x, y, color, fadeState: null },
      ])
    }, [])

    const handlePointerMove = React.useCallback(
      (event) => {
        if (!isListening) return
        
        const currentTime = Date.now()
        if (currentTime - lastAddedRef.current > 100) {
          lastAddedRef.current = currentTime
          const rect = event.currentTarget.getBoundingClientRect()
          const x = event.clientX - rect.left
          const y = event.clientY - rect.top
          createCircle(x, y)
        }
      },
      [isListening, createCircle]
    )

    const handlePointerEnter = React.useCallback(() => {
      setIsListening(true)
    }, [])

    const handlePointerLeave = React.useCallback(() => {
      setIsListening(false)
    }, [])

    React.useEffect(() => {
      circles.forEach((circle) => {
        if (!circle.fadeState) {
          setTimeout(() => {
            setCircles((prev) =>
              prev.map((c) =>
                c.id === circle.id ? { ...c, fadeState: "in" } : c
              )
            )
          }, 0)

          setTimeout(() => {
            setCircles((prev) =>
              prev.map((c) =>
                c.id === circle.id ? { ...c, fadeState: "out" } : c
              )
            )
          }, 1000)

          setTimeout(() => {
            setCircles((prev) => prev.filter((c) => c.id !== circle.id))
          }, 2200)
        }
      })
    }, [circles])

    const buttonClasses = [
      "relative isolate px-8 py-3 rounded-3xl",
      "text-white font-medium text-base leading-6",
      "backdrop-blur-lg bg-[rgba(43,55,80,0.1)]",
      "cursor-pointer overflow-hidden",
      "before:content-[''] before:absolute before:inset-0",
      "before:rounded-[inherit] before:pointer-events-none",
      "before:z-[1]",
      "before:shadow-[inset_0_0_0_1px_rgba(170,202,255,0.2),inset_0_0_16px_0_rgba(170,202,255,0.1),inset_0_-3px_12px_0_rgba(170,202,255,0.15),0_1px_3px_0_rgba(0,0,0,0.50),0_4px_12px_0_rgba(0,0,0,0.45)]",
      "before:mix-blend-multiply before:transition-transform before:duration-300",
      "active:before:scale-[0.975]",
      className || "",
    ].join(" ");

    return (
      <button
        ref={buttonRef}
        className={buttonClasses}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        {...props}
        style={{
          "--circle-start": "var(--tw-gradient-from, #a0d9f8)",
          "--circle-end": "var(--tw-gradient-to, #3a5bbf)",
        }}
      >
        {circles.map(({ id, x, y, color, fadeState }) => {
          const circleClasses = [
            "absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
            "blur-lg pointer-events-none z-[-1] transition-opacity duration-300",
            fadeState === "in" ? "opacity-75" : "",
            fadeState === "out" ? "opacity-0 duration-[1.2s]" : "",
            !fadeState ? "opacity-0" : "",
          ].join(" ");
          
          return (
            <div
              key={id}
              className={circleClasses}
              style={{
                left: x,
                top: y,
                background: color,
              }}
            />
          );
        })}
        {children}
      </button>
    )
  }
)

HoverButton.displayName = "HoverButton"

export { HoverButton }