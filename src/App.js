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

      {/* NEW THEME SWITCH BUTTON */}
      <label className="theme-switch" style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
        }}>
        <input
          type="checkbox"
          className="theme-switch__checkbox"
          checked={theme === 'light'} // Checked if theme is 'light'
          onChange={toggleTheme}
        />
        <div className="theme-switch__container">
          <div className="theme-switch__clouds"></div>
          <div className="theme-switch__stars-container">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z" />
            </svg>
          </div>
          <div className="theme-switch__circle-container">
            <div className="theme-switch__sun-moon-container">
              <div className="theme-switch__moon">
                <div className="theme-switch__spot"></div>
                <div className="theme-switch__spot"></div>
                <div className="theme-switch__spot"></div>
              </div>
            </div>
          </div>
        </div>
      </label>

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
                    processedTableData.rows.length > 1000 ? ( // Arbitrary limit, adjust as needed
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
                        <p>This dataset contains {processedTableData.rows.length} rows. Displaying it as a table might cause performance issues.</p>
                        <p>Consider exporting to CSV/Excel or using the Tree View for large datasets.</p>
                      </div>
                    ) : (
                      <JsonTable
                        headers={processedTableData.headers}
                        rows={processedTableData.rows}
                        theme={theme}
                        tableRef={jsonTableRef}
                      />
                    )
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