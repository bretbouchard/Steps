"use client";

import React from 'react';
import SequencerButton from './SequencerButton';

const SequencerSteps = ({ steps, currentStepIndex, toggleStep }) => {
  return (
    <div className="sequencer">
      {steps.map((step, index) => (
        <SequencerButton
          key={index}
          active={step}
          onClick={() => toggleStep(index)}
          isPlaying={currentStepIndex === index}
        />
      ))}
    </div>
  );
};

export default SequencerSteps;