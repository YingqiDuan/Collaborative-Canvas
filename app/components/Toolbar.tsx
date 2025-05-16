import React, { useState, useEffect } from 'react';

type LineCapStyle = 'butt' | 'round' | 'square';

interface ToolbarProps {
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  lineCap: LineCapStyle;
  setLineCap: (style: LineCapStyle) => void;
  clearCanvas: () => void;
  syncInterval?: number;
  setSyncInterval?: (interval: number) => void;
  disabled?: boolean;
  toolMode?: 'brush' | 'eraser';
  setToolMode?: (mode: 'brush' | 'eraser') => void;
}

// Additional colors for the expanded palette
const COLORS = [
  '#000000', '#444444', '#666666', '#999999', '#CCCCCC',
  '#FF0000', '#FF6600', '#FFCC00', '#FFFF00', '#CCFF00',
  '#00FF00', '#00FFCC', '#00CCFF', '#0066FF', '#0000FF',
  '#6600FF', '#CC00FF', '#FF00CC', '#FF0066', '#FFFFFF'
];

const Toolbar: React.FC<ToolbarProps> = ({
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  lineCap,
  setLineCap,
  clearCanvas,
  syncInterval = 50,
  setSyncInterval,
  disabled = false,
  toolMode,
  setToolMode
}) => {
  // States for various tool panels
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [showLineCapPanel, setShowLineCapPanel] = useState(false);
  const [showPerformanceControls, setShowPerformanceControls] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Check if we're in mobile view
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    // Initial check
    checkMobileView();

    // Add event listener for resize
    window.addEventListener('resize', checkMobileView);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Toggle panels
  const togglePanel = (panel: 'color' | 'brush' | 'lineCap' | 'performance') => {
    switch (panel) {
      case 'color':
        setShowColorPanel(!showColorPanel);
        if (isMobileView) {
          setShowBrushPanel(false);
          setShowLineCapPanel(false);
          setShowPerformanceControls(false);
        }
        break;
      case 'brush':
        setShowBrushPanel(!showBrushPanel);
        if (isMobileView) {
          setShowColorPanel(false);
          setShowLineCapPanel(false);
          setShowPerformanceControls(false);
        }
        break;
      case 'lineCap':
        setShowLineCapPanel(!showLineCapPanel);
        if (isMobileView) {
          setShowColorPanel(false);
          setShowBrushPanel(false);
          setShowPerformanceControls(false);
        }
        break;
      case 'performance':
        setShowPerformanceControls(!showPerformanceControls);
        if (isMobileView) {
          setShowColorPanel(false);
          setShowBrushPanel(false);
          setShowLineCapPanel(false);
        }
        break;
    }
  };

  return (
    <div className={`toolbar mb-4 p-4 border rounded-md shadow-sm ${disabled ? 'bg-gray-100 opacity-75' : 'bg-gray-50'}`}>
      {/* Main toolbar buttons - always visible */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium mr-1 text-sm md:text-base">Tool:</span>
          {(['brush', 'eraser'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setToolMode && setToolMode(mode)}
              disabled={disabled}
              className={`px-3 py-1 border rounded ${toolMode === mode ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'
                } text-sm md:text-base`}
            >
              {mode === 'brush' ? 'Pencil' : 'Eraser'}
            </button>
          ))}
        </div>

        <button
          onClick={clearCanvas}
          className={`px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm md:text-base ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={disabled}
        >
          Clear Canvas
        </button>
      </div>

      {/* Mobile-friendly collapsible toolbar sections */}
      <div className="flex flex-wrap gap-2 mb-2">
        <button
          onClick={() => togglePanel('color')}
          className={`px-3 py-1 border rounded flex items-center gap-1 ${showColorPanel ? 'bg-gray-200' : 'bg-white'}`}
        >
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: brushColor }}></div>
          <span className="text-sm">Color</span>
          <span>{showColorPanel ? '▼' : '►'}</span>
        </button>

        <button
          onClick={() => togglePanel('brush')}
          className={`px-3 py-1 border rounded flex items-center gap-1 ${showBrushPanel ? 'bg-gray-200' : 'bg-white'}`}
        >
          <span className="text-sm">Brush Size</span>
          <span>{showBrushPanel ? '▼' : '►'}</span>
        </button>

        <button
          onClick={() => togglePanel('lineCap')}
          className={`px-3 py-1 border rounded flex items-center gap-1 ${showLineCapPanel ? 'bg-gray-200' : 'bg-white'}`}
        >
          <span className="text-sm">Line Style</span>
          <span>{showLineCapPanel ? '▼' : '►'}</span>
        </button>

        <button
          onClick={() => togglePanel('performance')}
          className={`px-3 py-1 border rounded flex items-center gap-1 ${showPerformanceControls ? 'bg-gray-200' : 'bg-white'}`}
        >
          <span className="text-sm">Settings</span>
          <span>{showPerformanceControls ? '▼' : '►'}</span>
        </button>
      </div>

      {/* Color panel */}
      {showColorPanel && (
        <div className="panel p-3 border rounded mb-3 bg-white">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="colorPicker" className="block font-medium text-sm">Color Picker:</label>
            <input
              id="colorPicker"
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="cursor-pointer w-10 h-8"
              disabled={disabled}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setBrushColor(color)}
                className={`w-6 h-6 md:w-8 md:h-8 rounded-full ${brushColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Brush size panel */}
      {showBrushPanel && (
        <div className="panel p-3 border rounded mb-3 bg-white">
          <label htmlFor="brushSize" className="block mb-2 font-medium text-sm">Brush Size: {brushSize}px</label>
          <div className="flex items-center gap-2">
            <span className="text-xs">1px</span>
            <input
              id="brushSize"
              type="range"
              min="1"
              max="30"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className={`flex-grow ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
            />
            <span className="text-xs">30px</span>
          </div>
          <div className="flex justify-between mt-2">
            {[1, 5, 10, 20, 30].map(size => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={`px-2 py-1 border rounded text-xs ${brushSize === size ? 'bg-blue-500 text-white' : 'bg-white'}`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Line cap panel */}
      {showLineCapPanel && (
        <div className="panel p-3 border rounded mb-3 bg-white">
          <label className="block mb-2 font-medium text-sm">Line Style:</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setLineCap('butt')}
              className={`px-3 py-1 border rounded ${lineCap === 'butt' ? 'bg-blue-500 text-white' : 'bg-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
            >
              Butt
            </button>
            <button
              onClick={() => setLineCap('round')}
              className={`px-3 py-1 border rounded ${lineCap === 'round' ? 'bg-blue-500 text-white' : 'bg-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
            >
              Round
            </button>
            <button
              onClick={() => setLineCap('square')}
              className={`px-3 py-1 border rounded ${lineCap === 'square' ? 'bg-blue-500 text-white' : 'bg-white'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
            >
              Square
            </button>
          </div>
          <div className="mt-2 flex justify-around">
            <div className="text-center">
              <div className="h-1 w-12 bg-black mx-auto" style={{ height: '4px' }}></div>
              <span className="text-xs">Butt</span>
            </div>
            <div className="text-center">
              <div className="h-1 w-12 bg-black mx-auto rounded-full" style={{ height: '4px' }}></div>
              <span className="text-xs">Round</span>
            </div>
            <div className="text-center">
              <div className="h-1 w-12 bg-black mx-auto" style={{ height: '4px', borderRadius: '1px' }}></div>
              <span className="text-xs">Square</span>
            </div>
          </div>
        </div>
      )}

      {/* Performance panel */}
      {showPerformanceControls && setSyncInterval && (
        <div className="panel p-3 border rounded mb-3 bg-white">
          <div>
            <label htmlFor="syncInterval" className="block mb-2 font-medium text-sm">
              Sync Interval: {syncInterval}ms
              <span className="ml-2 text-xs text-gray-500 block md:inline">
                (Lower = smoother, Higher = less data)
              </span>
            </label>
            <input
              id="syncInterval"
              type="range"
              min="10"
              max="200"
              step="5"
              value={syncInterval}
              onChange={(e) => setSyncInterval(Number(e.target.value))}
              className={`w-full ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={disabled}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10ms</span>
              <span>50ms</span>
              <span>200ms</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-600">
            <p>
              <strong>Sync Interval</strong> controls how frequently partial strokes are sent during drawing.
              Lower values provide a smoother experience but use more bandwidth.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar; 