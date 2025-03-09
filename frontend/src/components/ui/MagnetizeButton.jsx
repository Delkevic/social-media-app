"use client"

import React, { useState, useEffect, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import { Magnet } from "lucide-react";
import { Button } from "./button"; // Button bileşenini doğru yoldan import ediyoruz

// Sınıf adlarını birleştiren yardımcı fonksiyon
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

function MagnetizeButton(props) {
    // Props'tan değerleri al, varsayılanları ata
    const { 
        className, 
        particleCount = 12, 
        attractRadius = 50, 
        children, 
        ...otherProps 
    } = props;
    
    // Mıknatıs çekim durumunu tutan state
    const [isAttracting, setIsAttracting] = useState(false);
    
    // Parçacıkların konumlarını tutan state
    const [particles, setParticles] = useState([]);
    
    // Parçacıkların animasyonunu kontrol eden nesne
    const particlesControl = useAnimation();

    // Component mount olduğunda parçacıkları oluştur
    useEffect(() => {
        const newParticles = Array.from({ length: particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 360 - 180,
            y: Math.random() * 360 - 180,
        }));
        setParticles(newParticles);
    }, [particleCount]);

    // Fare veya dokunmatik olayı başladığında çağrılacak fonksiyon
    const handleInteractionStart = useCallback(async () => {
        setIsAttracting(true);
        await particlesControl.start({
            x: 0,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 50,
                damping: 10,
            },
        });
    }, [particlesControl]);

    // Fare veya dokunmatik olayı bittiğinde çağrılacak fonksiyon
    const handleInteractionEnd = useCallback(async () => {
        setIsAttracting(false);
        await particlesControl.start((i) => ({
            x: particles[i]?.x || 0,
            y: particles[i]?.y || 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 15,
            },
        }));
    }, [particlesControl, particles]);

    return (
        <Button
            className={cn(
                "min-w-40 relative touch-none",
                "backdrop-blur-sm",
                "transition-all duration-300",
                className
            )}
            style={{
                backgroundColor: "var(--background-glass)",
                border: "1px solid var(--border-color)",
                color: "var(--accent-blue)",
                boxShadow: "var(--shadow-sm)"
            }}
            onMouseEnter={handleInteractionStart}
            onMouseLeave={handleInteractionEnd}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            {...otherProps}
        >
            {particles.map((particle, index) => (
                <motion.div
                    key={index}
                    custom={index}
                    initial={{ x: particle.x, y: particle.y }}
                    animate={particlesControl}
                    style={{
                        backgroundColor: "var(--accent-blue)",
                        position: "absolute",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        opacity: isAttracting ? 1 : 0.4,
                        transition: "opacity 0.3s"
                    }}
                />
            ))}
            <span className="relative w-full flex items-center justify-center gap-2">
                {children || (
                    <>
                        <Magnet
                            style={{
                                width: "16px", 
                                height: "16px",
                                transform: isAttracting ? "scale(1.1)" : "scale(1)",
                                transition: "transform 0.3s"
                            }}
                        />
                        <span>{isAttracting ? "Attracting" : "Hover me"}</span>
                    </>
                )}
            </span>
        </Button>
    );
}

export { MagnetizeButton };