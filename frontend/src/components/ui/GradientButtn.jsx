import React from "react";

const GradientButtn = React.forwardRef(
  ({ className, variant, children, asChild = false, ...props }, ref) => {
    // Bileşen türünü belirle
    const Comp = asChild ? props.as || "button" : "button";
    
    // Variant sınıfını belirle
    const variantClass = variant === "variant" ? "gradient-button-variant" : "";
    
    return (
      <Comp
        className={`gradient-button ${variantClass} ${className || ""}`}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

GradientButtn.displayName = "GradientButtn";

export { GradientButtn };