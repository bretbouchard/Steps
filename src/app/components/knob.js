import React from 'react';
import SimpleKnob from './SimpleKnob';

const Knob = ({ label, value, setValue, min, max }) => {
  const handleChange = (newValue) => {
    setValue(Math.min(Math.max(newValue, min), max)); // Clamp value within min and max
  };

  return (
    <div className="knob-container">
      <SimpleKnob
        label={label}
        min={min}
        max={max}
        value={value}
        setValue={handleChange}
        size={80}
      />
    </div>
  );
};

export default Knob;