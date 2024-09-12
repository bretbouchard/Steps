"use client";

import React from 'react';

const PlaybackControls = ({ isPlaying, setIsPlaying }) => {
  return (
    <div className="playback-controls">
      <button className="nes-btn" onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
};

export default PlaybackControls;