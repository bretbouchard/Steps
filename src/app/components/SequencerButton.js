import React from 'react';
import '../css/SequencerButton.css';  // Ensure custom styles are applied

const SequencerButton = ({ active, onClick, isPlaying }) => {
  return (
    <button
      className={`nes-btn sequencer-btn ${active ? 'is-active' : 'is-normal'} ${isPlaying ? 'playing' : ''}`}
      onClick={onClick}
    >
      {active ? '●' : '○'}
    </button>
  );
};

export default SequencerButton;