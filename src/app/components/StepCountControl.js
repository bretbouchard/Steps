"use client";

import React from "react";

const StepCountControl = ({ stepCount, setStepCount }) => {
  const handleStepChange = (event) => {
    setStepCount(Number(event.target.value));  // Update the step count with the selected value
  };

  return (
    <div className="step-control nes-select">
      <label htmlFor="step-count">Steps:</label>
      <select id="step-count" value={stepCount} onChange={handleStepChange}>
        <option value={8}>8</option>
        <option value={16}>16</option>
        <option value={32}>32</option>
        <option value={64}>64</option>
      </select>
    </div>
  );
};

export default StepCountControl;



