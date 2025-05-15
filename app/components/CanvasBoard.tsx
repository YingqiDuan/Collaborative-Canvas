import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { clearCanvas as clearCanvasUtil, getCanvasDataURL } from '../utils/canvasUtils';

// Define stroke data interface for collaboration
export interface Point {
    x: number;
    y: number;
}

export interface Stroke {
    id: string;
    points: Point[];
    brushColor: string;
    brushSize: number;
    lineCap: CanvasLineCap;
    userId: string;
}

// New interface for partial strokes during ongoing drawing
export interface PartialStroke {
    strokeId: string;
    points: Point[];
    brushColor: string;
    brushSize: number;
    lineCap: CanvasLineCap;
    userId: string;
    timestamp: number;
    sequence: number;
}

export interface CursorPosition {
    x: number;
    y: number;
    userId: string;
    username?: string;
    color?: string; // Add color property for user cursor
}

export interface CanvasBoardRef {
    clearCanvas: () => void;
    getDataURL: () => string | null;
}

interface CanvasBoardProps {
    width?: number;
    height?: number;
    brushColor?: string;
    brushSize?: number;
    lineCap?: 'butt' | 'round' | 'square';
    userId?: string;
    onStrokeComplete?: (stroke: Stroke) => void;
    onCursorMove?: (position: CursorPosition) => void;
    onPartialStroke?: (partialStroke: PartialStroke) => void; // New callback for partial strokes
    remoteStrokes?: Stroke[];
    remoteCursors?: CursorPosition[];
    remotePartialStrokes?: PartialStroke[]; // New prop for handling remote partial strokes
    syncInterval?: number; // New property for controlling the synchronization interval
}

