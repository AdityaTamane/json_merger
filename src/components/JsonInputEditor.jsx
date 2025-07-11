import React, { useRef, useEffect } from "react";
import MonacoEditor from "react-monaco-editor";

const JsonInputEditor = ({ value, onChange, errorLine, theme, importedFilesInfo, outputMode }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationIdsRef = useRef([]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidFocusEditorWidget(() => {
      editor.updateOptions({
        lineDecorationsWidth: 4,
        overviewRulerBorder: false,
      });
    });
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    decorationIdsRef.current = editorRef.current.deltaDecorations(
      decorationIdsRef.current,
      []
    );

    if (errorLine) {
      decorationIdsRef.current = editorRef.current.deltaDecorations(
        [],
        [
          {
            range: new monacoRef.current.Range(errorLine, 1, errorLine, 1),
            options: {
              isWholeLine: true,
              className: "error-line-highlight",
            },
          },
        ]
      );

      editorRef.current.revealLineInCenter(errorLine);
      editorRef.current.setPosition({ lineNumber: errorLine, column: 1 });
      editorRef.current.focus();
    }
  }, [errorLine]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      editorRef.current?.layout();
    });

    if (editorRef.current && editorRef.current.getContainerDomNode().parentElement) {
      resizeObserver.observe(editorRef.current.getContainerDomNode().parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [importedFilesInfo, outputMode]);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs-light';

  return (
    <div className="panel">
      <h4>
        {outputMode === "merge" && importedFilesInfo.length > 0 ? "Merged Input Files" : "Input JSON"}
      </h4>

      {/* MODIFIED: Only display file names, remove content snippet */}
      {outputMode === "merge" && importedFilesInfo.length > 0 && (
        <div style={{
          maxHeight: '100px', // Adjusted max-height as content will be less
          overflowY: 'auto',
          backgroundColor: 'var(--input-bg-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '10px',
          marginBottom: '10px',
          color: 'var(--text-color)',
          fontSize: '0.9em',
          flexShrink: 0,
        }}>
          <h5>Files used for merging:</h5>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {importedFilesInfo.map((file, index) => (
              <li key={index} style={{ marginBottom: '5px' }}>
                <strong style={{ color: 'var(--gradient-start)' }}>{file.name}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ flexGrow: 1, minHeight: 0 }}>
        <MonacoEditor
          language="json"
          height="100%"
          value={value} // This 'value' prop already contains the FULL, MERGED JSON.
          onChange={onChange}
          theme={monacoTheme}
          editorDidMount={handleEditorDidMount}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            glyphMargin: true,
          }}
        />
      </div>
    </div>
  );
};

export default JsonInputEditor;