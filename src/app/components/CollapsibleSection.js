"use client";

import React, { useState } from 'react';

const CollapsibleSection = ({ title, children, defaultCollapsed = true }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="collapsible-section">
      <div 
        className={`collapsible-header ${!isCollapsed ? 'expanded' : ''}`} 
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h3>{title}</h3>
        <span className="expand-icon">{isCollapsed ? '▶' : '▼'}</span>
      </div>
      
      <div className={`collapsible-content ${isCollapsed ? 'collapsed' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleSection;
