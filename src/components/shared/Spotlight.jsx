import React, { useRef, useState } from 'react';

/**
 * Spotlight Component
 * Adds a modern radial gradient glow that follows the mouse cursor.
 * 
 * @param {React.ReactNode} children - The content to be spotlighted
 * @param {string} className - Additional classes for the wrapper
 * @param {string} spotColor - Color of the spotlight (default: rgba(16, 185, 129, 0.15)) -> Emerald
 * @param {number} size - Size of the spotlight in pixels (default: 400)
 */
const Spotlight = ({
    children,
    className = "",
    spotColor = "rgba(16, 185, 129, 0.15)", // Default to Emerald glow
    size = 400
}) => {
    const divRef = useRef(null);
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e) => {
        if (!divRef.current) return;

        const rect = divRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        divRef.current.style.setProperty('--mouse-x', `${x}px`);
        divRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden ${className}`}
        >
            {/* The Spotlight Overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(${size}px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), ${spotColor}, transparent 40%)`
                }}
            />

            {/* Content */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default Spotlight;
