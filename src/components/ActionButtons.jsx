import React, { useState } from "react";
import { convertJsonToCsv, exportJsonToXlsx } from "../utils/exportHelpers";

const buttonStyle = {
  padding: "10px 20px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#555",
  color: "white",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 500,
  transition: "all 0.3s ease",
  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
};

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

  const handleExportClick = () => {
    try {
      if (!input.trim() && !parsedJSON) { // Check both input and parsedJSON for content
        alert("Nothing to export. Please enter or import JSON first.");
        return;
      }

      let currentParsedData = null;
      try {
        currentParsedData = JSON.parse(input);
      } catch (e) {
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

      let dataForTableExport = null;
      if (outputMode === "merge" && parsedJSON) {
        try {
          dataForTableExport = JSON.parse(parsedJSON);
        } catch (e) {
          console.error("Error parsing merged JSON for table export:", e);
          if (exportType === "csv" || exportType === "excel") {
            alert("Merged JSON is not a valid structure for CSV/Excel export.");
            return;
          }
        }
      } else {
        dataForTableExport = currentParsedData;
      }


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
          const contentToExport = outputMode === "merge" ? parsedJSON : (currentParsedData ? JSON.stringify(currentParsedData, null, 2) : input);
          const formattedBlob = new Blob([contentToExport], { type: "application/json" });
          const formattedUrl = URL.createObjectURL(formattedBlob);
          const formattedA = document.createElement("a");
          formattedA.href = formattedUrl;
          formattedA.download = "formatted_data.json";
          formattedA.click();
          URL.revokeObjectURL(formattedUrl);
          break;

        case "table":
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


  return (
    <div className="action-buttons-container" style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
      <button onClick={onFormat} style={{ ...buttonStyle, backgroundColor: "#1f6feb" }}>
        Format
      </button>

      <button onClick={onViewer} style={{ ...buttonStyle, backgroundColor: "#238636" }}>
        Viewer
      </button>

      <input
        type="file"
        accept=".json"
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const content = e.target.result;
              onImport(content); // Call onImport with content
            } catch (err) {
              alert("Error reading file: " + err.message);
            }
          };
          reader.readAsText(file);
          e.target.value = null;
        }}
        style={{ display: "none" }}
        id="upload-json"
      />
      <label htmlFor="upload-json" style={{ ...buttonStyle, backgroundColor: "#9A6700" }}>
        Import
      </label>

      {/* Merge Button and File Input */}
      <input
        type="file"
        accept=".json"
        multiple // Allows multiple file selection
        onChange={handleMergeFiles}
        style={{ display: "none" }}
        id="merge-json"
      />
      <label htmlFor="merge-json" style={{ ...buttonStyle, backgroundColor: "#e36209" }}>
        Merge JSONs
      </label>

      {/* Export Options Dropdown */}
      <select
        value={exportType}
        onChange={(e) => setExportType(e.target.value)}
        style={{
          ...buttonStyle,
          padding: "10px 15px",
          backgroundColor: "var(--select-bg-color)",
          color: "var(--text-color)",
          border: "1px solid var(--select-border-color)",
          width: "150px",
          cursor: "pointer",
        }}
      >
        <option value="formatted">Formatted JSON</option>
        <option value="raw">Raw Input</option>
        {/* <option value="table">Table (PNG)</option> */}
        <option value="csv">CSV</option>
        <option value="excel">Excel (XLSX)</option>
      </select>

      <button
        style={{ ...buttonStyle, backgroundColor: "#8250DF" }}
        onClick={handleExportClick}
      >
        Export
      </button>
    </div>
  );
};

export default ActionButtons;