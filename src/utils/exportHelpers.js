// src/utils/exportHelpers.js
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Converts an array of JSON objects to a CSV string.
 * Assumes a flat structure for each object.
 * @param {Array<Object>} data An array of JSON objects.
 * @returns {string} CSV string.
 */
export const convertJsonToCsv = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return "";
    }

    const headers = new Set();
    data.forEach(row => {
        if (typeof row === 'object' && row !== null) {
            Object.keys(row).forEach(key => headers.add(key));
        }
    });

    const sortedHeaders = Array.from(headers).sort();
    let csv = sortedHeaders.join(',') + '\n'; // Add headers

    data.forEach(row => {
        if (typeof row === 'object' && row !== null) {
            const values = sortedHeaders.map(header => {
                let value = row[header];
                if (typeof value === 'object' && value !== null) {
                    // Stringify nested objects/arrays for CSV
                    value = JSON.stringify(value);
                } else if (value === undefined || value === null) {
                    value = ''; // Handle null/undefined values
                } else {
                    value = String(value);
                }
                // Escape commas and double quotes for CSV
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csv += values.join(',') + '\n';
        } else {
            // If an item in the array is not an object, just stringify it
            csv += `"${String(row).replace(/"/g, '""')}"\n`;
        }
    });

    return csv;
};

/**
 * Exports an array of JSON objects to an XLSX file.
 * @param {Array<Object>} data An array of JSON objects.
 * @param {string} fileName The name of the file to save.
 */
export const exportJsonToXlsx = (data, fileName = 'export.xlsx') => {
    if (!Array.isArray(data) || data.length === 0) {
        alert("No valid array data to export to Excel.");
        return;
    }

    // Ensure all items are objects for coherent table structure
    const validData = data.filter(item => typeof item === "object" && item !== null && !Array.isArray(item));

    if (validData.length === 0) {
        alert("The provided JSON array does not contain objects suitable for Excel export.");
        return;
    }

    // Extract headers from all objects to ensure all possible columns are included
    const allKeys = new Set();
    validData.forEach(obj => {
        Object.keys(obj).forEach(key => allKeys.add(key));
    });
    const headers = Array.from(allKeys).sort();

    // Prepare data for sheet (array of arrays, where first array is headers)
    const sheetData = [headers];
    validData.forEach(row => {
        const rowData = headers.map(header => {
            let value = row[header];
            if (typeof value === 'object' && value !== null) {
                // Stringify nested objects/arrays for display in a single cell
                return JSON.stringify(value);
            }
            return value;
        });
        sheetData.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
};