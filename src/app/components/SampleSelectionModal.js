"use client";

import React, { useState, useEffect } from "react";
import "../css/Modal.css";  // Import modal styles

const SampleSelectionModal = ({ sampleFiles, onClose, onAssign }) => {
  // Define the list of sections based on the sampleFiles keys
  const listSections = Object.keys(sampleFiles);

  const [currentSection, setCurrentSection] = useState(null);  // Track the current section (null shows sections)
  const [currentSample, setCurrentSample] = useState(null);    // Track the selected sample

  // Close the modal when "Esc" key is pressed
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Attach event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup the event listener on unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Handle sample click
  const handleSampleClick = (sample) => {
    setCurrentSample(sample);
    const audio = new Audio(sample.path);
    audio.play();  // Play the sample when clicked
  };

  // Reset to the section list when the modal opens
  useEffect(() => {
    setCurrentSection(null);  // Always start with section list
    setCurrentSample(null);   // Reset selected sample
  }, []);

  return (
    <div className="modal">
      <div className="modal-content">
        {/* Top Controls */}
        <div className="modal-header">
          {currentSection ? (
            <button onClick={() => setCurrentSection(null)} className="back-button">
              &lt; {/* Back button to go back to section list */}
            </button>
          ) : null}

          {currentSample && currentSection ? (
            <button
              onClick={() => {
                onAssign(currentSample);  // Assign selected sample
                onClose();  // Close modal after assigning
              }}
              className="assign-button"
            >
              Assign
            </button>
          ) : null}

          <button onClick={onClose} className="close-button">
            X {/* Close button */}
          </button>
        </div>

        {/* Display Section List or Samples */}
        <div className="modal-body">
          {!currentSection ? (
            // Display list of sections
            <div className="sample-types">
              <ul>
                {listSections.map((section) => (
                  <li key={section} onClick={() => setCurrentSection(section)}>
                    {section.charAt(0).toUpperCase() + section.slice(1)} {/* Capitalize section */}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            // Display samples in the selected section
            <div className="sample-list">
              <ul>
                {sampleFiles[currentSection].map((sample, index) => (
                  <li
                    key={`${currentSection}-${sample.name}-${index}`}
                    onClick={() => handleSampleClick(sample)}
                    className={sample === currentSample ? "highlighted" : ""}
                  >
                    {sample.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SampleSelectionModal;