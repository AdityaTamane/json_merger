// src/components/JsonTable.js
import React from 'react';

// JsonTable now accepts 'headers' and 'rows' directly
const JsonTable = ({ headers, rows, theme, tableRef }) => {
  // No more internal data processing or validity checks here
  // The parent component (App.js) is responsible for this now.

  return (
    <div className="json-table-container">
      {/* Attach the passed ref to the table element */}
      <table className="json-data-table" ref={tableRef}>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th> // Using index as key is okay for static headers
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cellValue, cellIndex) => (
                <td key={cellIndex}>{cellValue}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default JsonTable;