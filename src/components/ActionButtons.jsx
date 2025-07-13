import React, { useState, useRef } from "react";
import { convertJsonToCsv, exportJsonToXlsx } from "../utils/exportHelpers";

const ActionButtons = ({
  onFormat,
  onViewer,
  onImport, // This is now for single file import
  onMerge, // New prop for merge functionality
  input,
  parsedJSON,
  outputMode,
  viewerFormat,
  isValidTableData,
  onExportTablePng
}) => {
  const [exportType, setExportType] = useState("formatted");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          JSON.parse(content); // Validate JSON
          onImport(content); // Pass content to App.js
        } catch (error) {
          alert(`Error parsing JSON from file: ${error.message}`);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = null; // Clear the input so same file can be re-uploaded
  };

  const handleMergeFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const fileReaders = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve({ name: file.name, content: event.target.result });
        };
        reader.onerror = (error) => {
          reject(`Failed to read file ${file.name}: ${error}`);
        };
        reader.readAsText(file);
      });
    });

    Promise.all(fileReaders)
      .then(onMerge) // Pass the array of {name, content} objects to onMerge
      .catch(error => {
        console.error("Error reading one or more files for merge:", error);
        alert(`Error reading files: ${error}`);
      });

    e.target.value = null; // Clear the input so same files can be selected again
  };

  const handleExportClick = () => {
    try {
      if (!input.trim() && !parsedJSON) { // Check both input and parsedJSON for content
        alert("Nothing to export. Please enter or import JSON first.");
        return;
      }

      let currentParsedData = null;
      try {
        // Attempt to parse input if it's not empty, for cases where 'input' holds the source
        currentParsedData = input.trim() ? JSON.parse(input) : null;
      } catch (e) {
        // If input is invalid JSON and export type is not 'raw', alert and offer raw export
        if (exportType !== 'raw') {
          alert(`Invalid JSON input. Cannot export as ${exportType}. Exporting as raw JSON instead.`);
          const blob = new Blob([input], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "raw_data.json";
          a.click();
          URL.revokeObjectURL(url);
          return;
        }
      }

      // Determine the data to be used for table/csv/excel exports
      // If outputMode is merge, use parsedJSON. Otherwise, use currentParsedData (from input).
      let dataForTableExport = outputMode === "merge" && parsedJSON ? JSON.parse(parsedJSON) : currentParsedData;


      switch (exportType) {
        case "raw":
          const rawBlob = new Blob([input], { type: "application/json" });
          const rawUrl = URL.createObjectURL(rawBlob);
          const rawA = document.createElement("a");
          rawA.href = rawUrl;
          rawA.download = "raw_data.json";
          rawA.click();
          URL.revokeObjectURL(rawUrl);
          break;

        case "formatted":
          // If outputMode is merge, use the merged parsedJSON. Otherwise, stringify the current parsed data (from input).
          const contentToExport = outputMode === "merge" && parsedJSON ? parsedJSON : (currentParsedData ? JSON.stringify(currentParsedData, null, 2) : input);
          const formattedBlob = new Blob([contentToExport], { type: "application/json" });
          const formattedUrl = URL.createObjectURL(formattedBlob);
          const formattedA = document.createElement("a");
          formattedA.href = formattedUrl;
          formattedA.download = "formatted_data.json";
          formattedA.click();
          URL.revokeObjectURL(formattedUrl);
          break;

        case "table": // This case is now triggered by the dropdown
          if (outputMode === "viewer" && viewerFormat === "table" && isValidTableData) {
            onExportTablePng();
          } else {
            alert("To export as PNG table, please ensure JSON is a valid array of objects and 'Viewer' mode with 'Table View' is active.");
          }
          break;

        case "csv":
          if (dataForTableExport && Array.isArray(dataForTableExport) && dataForTableExport.every(item => typeof item === 'object' && item !== null)) {
            const csvContent = convertJsonToCsv(dataForTableExport);
            const csvBlob = new Blob([csvContent], { type: "text/csv" });
            const csvUrl = URL.createObjectURL(csvBlob);
            const csvA = document.createElement("a");
            csvA.href = csvUrl;
            csvA.download = "data.csv";
            csvA.click();
            URL.revokeObjectURL(csvUrl);
          } else {
            alert("CSV export is only suitable for a JSON array of objects. Please provide suitable array data.");
          }
          break;

        case "excel":
          if (dataForTableExport && Array.isArray(dataForTableExport) && dataForTableExport.every(item => typeof item === 'object' && item !== null)) {
            exportJsonToXlsx(dataForTableExport, "data.xlsx");
          } else {
            alert("Excel export is only suitable for a JSON array of objects. Please provide suitable array data.");
          }
          break;

        default:
          alert("Unknown export type selected.");
          break;
      }

    } catch (e) {
      console.error("Export error:", e);
      alert("An unexpected error occurred during export.");
    }
  };


  return (
    <div className="action-buttons-container">
      {/* Format Button */}
      <button onClick={onFormat} className="format-button">
        <span className="shadow"></span>
        <span className="edge"></span>
        <span className="front text">Format</span>
      </button>

      {/* Viewer Button */}
      <button onClick={onViewer} className="viewer-button">
        <span className="shadow"></span>
        <span className="edge"></span>
        <span className="front text">Viewer</span>
      </button>

      {/* Import Button (using label for file input) */}
      <label htmlFor="upload-json" className="import-button">
        <span className="shadow"></span>
        <span className="edge"></span>
        <span className="front text">Import JSON</span>
      </label>
      <input
        type="file"
        id="upload-json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".json"
      />

      {/* Merge JSON Button (using label for file input) */}
      <label htmlFor="merge-json" className="merge-button">
        <span className="shadow"></span>
        <span className="edge"></span>
        <span className="front text">Merge JSON</span>
      </label>
      <input
        type="file"
        id="merge-json"
        onChange={handleMergeFiles}
        style={{ display: 'none' }}
        accept=".json"
        multiple
      />

      {/* Export Options Dropdown */}
      <select
        value={exportType}
        onChange={(e) => setExportType(e.target.value)}
      >
        <option value="formatted">Formatted JSON</option>
        <option value="raw">Raw Input</option>
        <option value="table">Table (PNG)</option>
        <option value="csv">CSV</option>
        <option value="excel">Excel (XLSX)</option>
      </select>

      <button
        className="export-button"
        onClick={handleExportClick}
      >
        <span className="shadow"></span>
        <span className="edge"></span>
        <span className="front text">Export</span>
      </button>
    </div>
  );
};

export default ActionButtons;