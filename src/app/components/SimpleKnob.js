"use client";

import React, { useState, useRef, useEffect } from 'react';

// A simple, secure knob component that doesn't rely on vulnerable packages
const SimpleKnob = ({ label, value, setValue, min, max, size = 80 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef(null);
  const startY = useRef(0);
  const startValue = useRef(0);

  // Convert the value to an angle for display
  const valueToAngle = (val) => {
    const ratio = (val - min) / (max - min);
    // Map from 0-1 to our angle range (135 deg rotation)
    return -135 + (ratio * 270);
  };

  // Handle mouse/touch events
  const handleDragStart = (e) => {
    setIsDragging(true);
    startY.current = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    startValue.current = value;
    
    // Capture events on document to handle drag outside the knob
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);
    
    // Prevent default to avoid text selection during drag
    e.preventDefault();
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const sensitivity = 1; // Adjust sensitivity as needed
    const deltaY = (startY.current - clientY) * sensitivity;
    const valueRange = max - min;
    const newValue = Math.min(Math.max(startValue.current + (deltaY / 100) * valueRange, min), max);
    
    setValue(newValue);
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  };

  // Clean up event listeners when component unmounts
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, []);

  // Calculate rotation angle based on value
  const angle = valueToAngle(value);

  return (
    <div className="knob-container" style={{ textAlign: 'center' }}>
      <label>{label}</label>
      <div
        ref={knobRef}
        className="simple-knob"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: '#333',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : 'grab',
          margin: '5px auto',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.2)'
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* Knob indicator */}
        <div
          className="knob-indicator"
          style={{
            position: 'absolute',
            width: '4px',
            height: '40%',
            background: 'white',
            left: '50%',
            bottom: '50%',
            transform: `translateX(-50%) rotate(${angle}deg)`,
            transformOrigin: 'bottom center',
            borderRadius: '2px'
          }}
        />
        <div
          className="knob-center"
          style={{
            position: 'absolute',
            width: '30%',
            height: '30%',
            background: '#222',
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
          }}
        />
      </div>
      <div className="knob-value" style={{ fontSize: '0.8rem' }}>
        {Math.round(value * 100) / 100}
      </div>
    </div>
  );
};

export default SimpleKnob;
