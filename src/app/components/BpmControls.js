"use client";

import React, { useState } from 'react';

const BpmControls = ({ bpm, setBpm }) => {
  const handleBpmChange = (e) => {
    let value = Number(e.target.value);
    if (value >= 20 && value <= 330) setBpm(value);
  };

  return (
    <div className="bpm-control">
      <button 
        className="nes-btn" 
        onClick={() => setBpm(Math.max(20, bpm - 1))}
      >
        -
      </button>
      <input
        type="number"
        value={bpm}
        onChange={handleBpmChange}
        className="bpm-input"
        style={{ width: '150px', textAlign: 'center' }}
      />
      <button 
        className="nes-btn" 
        onClick={() => setBpm(Math.min(330, bpm + 1))}
      >
        +
      </button>
    </div>
  );
};

export default BpmControls;