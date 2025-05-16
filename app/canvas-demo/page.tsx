'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import CanvasBoard, { Stroke, CursorPosition, CanvasBoardRef, PartialStroke } from '../components/CanvasBoard';
import Toolbar from '../components/Toolbar';
import { saveImageFromDataURL } from '../utils/canvasUtils';
import { useRealtimeCollaboration, generateUserColor } from '../utils/realtimeUtils';

// Supabase configuration - Replace with your own Supabase URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Room identifier for the drawing session
const ROOM_ID = 'main-canvas';

type LineCapStyle = 'butt' | 'round' | 'square';

export default function CanvasDemoPage() {
  // User information
  const [userId] = useState(() => `user-${uuidv4().slice(0, 8)}`);
  const [userName, setUserName] = useState('Guest');
  // Change this to use a placeholder color initially, then set it client-side
  const [userColor, setUserColor] = useState('rgba(200, 200, 200, 0.7)');
  // Loading state for initial strokes
  const [isLoadingStrokes, setIsLoadingStrokes] = useState(true);
  // Track whether a clear canvas action just happened
  const [justCleared, setJustCleared] = useState(false);
  // State to track mobile menu visibility
  const [showMobileInfo, setShowMobileInfo] = useState(false);

  // Use useEffect to set random color only on the client side
  useEffect(() => {
    setUserColor(generateUserColor());
  }, []);

  // Tool configuration
  const [brushColor, setBrushColor] = useState('#000000');
  const [toolMode, setToolMode] = useState<'brush' | 'eraser'>('brush');
  const [brushSize, setBrushSize] = useState(3);
  const [lineCap, setLineCap] = useState<LineCapStyle>('round');

  // Performance settings
  const [syncInterval, setSyncInterval] = useState<number>(50);

  // Reference to the canvas board
  const canvasBoardRef = useRef<CanvasBoardRef>(null);

  // Add resize handler for window size changes
  useEffect(() => {
    const handleResize = () => {
      if (canvasBoardRef.current) {
        canvasBoardRef.current.resizeCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Set up real-time collaboration using our custom hook
  const {
    isConnected,
    connectionStatus,
    onlineUsers,
    remoteStrokes,
    remotePartialStrokes,
    remoteCursors,
    sendCursorPosition,
    sendPartialStroke,
    sendCompleteStroke,
    sendClearCanvas,
    reconnect,
    clearRemotePartialStrokes,
    setCursorSyncInterval
  } = useRealtimeCollaboration(supabase, {
    userId,
    userName,
    userColor,
    roomId: ROOM_ID,
    cursorSyncInterval: syncInterval
  });

  // Determine if the canvas should be disabled - with exception for just cleared state
  const isCanvasDisabled = connectionStatus !== 'connected' && !justCleared;

  // Update loading state when strokes are loaded
  useEffect(() => {
    // If we have remote strokes or we're fully connected, stop loading
    if (remoteStrokes.length > 0 || (isConnected && connectionStatus === 'connected')) {
      const timer = setTimeout(() => {
        setIsLoadingStrokes(false);
      }, 1000); // Short delay to ensure everything is rendered
      return () => clearTimeout(timer);
    }
  }, [remoteStrokes, isConnected, connectionStatus]);

  // Reset justCleared state when new strokes are added
  useEffect(() => {
    if (remoteStrokes.length > 0 && justCleared) {
      setJustCleared(false);
    }
  }, [remoteStrokes.length, justCleared]);

  // Update cursor sync interval when syncInterval changes
  useEffect(() => {
    setCursorSyncInterval(syncInterval);
  }, [syncInterval, setCursorSyncInterval]);

  // Clear canvas function to pass to Toolbar
  const clearCanvas = useCallback(() => {
    // Don't allow clearing if not connected
    if (isCanvasDisabled) return;

    // Use the ref to clear the canvas
    if (canvasBoardRef.current) {
      canvasBoardRef.current.clearCanvas();
    }

    // Clear partial strokes tracking
    clearRemotePartialStrokes();

    // Set the justCleared flag to allow drawing after clear
    setJustCleared(true);

    // Broadcast clear canvas event
    sendClearCanvas();
  }, [sendClearCanvas, clearRemotePartialStrokes, isCanvasDisabled]);

  // Handler for sync interval changes
  const handleSyncIntervalChange = useCallback((interval: number) => {
    setSyncInterval(interval);
  }, []);

  // Save canvas as image using the utility function
  const handleSaveCanvasAsImage = useCallback(() => {
    if (canvasBoardRef.current) {
      const dataUrl = canvasBoardRef.current.getDataURL();
      // Create a filename that includes the user's name
      const filename = `collaborative-drawing-${userName}-${new Date().toISOString().slice(0, 10)}.png`;
      // Use our utility function to save the image directly from the data URL
      saveImageFromDataURL(dataUrl, filename);
    }
  }, [userName]);

  // If eraser is active, paint in white
  const effectiveBrushColor = toolMode === 'eraser' ? '#ffffff' : brushColor;

  // Handle user name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
  };

  // Toggle mobile info display
  const toggleMobileInfo = () => {
    setShowMobileInfo(!showMobileInfo);
  };

  return (
    <div className="max-w-full">
      {/* Header Section - Responsive */}
      <div className="px-4 py-3 md:py-4 bg-gray-100 border-b sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold">Collaborative Canvas</h1>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden px-2 py-1 border rounded-md"
            onClick={toggleMobileInfo}
          >
            {showMobileInfo ? 'Hide Info' : 'Show Info'}
          </button>

          {/* Desktop Name Input */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center">
              <label htmlFor="userName" className="mr-2 font-medium text-sm">Your Name:</label>
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={handleNameChange}
                className="px-3 py-1 border rounded w-32 text-sm"
                placeholder="Enter your name"
              />
            </div>

            {/* Desktop Status Indicators */}
            <div className={`px-3 py-1 rounded-full text-sm ${connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
              }`}>
              {connectionStatus === 'connected' ? 'Connected' :
                connectionStatus === 'connecting' ? 'Connecting...' :
                  'Disconnected'}
              {connectionStatus === 'disconnected' && (
                <button
                  onClick={reconnect}
                  className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded"
                >
                  Reconnect
                </button>
              )}
            </div>

            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Online: {onlineUsers}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile User Info Panel - Collapsible */}
      {showMobileInfo && (
        <div className="md:hidden px-4 py-3 bg-gray-50 border-b">
          <div className="flex flex-col gap-2">
            <div>
              <label htmlFor="mobileUserName" className="block mb-1 font-medium text-sm">Your Name:</label>
              <input
                id="mobileUserName"
                type="text"
                value={userName}
                onChange={handleNameChange}
                className="px-3 py-2 border rounded w-full"
                placeholder="Enter your name"
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <div className={`px-3 py-1 rounded-full text-sm ${connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                  connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                }`}>
                {connectionStatus === 'connected' ? 'Connected' :
                  connectionStatus === 'connecting' ? 'Connecting...' :
                    'Disconnected'}
                {connectionStatus === 'disconnected' && (
                  <button
                    onClick={reconnect}
                    className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded"
                  >
                    Reconnect
                  </button>
                )}
              </div>

              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                Online: {onlineUsers}
              </div>

              <div
                className="px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                style={{ backgroundColor: `${userColor}20` }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: userColor }}
                ></div>
                <span>Your cursor</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto p-2 md:p-4">
        {/* Loading indicator */}
        {isLoadingStrokes && (
          <div className="mb-4 px-3 py-2 bg-purple-100 text-purple-800 rounded-full flex items-center gap-2 text-sm">
            <svg className="animate-spin h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading drawings...</span>
          </div>
        )}

        <Toolbar
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          lineCap={lineCap}
          setLineCap={setLineCap}
          clearCanvas={clearCanvas}
          syncInterval={syncInterval}
          setSyncInterval={handleSyncIntervalChange}
          disabled={isCanvasDisabled}
          toolMode={toolMode}
          setToolMode={setToolMode}
        />

        <div className="w-full relative">
          <CanvasBoard
            ref={canvasBoardRef}
            brushColor={effectiveBrushColor}
            brushSize={brushSize}
            lineCap={lineCap}
            userId={userId}
            onStrokeComplete={sendCompleteStroke}
            onPartialStroke={sendPartialStroke}
            onCursorMove={sendCursorPosition}
            remoteStrokes={remoteStrokes}
            remotePartialStrokes={remotePartialStrokes}
            remoteCursors={remoteCursors}
            syncInterval={syncInterval}
            disabled={isCanvasDisabled}
            responsive={true}
          />

          {isLoadingStrokes && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70"
              style={{ zIndex: 10 }}
            >
              <div className="text-center p-4 bg-white rounded-lg shadow-lg">
                <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg font-medium">Loading previous drawings...</p>
                <p className="text-sm text-gray-500">Please wait while we retrieve the canvas history</p>
              </div>
            </div>
          )}

          {isCanvasDisabled && !isLoadingStrokes && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70"
              style={{ zIndex: 10 }}
            >
              <div className="text-center p-4 bg-white rounded-lg shadow-lg">
                <svg className="h-10 w-10 text-yellow-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-lg font-medium">Connection required</p>
                <p className="text-sm text-gray-500">Please wait while we establish a connection to enable drawing</p>
                {connectionStatus === 'disconnected' && (
                  <button
                    onClick={reconnect}
                    className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={handleSaveCanvasAsImage}
            className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors ${isCanvasDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isCanvasDisabled}
          >
            Save as Image
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border">
          <details>
            <summary className="font-medium cursor-pointer">Instructions & Info</summary>
            <div className="mt-2 space-y-2">
              <p>
                Connected users will see your drawings and cursor movements in real-time.
              </p>
              <p>
                <strong>Note:</strong> You need to set up your own Supabase project and add the URL and anon key to the .env.local file
                to enable real-time collaboration. Follow the Supabase setup instructions in the README.
              </p>
              <p>
                <strong>New Feature:</strong> Drawing history is now saved! When new users connect, they'll see all previous drawings.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
} 