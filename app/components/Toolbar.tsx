import React, { useState } from 'react';

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
    isEraser?: boolean;
    setIsEraser?: (isEraser: boolean) => void;
}

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
    isEraser = false,
    setIsEraser
}) => {
    const [showPerformanceControls, setShowPerformanceControls] = useState(false);

    const togglePerformanceControls = () => {
        setShowPerformanceControls(!showPerformanceControls);
    };

    return (
        <div className={`toolbar mb-4 p-4 border rounded-md ${disabled ? 'bg-gray-100 opacity-75' : 'bg-gray-50'}`}>
            <div className="flex flex-wrap gap-4 mb-4">
                <div>
                    <label htmlFor="colorPicker" className="block mb-2 font-medium">Brush Color:</label>
                    <input
                        id="colorPicker"
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="cursor-pointer w-12 h-8"
                        disabled={disabled || isEraser}
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                        {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(color => (
                            <button
                                key={color}
                                onClick={() => setBrushColor(color)}
                                className={`w-6 h-6 rounded-full ${brushColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''} ${(disabled || isEraser) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={{ backgroundColor: color }}
                                aria-label={`Select color ${color}`}
                                disabled={disabled || isEraser}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="brushSize" className="block mb-2 font-medium">Brush Size: {brushSize}px</label>
                    <input
                        id="brushSize"
                        type="range"
                        min="1"
                        max="30"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className={`w-48 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={disabled}
                    />
                </div>

                <div>
                    <label className="block mb-2 font-medium">Line Cap Style:</label>
                    <div className="flex gap-2">
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
                </div>

                {setIsEraser && (
                    <div className="flex items-end">
                        <button
                            onClick={() => setIsEraser(!isEraser)}
                            className={`px-4 py-2 border rounded ${isEraser ? 'bg-blue-500 text-white' : 'bg-white'} hover:bg-blue-600 hover:text-white transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={disabled}
                        >
                            {isEraser ? 'Brush' : 'Eraser'}
                        </button>
                    </div>
                )}

                <div className="flex items-end">
                    <button
                        onClick={clearCanvas}
                        className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={disabled}
                    >
                        Clear Canvas
                    </button>
                </div>
            </div>

            <div className="border-t pt-3">
                <button
                    onClick={togglePerformanceControls}
                    className={`flex items-center text-sm text-gray-700 hover:text-gray-900 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={disabled}
                >
                    <span className="mr-1">{showPerformanceControls ? '▼' : '►'}</span>
                    Performance Settings
                </button>

                {showPerformanceControls && setSyncInterval && (
                    <div className="mt-3 bg-white p-3 rounded border">
                        <div>
                            <label htmlFor="syncInterval" className="block mb-2 font-medium text-sm">
                                Sync Interval: {syncInterval}ms
                                <span className="ml-2 text-xs text-gray-500">
                                    (Lower values = smoother collaboration, higher values = less network traffic)
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
                                <span>Smooth (10ms)</span>
                                <span>Balanced (50ms)</span>
                                <span>Low Bandwidth (200ms)</span>
                            </div>
                        </div>

                        <div className="mt-3 text-xs text-gray-600">
                            <p>
                                <strong>Sync Interval</strong> controls how frequently partial strokes are sent during drawing.
                                Lower values provide a smoother experience but use more bandwidth and server resources.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Toolbar; 