// src/components/JsonViewer.js
import React, { useState } from "react";
import ReactJson from "react-json-view";

const JsonViewer = ({ data, theme }) => { // Accept theme prop
  const [filter, setFilter] = useState("");

  const filterJSON = (obj) => {
    // ... (rest of the filterJSON function remains unchanged)
    if (!filter) return obj;
    const lowerFilter = filter.toLowerCase();

    const recursiveFilter = (currentData) => {
      if (Array.isArray(currentData)) {
        return currentData
          .map(recursiveFilter)
          .filter((item) => {
            if (typeof item !== "object" || item === null) {
              return String(item).toLowerCase().includes(lowerFilter);
            }
            return Object.keys(item).length > 0;
          });
      } else if (typeof currentData === "object" && currentData !== null) {
        let filtered = {};
        for (let key in currentData) {
          if (Object.prototype.hasOwnProperty.call(currentData, key)) {
            const val = currentData[key];
            if (
              key.toLowerCase().includes(lowerFilter) ||
              (typeof val !== "object" &&
                String(val).toLowerCase().includes(lowerFilter))
            ) {
              filtered[key] = val;
            } else if (typeof val === "object") {
              const nested = recursiveFilter(val);
              if (
                (Array.isArray(nested) && nested.length > 0) ||
                Object.keys(nested).length > 0
              ) {
                filtered[key] = nested;
              }
            }
          }
        }
        return filtered;
      }
      return currentData;
    };

    return recursiveFilter(obj);
  };

  // Map app theme to ReactJson theme
  // ReactJson has themes like "monokai", "solarized", "shapeshifter", "google", "pop", etc.
  // We'll choose appropriate ones for dark and light.
  const reactJsonTheme = theme === 'dark' ? 'monokai' : 'rjv-default'; // 'rjv-default' is a good light theme

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <h4 style={{ marginBottom: "8px", fontWeight: "600" }}>Viewer</h4>
      <input
        type="text"
        placeholder="Search keys or values..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="json-viewer-search-input" // Add class for CSS variables
      />
      <div
        className="json-viewer-content" // Add class for CSS variables
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight: "calc(100vh - 280px)", // adjust based on your layout
          overflowY: "auto",
          // Background and border now handled by .json-viewer-content CSS class
          padding: "16px",
          marginBottom: "32px",
          marginTop: "8px",
        }}
      >
        <ReactJson
          src={filterJSON(data)}
          name={false}
          collapsed={1}
          enableClipboard
          displayDataTypes={false}
          displayObjectSize={false}
          iconStyle="square"
          theme={reactJsonTheme} // Use dynamic theme
          style={{
            backgroundColor: "transparent", // Let parent div handle background
            fontSize: "14px",
            fontFamily: "monospace",
            wordBreak: "break-word",
          }}
        />
      </div>

    </div>
  );
};

export default JsonViewer;