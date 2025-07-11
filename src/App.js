import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import JsonInputEditor from "./components/JsonInputEditor";
import JsonViewer from "./components/JsonViewer";
import JsonFormatter from "./components/JsonFormatter";
import JsonTable from "./components/JsonTable";
import ActionButtons from "./components/ActionButtons";
import "./App.css";
import * as htmlToImage from 'html-to-image';

const App = () => {
  const [input, setInput] = useState('{ "info": {}, "item": [] }');
  const [parsedJSON, setParsedJSON] = useState(null);
  const [formatError, setFormatError] = useState("");
  const [errorLine, setErrorLine] = useState(null);
  const [viewerFormat, setViewerFormat] = useState("tree"); // "tree" | "table"
  const [outputMode, setOutputMode] = useState(null); // "format" | "viewer" | "merge"

  const [theme, setTheme] = useState('dark');
  const [mergeErrors, setMergeErrors] = useState([]); // State for merge errors
  // NEW STATE: To store info about imported files
  const [importedFilesInfo, setImportedFilesInfo] = useState([]); // [{ name: "file1.json", content: "{...}" }]

  const jsonTableRef = useRef(null); // Ref for the JsonTable component's <table> element

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    document.body.className = `${theme}-theme`;
  }, [theme]);

  const getLineNumberFromErrorPosition = (inputText, errorMessage) => {
    const match = errorMessage.match(/position (\d+)/);
    if (!match) return null;
    const pos = parseInt(match[1], 10);
    const textUpToError = inputText.substring(0, pos);
    const lineNumber = textUpToError.split("\n").length;
    return lineNumber;
  };

  const handleFormatClick = () => {
    setMergeErrors([]); // Clear merge errors when switching to format mode
    setImportedFilesInfo([]); // Clear imported files info
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      setParsedJSON(formatted);
      setFormatError("");
      setErrorLine(null);
      setOutputMode("format");
    } catch (err) {
      const line = getLineNumberFromErrorPosition(input, err.message);
      setParsedJSON(null);
      setFormatError(err.message + (line ? ` (at line ${line})` : ""));
      setErrorLine(line || null);
      setOutputMode("format");
    }
  };

  const handleViewerClick = () => {
    setMergeErrors([]); // Clear merge errors when switching to viewer mode
    setImportedFilesInfo([]); // Clear imported files info
    try {
      const parsed = JSON.parse(input);
      setParsedJSON(parsed);
      setFormatError("");
      setErrorLine(null);
      setOutputMode("viewer");
    } catch (err) {
      const line = getLineNumberFromErrorPosition(input, err.message);
      setParsedJSON(null);
      setFormatError(err.message + (line ? ` (at line ${line})` : ""));
      setErrorLine(line || null);
      setOutputMode("viewer");
    }
  };

  // Modified merge function to accept filesContent for App.js to set input field
  const handleMergeClick = useCallback((filesContent) => {
    setFormatError(""); // Clear format errors when merging
    setErrorLine(null);
    setImportedFilesInfo(filesContent); // Set the info about merged files
    const newMergeErrors = [];
    let mergedResult = {};
    let isArrayMerge = true;

    if (!filesContent || filesContent.length === 0) {
      setParsedJSON(null);
      setOutputMode("merge");
      setMergeErrors(["No files provided for merging."]);
      return;
    }

    // Attempt to merge the files
    filesContent.forEach((fileData, index) => {
      try {
        const parsedFile = JSON.parse(fileData.content);
        if (index === 0) {
          isArrayMerge = Array.isArray(parsedFile);
          mergedResult = parsedFile;
        } else {
          if (Array.isArray(parsedFile) && isArrayMerge) {
            mergedResult = [...(Array.isArray(mergedResult) ? mergedResult : []), ...parsedFile];
          } else if (typeof parsedFile === 'object' && parsedFile !== null && !Array.isArray(parsedFile) && !isArrayMerge) {
            // Simple shallow merge for objects. For deep merge, consider a library like `lodash.merge`
            mergedResult = { ...mergedResult, ...parsedFile };
          } else {
            newMergeErrors.push(`Merge conflict: File ${fileData.name} has a different root type (${Array.isArray(parsedFile) ? 'array' : typeof parsedFile}) than previous files. This file was skipped.`);
          }
        }
      } catch (err) {
        newMergeErrors.push(`Error parsing JSON from file '${fileData.name}': ${err.message}`);
      }
    });

    if (newMergeErrors.length > 0) {
      setParsedJSON(null);
      setMergeErrors(newMergeErrors);
      setOutputMode("merge");
      // Set input to empty string or a placeholder if merge failed
      setInput(JSON.stringify(filesContent.map(f => ({ name: f.name, status: "Error or Skipped" })), null, 2));
    } else {
      const mergedJsonString = JSON.stringify(mergedResult, null, 2);
      setInput(mergedJsonString); // Set the input editor to the merged result
      setParsedJSON(mergedJsonString); // Set parsedJSON for output display
      setMergeErrors([]);
      setOutputMode("merge");
    }
  }, []);


  // Memoized logic for table data processing
  const processedTableData = useMemo(() => {
    // Only process if parsedJSON is available and is the result of a viewer action
    if (!parsedJSON || outputMode !== "viewer" || !Array.isArray(parsedJSON)) {
      return { headers: [], rows: [], isValidTableData: false };
    }

    const allKeys = [];
    const rows = [];
    let hasObjectItems = false;

    // Ensure parsedJSON is actually an array when processing for table
    const dataToProcess = typeof parsedJSON === 'string' ? JSON.parse(parsedJSON) : parsedJSON;
    if (!Array.isArray(dataToProcess)) {
      return { headers: [], rows: [], isValidTableData: false };
    }

    dataToProcess.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        hasObjectItems = true;
        Object.keys(item).forEach(key => {
          if (!allKeys.includes(key)) {
            allKeys.push(key);
          }
        });
      }
    });

    if (!hasObjectItems) {
      return { headers: [], rows: [], isValidTableData: false };
    }

    allKeys.sort();

    dataToProcess.forEach(item => {
      const row = allKeys.map(key => {
        if (typeof item === 'object' && item !== null && item[key] !== undefined) {
          const value = item[key];
          return typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : String(value);
        }
        return '';
      });
      rows.push(row);
    });

    return {
      headers: allKeys,
      rows: rows,
      isValidTableData: hasObjectItems && allKeys.length > 0
    };
  }, [parsedJSON, outputMode]);

  // Function to export the table as PNG (now passed to ActionButtons)
  const handleExportTablePng = async () => {
    if (jsonTableRef.current) {
      try {
        const dataUrl = await htmlToImage.toPng(jsonTableRef.current, {
          backgroundColor: theme === 'dark' ? '#252538' : '#ffffff',
          quality: 0.95,
        });
        const link = document.createElement('a');
        link.download = 'json-table.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error exporting table as PNG:', error);
        alert('Failed to export table as PNG. Please try again.');
      }
    } else {
      alert('Table element not found for PNG export.');
    }
  };


  return (
    <div className="app-container">
      <h2 className="title">🧩JSort</h2>
      <h4 className="subtitle"> Where chaos meets clarity in your JSON</h4>

      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          padding: '10px 15px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: 'var(--button-bg-color)',
          color: 'var(--button-text-color)',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        {theme === 'dark' ? '☀️ Light Theme' : '🌙 Dark Theme'}
      </button>

      <ActionButtons
        onFormat={handleFormatClick}
        onViewer={handleViewerClick}
        // Modified onImport to handle a single file's content and update its info
        onImport={(fileContent) => {
          setInput(fileContent);
          setImportedFilesInfo([{ name: "imported_file.json", content: fileContent }]);
          setFormatError("");
          setErrorLine(null);
          setParsedJSON(null);
          setOutputMode(null);
          setMergeErrors([]);
        }}
        // Modified onMerge to pass file objects, which handleMergeClick uses to set the input field
        onMerge={(files) => {
          handleMergeClick(files);
        }}
        input={input}
        parsedJSON={parsedJSON}
        outputMode={outputMode}
        viewerFormat={viewerFormat}
        isValidTableData={processedTableData.isValidTableData}
        onExportTablePng={handleExportTablePng}
      />

      <div className="editor-container">
        {/* Pass importedFilesInfo to JsonInputEditor */}
        <JsonInputEditor
          value={input}
          errorLine={errorLine}
          onChange={(newText) => {
            setInput(newText);
            if (newText.trim() === "") {
              setParsedJSON(null);
              setFormatError("");
              setErrorLine(null);
              setOutputMode(null);
              setMergeErrors([]);
              setImportedFilesInfo([]); // Clear on manual clear
            }
          }}
          theme={theme}
          importedFilesInfo={importedFilesInfo} // Pass file info here
          outputMode={outputMode} // Pass output mode to editor for conditional display
        />

        <div className="output-panel">
          {(formatError || mergeErrors.length > 0) && (
            <div style={{ color: "var(--error-text-color)", padding: "15px", backgroundColor: "var(--error-bg-color)", borderRadius: "8px", border: "1px solid var(--error-border-color)" }}>
              {formatError && (
                <>
                  <h4>Error Parsing JSON:</h4>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{`❌ ${formatError}`}</pre>
                </>
              )}
              {mergeErrors.length > 0 && (
                <>
                  <h4>Merge Errors:</h4>
                  {mergeErrors.map((err, index) => (
                    <pre key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{`❌ ${err}`}</pre>
                  ))}
                </>
              )}
            </div>
          )}

          {!formatError && mergeErrors.length === 0 && outputMode === null && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-color)',
                backgroundColor: 'var(--panel-bg-color)',
                borderRadius: '10px',
                border: '1px dashed var(--border-color)',
                fontSize: '1.2em',
                fontWeight: '500',
                opacity: '0.7',
                transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease'
              }}
            >
              Enter JSON in the input panel or import a file, then click "Format", "Viewer", or "Merge".
            </div>
          )}

          {!formatError && mergeErrors.length === 0 && (outputMode === "format" || outputMode === "merge") && parsedJSON && (
            <div className="scrollable-content">
              <JsonFormatter
                json={typeof parsedJSON === "string" ? parsedJSON : JSON.stringify(parsedJSON, null, 2)}
                theme={theme}
              />
            </div>
          )}

          {!formatError && mergeErrors.length === 0 && outputMode === "viewer" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "15px" }}>
                <label style={{ marginRight: "8px" }}>Viewer Mode:</label>
                <select
                  value={viewerFormat}
                  onChange={(e) => setViewerFormat(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "14px",
                    backgroundColor: 'var(--input-bg-color)',
                    color: 'var(--text-color)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <option value="tree">🌳 Tree View</option>
                  <option value="table">📋 Table View</option>
                </select>
              </div>

              {viewerFormat === "tree" && parsedJSON && (
                <div className="scrollable-content">
                  <JsonViewer
                    data={parsedJSON}
                    theme={theme}
                  />
                </div>
              )}

              {viewerFormat === "table" && (
                <div className="scrollable-content">
                  {processedTableData.isValidTableData ? (
                    <JsonTable
                      headers={processedTableData.headers}
                      rows={processedTableData.rows}
                      theme={theme}
                      tableRef={jsonTableRef}
                    />
                  ) : (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "var(--warning-text-color)",
                        backgroundColor: "var(--warning-bg-color)",
                        borderRadius: "8px",
                        border: "1px solid var(--warning-border-color)",
                        marginTop: "20px"
                      }}
                    >
                      Table view requires a **JSON array of objects** at the root level.
                      Please switch to Tree View or provide suitable array data.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;