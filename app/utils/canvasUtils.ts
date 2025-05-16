/**
 * Canvas Utility Functions
 *
 * This file contains utility functions for canvas operations used across the application.
 * Centralizing these functions helps avoid duplication and makes maintenance easier.
 */

/**
 * Clears the canvas by erasing all content
 * @param canvas The canvas element to clear
 */
export const clearCanvas = (canvas: HTMLCanvasElement | null): void => {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

/**
 * Generates a data URL from the canvas for saving/downloading
 * @param canvas The canvas element
 * @returns Data URL string or null if canvas is not available
 */
export const getCanvasDataURL = (canvas: HTMLCanvasElement | null): string | null => {
  if (!canvas) return null;
  return canvas.toDataURL('image/png');
};

/**
 * Saves the canvas as an image file by triggering a download
 * @param canvas The canvas element to save
 * @param filename Optional custom filename (defaults to a timestamp-based name)
 */
export const saveCanvasAsImage = (canvas: HTMLCanvasElement | null, filename?: string): void => {
  if (!canvas) return;

  // Create a temporary link element
  const link = document.createElement('a');

  // Set the download attribute with a filename
  link.download = filename || `canvas-drawing-${new Date().toISOString().slice(0, 10)}.png`;

  // Convert the canvas to a data URL
  link.href = canvas.toDataURL('image/png');

  // Append to the document, click to download, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Saves an image directly from a data URL string
 * @param dataUrl The data URL string containing the image data
 * @param filename Optional custom filename (defaults to a timestamp-based name)
 */
export const saveImageFromDataURL = (dataUrl: string | null, filename?: string): void => {
  if (!dataUrl) return;

  // Create a temporary link element
  const link = document.createElement('a');

  // Set the download attribute with a filename
  link.download = filename || `canvas-drawing-${new Date().toISOString().slice(0, 10)}.png`;

  // Use the provided data URL
  link.href = dataUrl;

  // Append to the document, click to download, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
