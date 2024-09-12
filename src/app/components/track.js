"use client";

import React, { useState, useEffect } from 'react';
import { Track as ReactronicaTrack, Instrument } from 'reactronica';
import { Knob } from 'react-rotary-knob';
import * as skins from 'react-rotary-knob-skin-pack';
import SequencerButton from './SequencerButton';

const Track = ({ name, initialSample }) => {
  const [volume, setVolume] = useState(-6);  // Volume in dB
  const [pitch, setPitch] = useState(0);     // Pitch (not implemented yet)
  const [sample, setSample] = useState(initialSample);  // Track sample path
  const [steps, setSteps] = useState(Array(16).fill(false));  // Sequencer steps (16-step)
  const [isActive, setIsActive] = useState(false);  // Track if folder icon is open
  const [currentStepIndex, setCurrentStepIndex] = useState(null);  // Track the current playing step

  // Play the sample when the button is clicked (client-side only)
  const playSample = () => {
    const audio = new Audio(sample);  // Create an audio element with the sample
    audio.play();  // Play the sample
  };

  // Handle playing the sample only on the client
  useEffect(() => {
    return () => {
      // Optionally, clean up the audio element or effects
    };
  }, [sample]);

  // Toggle sequencer steps
  const toggleStep = (index) => {
    setSteps((prevSteps) => {
      const updatedSteps = [...prevSteps];
      updatedSteps[index] = !updatedSteps[index];
      return updatedSteps;
    });
  };

  // Simulate changing the sample
  const changeSample = () => {
    const newSample = window.prompt('Enter new sample path:', sample);
    if (newSample) setSample(newSample);
  };

  // Toggle the folder icon and change the sample
  const toggleFolder = () => {
    setIsActive(!isActive);
    changeSample();
  };

  // Utility function to format sample names
  const formatSampleName = (samplePath) => {
    const fileName = samplePath.split('/').pop().replace('.wav', '');  // Get the file name without extension
    const parts = fileName.split('-');
    const namePart = parts.slice(0, -1).join(' ');
    const numberPart = parseInt(parts.slice(-1)[0], 10);
    return `${namePart} ${numberPart}`;
  };

  return (
    <div className="trackWrapper nes-container with-title is-left">
      <p className="title ">{name}</p>
      <div className="track">
        <div className="samples">
          {/* Display formatted sample name and allow playback */}
          <button className="nes-btn sampleName" onClick={playSample}>
            {formatSampleName(sample)} 
          </button>

          {/* Folder button to change the sample */}
          <button className="nes-btn is-icon" onClick={toggleFolder}>
            <img
              src={
                isActive
                  ? "/icons/folder_open_24dp_000000_FILL0_wght400_GRAD0_opsz24.png"
                  : "/icons/folder_24dp_000000_FILL0_wght400_GRAD0_opsz24.png"
              }
              alt="Folder icon"
              style={{ width: '24px', height: '24px' }}
            />
          </button>
        </div>

        {/* Rotary Knobs for Volume and Pitch */}
        <div className="knobs">
          <div className="knob-wrapper">
            <label>V</label>
            <Knob
              min={-30}
              max={0}
              value={volume}
              onChange={setVolume}
              skin={skins.s16}
              unlockDistance={100}
              style={{ width: '40px', height: '40px' }}
            />
          </div>

          <div className="knob-wrapper">
            <label>P</label>
            <Knob
              min={-12}
              max={12}
              value={pitch}
              onChange={setPitch}
              skin={skins.s16}
              unlockDistance={100}
              style={{ width: '40px', height: '40px' }}
            />
          </div>
        </div>

        {/* 16-step sequencer buttons */}
<div className="sequencer">
  {steps.map((step, index) => (
    <SequencerButton
      key={index}
      active={step}            // Indicates if the step is active in the sequence
      onClick={() => toggleStep(index)}  // Toggles the step on click
      isPlaying={currentStepIndex === index}  // Highlights the currently playing step
    />
  ))}
</div>

        {/* Reactronica Track for step sequencing */}
        <ReactronicaTrack
          steps={steps.map((active) => (active ? { name: 'C3' } : null))}  // Pass steps to Reactronica
          volume={volume}
          onStepPlay={(step, index) => setCurrentStepIndex(index)}  // Track the current step being played
        >
          <Instrument type="sampler" samples={{ C3: sample }} />
        </ReactronicaTrack>
      </div>
    </div>
  );
};

export default Track;