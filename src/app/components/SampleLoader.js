import { useState, useEffect } from 'react';

const SampleLoader = () => {
  const [sampleFiles, setSampleFiles] = useState({});

  useEffect(() => {
    const loadSampleFiles = async () => {
      try {
        const response = await fetch('/samples/sampleFiles.json');
        const data = await response.json();
        setSampleFiles(data);
      } catch (error) {
        console.error('Error loading sample files:', error);
      }
    };

    loadSampleFiles();
  }, []);

  return (
    <div>
      {Object.keys(sampleFiles).length > 0 ? (
        <div>
          {Object.keys(sampleFiles).map((category) => (
            <div key={category}>
              <h3>{category}</h3>
              <ul>
                {sampleFiles[category].map((sample, index) => (
                  <li key={index}>
                    <audio controls src={sample}></audio>
                    {sample}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p>Loading samples...</p>
      )}
    </div>
  );
};

export default SampleLoader;