const CanvasBoard = forwardRef<CanvasBoardRef, CanvasBoardProps>(({
    width = 800,
    height = 600,
    brushColor = '#000000',
    brushSize = 3,
    lineCap = 'round',
    userId = 'local-user',
    onStrokeComplete,
    onCursorMove,
    onPartialStroke,
    remoteStrokes = [],
    remoteCursors = [],
    remotePartialStrokes = [],
    syncInterval = 50, // Default to 50ms if not provided
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null); // Add a separate canvas for cursor rendering
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const currentStrokeId = useRef<string>('');
    const sequenceNumber = useRef<number>(0);
    const lastPartialStrokeSentTimeRef = useRef<number>(0);

    // Track processed remote strokes to avoid duplicates
    const processedPartialStrokeIds = useRef<Set<string>>(new Set());
    // Map to keep track of the highest sequence number processed for each strokeId
    const highestSequence = useRef<Map<string, number>>(new Map());

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        clearCanvas: () => {
            clearCanvasFunc();
        },
        getDataURL: () => {
            return getCanvasDataURL(canvasRef.current);
        }
    }));

    // Effect to initialize canvas properties
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set initial canvas properties
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = brushColor;
        ctx.lineCap = lineCap;
        ctx.lineJoin = 'round';
    }, [brushColor, brushSize, lineCap]);

    // Effect to redraw remote strokes
    useEffect(() => {
        if (remoteStrokes.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw the most recent remote stroke
        const stroke = remoteStrokes[remoteStrokes.length - 1];
        if (stroke && stroke.points.length > 0) {
            const { points, brushColor, brushSize, lineCap } = stroke;

            ctx.save();
            ctx.lineWidth = brushSize;
            ctx.strokeStyle = brushColor;
            ctx.lineCap = lineCap;
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }

            ctx.stroke();
            ctx.restore();
        }
    }, [remoteStrokes]);

    // New effect to handle remote partial strokes
    useEffect(() => {
        if (remotePartialStrokes.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Process each received partial stroke
        remotePartialStrokes.forEach(partialStroke => {
            const { strokeId, points, brushColor, brushSize, lineCap, sequence } = partialStroke;

            // Skip if this user's own stroke
            if (partialStroke.userId === userId) return;

            // Check if we've seen a higher sequence number for this strokeId
            const currentHighestSeq = highestSequence.current.get(strokeId) || -1;
            if (sequence <= currentHighestSeq) return;

            // Update the highest sequence for this stroke
            highestSequence.current.set(strokeId, sequence);

            // Draw only if we have at least two points
            if (points.length >= 2) {
                ctx.save();
                ctx.lineWidth = brushSize;
                ctx.strokeStyle = brushColor;
                ctx.lineCap = lineCap;
                ctx.lineJoin = 'round';

                // Start drawing from the first point
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);

                // Add lines to the remaining points
                for (let i = 1; i < points.length; i++) {
                    ctx.lineTo(points[i].x, points[i].y);
                }

                ctx.stroke();
                ctx.restore();
            }
        });
    }, [remotePartialStrokes, userId]);

    // Effect to draw remote cursors
    useEffect(() => {
        const cursorCanvas = cursorCanvasRef.current;
        if (!cursorCanvas) return;

        const ctx = cursorCanvas.getContext('2d');
        if (!ctx) return;

        // Function to draw the cursors on the overlay canvas
        const drawCursors = () => {
            // Clear the cursor canvas first
            ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

            // Draw remote cursors
            if (remoteCursors.length > 0) {
                remoteCursors.forEach(cursor => {
                    if (cursor.userId !== userId) {
                        ctx.save();
                        // Draw a colored circle for each remote cursor
                        ctx.beginPath();
                        ctx.arc(cursor.x, cursor.y, 5, 0, Math.PI * 2);

                        // Use the cursor color if provided, or fallback to red
                        const cursorColor = cursor.color || 'rgba(255, 0, 0, 0.6)';
                        ctx.fillStyle = cursorColor;
                        ctx.fill();

                        // Draw username if available
                        if (cursor.username) {
                            ctx.font = '12px Arial';
                            ctx.fillStyle = 'black';
                            ctx.fillText(cursor.username, cursor.x + 10, cursor.y - 10);
                        }

                        ctx.restore();
                    }
                });
            }
        };

        // Set up animation frame for cursor updates
        let animationFrameId: number;
        const animate = () => {
            drawCursors();
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        // Cleanup function
        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [remoteCursors, userId]);

    // Clear the canvas - wrapper around the utility function
    const clearCanvasFunc = useCallback(() => {
        clearCanvasUtil(canvasRef.current);
        // Also clear the cursor canvas
        const cursorCanvas = cursorCanvasRef.current;
        if (cursorCanvas) {
            const ctx = cursorCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
            }
        }

        // Reset tracking of partial strokes
        processedPartialStrokeIds.current.clear();
        highestSequence.current.clear();
    }, []);

    const getCoordinates = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
        canvas: HTMLCanvasElement
    ): { x: number; y: number } | null => {
        const rect = canvas.getBoundingClientRect();

        // For mouse events
        if ('clientX' in e) {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }

        // For touch events
        if (e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }

        return null;
    };

    // Handle cursor movement for collaboration
    const handleCursorMove = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        if (!onCursorMove) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const coordinates = getCoordinates(e, canvas);
        if (!coordinates) return;

        onCursorMove({
            x: coordinates.x,
            y: coordinates.y,
            userId
        });
    };

    // Send partial stroke updates during drawing
    const sendPartialStroke = useCallback(() => {
        if (!onPartialStroke || !isDrawing || currentStroke.length < 2) return;

        // Throttle updates based on configured syncInterval
        const now = Date.now();
        if (now - lastPartialStrokeSentTimeRef.current < syncInterval) return;

        lastPartialStrokeSentTimeRef.current = now;
        sequenceNumber.current += 1;

        const partialStroke: PartialStroke = {
            strokeId: currentStrokeId.current,
            points: [...currentStroke], // Clone to avoid reference issues
            brushColor,
            brushSize,
            lineCap,
            userId,
            timestamp: now,
            sequence: sequenceNumber.current
        };

        onPartialStroke(partialStroke);
    }, [brushColor, brushSize, currentStroke, isDrawing, lineCap, onPartialStroke, userId, syncInterval]);

    const startDrawing = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Prevent scrolling when drawing on touch devices
        if ('touches' in e) {
            e.preventDefault();
        }

        const coordinates = getCoordinates(e, canvas);
        if (!coordinates) return;

        // Generate a new stroke ID for this drawing session
        currentStrokeId.current = `${userId}-${Date.now()}`;
        // Reset sequence number for this new stroke
        sequenceNumber.current = 0;

        setLastPosition(coordinates);
        setIsDrawing(true);
        setCurrentStroke([coordinates]);
    };

    const draw = (
        e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
        // Always notify about cursor movement
        handleCursorMove(e);

        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Prevent scrolling when drawing on touch devices
        if ('touches' in e) {
            e.preventDefault();
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const coordinates = getCoordinates(e, canvas);
        if (!coordinates) return;

        ctx.beginPath();
        ctx.moveTo(lastPosition.x, lastPosition.y);
        ctx.lineTo(coordinates.x, coordinates.y);
        ctx.stroke();

        setLastPosition(coordinates);
        setCurrentStroke(prev => [...prev, coordinates]);

        // Send partial stroke update
        sendPartialStroke();
    };

    const endDrawing = () => {
        if (isDrawing && onStrokeComplete && currentStroke.length > 1) {
            const stroke: Stroke = {
                id: currentStrokeId.current,
                points: currentStroke,
                brushColor,
                brushSize,
                lineCap,
                userId
            };

            onStrokeComplete(stroke);
        }

        setIsDrawing(false);
        setCurrentStroke([]);
    };

    return (
        <div
            className="canvas-container"
            style={{
                position: 'relative',
                width: `${width}px`,
                height: `${height}px`,
                marginBottom: '16px' // Add space below the canvas
            }}
        >
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={endDrawing}
                onMouseLeave={endDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={endDrawing}
                style={{
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    cursor: 'crosshair',
                    touchAction: 'none', // Prevents default touch actions like scrolling
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1
                }}
            />
            <canvas
                ref={cursorCanvasRef}
                width={width}
                height={height}
                style={{
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 2,
                    pointerEvents: 'none' // Makes sure pointer events pass through to the drawing canvas
                }}
            />
        </div>
    );
});

// Add display name for debugging
CanvasBoard.displayName = 'CanvasBoard';

export default CanvasBoard; 