import React from "react";
import MonacoEditor from "react-monaco-editor";

const JsonFormatter = ({ json, theme }) => { // Accept theme prop
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light'; // Determine Monaco theme

  return (
    <div className="panel">
      <h4>Formatted Output</h4>
      <MonacoEditor
        language="json"
        height="100%"
        value={json}
        options={{
          readOnly: true,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          padding: { top: 12 }
        }}
        theme={monacoTheme} // Use dynamic theme
      />
    </div>
  );
};

export default JsonFormatter;