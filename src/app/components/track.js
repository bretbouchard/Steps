"use client";

import React, { useState, useEffect } from "react";
import { Track as ReactronicaTrack, Instrument } from "reactronica";
import * as skins from "react-rotary-knob-skin-pack";
import { Knob } from "react-rotary-knob";
import SequencerSteps from "./SequencerSteps";
import SampleSelectionModal from "./SampleSelectionModal";  // Modal for selecting samples

const Track = ({ sectionName, sectionSamples, allSampleFiles, stepCount }) => {  // Add stepCount prop
  const [volume, setVolume] = useState(-6);
  const [pitch, setPitch] = useState(0);
  const [sample, setSample] = useState(sectionSamples[0]);  // Initialize with the first sample
  const [steps, setSteps] = useState(Array(stepCount).fill(false));  // Dynamically initialize based on stepCount
  const [currentStepIndex, setCurrentStepIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);  // Modal visibility state

  // Update steps array when stepCount changes
  useEffect(() => {
    setSteps((prevSteps) => {
      const newSteps = Array(stepCount).fill(false);
      // Preserve the previous steps state if it's smaller than the new step count
      for (let i = 0; i < Math.min(prevSteps.length, stepCount); i++) {
        newSteps[i] = prevSteps[i];
      }
      return newSteps;
    });
  }, [stepCount]);

  const toggleStep = (index) => {
    setSteps((prevSteps) =>
      prevSteps.map((step, i) => (i === index ? !step : step))
    );
  };

  const playSample = () => {
    const audio = new Audio(sample.path);
    audio.play();
  };

  return (
    <div className="trackWrapper nes-container with-title is-left">
      <p className="title">{sectionName}</p> {/* Display section name as the track title */}
      <div className="track">
        <div className="samples">
          {/* Display sample name from the JSON */}
          <button className="nes-btn sampleName" onClick={playSample}>
            {sample.name}
          </button>

          {/* Folder button to open the modal */}
          <button className="nes-btn is-icon" onClick={() => setIsModalOpen(true)}>
            <img
              src="/icons/folder_24dp_000000_FILL0_wght400_GRAD0_opsz24.png"
              alt="Folder icon"
              style={{ width: "24px", height: "24px" }}
            />
          </button>

          {/* Modal for selecting samples */}
          {isModalOpen && (
            <SampleSelectionModal
              sampleFiles={allSampleFiles}  // Pass all sections and their samples
              onClose={() => setIsModalOpen(false)}
              onAssign={(newSample) => {
                setSample(newSample);  // Update the sample with the selected one
                setIsModalOpen(false);  // Close the modal after selecting
              }}
            />
          )}
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
            />
          </div>
        </div>

        {/* SequencerSteps Component */}
        <SequencerSteps
          steps={steps}
          toggleStep={toggleStep}
          currentStepIndex={currentStepIndex}
        />

        {/* Reactronica Track */}
        <ReactronicaTrack
          steps={steps.map((active) => (active ? { name: "C3" } : null))}
          volume={volume}
          onStepPlay={(step, index) => setCurrentStepIndex(index)}
        >
          <Instrument type="sampler" samples={{ C3: sample.path }} />
        </ReactronicaTrack>
      </div>
    </div>
  );
};

export default Track;