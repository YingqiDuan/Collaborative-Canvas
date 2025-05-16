import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CursorPosition, Stroke, PartialStroke } from '../components/CanvasBoard';

/* eslint-disable react-hooks/exhaustive-deps */

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
type PresenceState = Record<string, { userId: string; username: string; online_at: string; cursorColor?: string; }[]>;

interface RealtimeHookOptions {
    userId: string;
    userName: string;
    userColor: string;
    roomId: string;
    cursorSyncInterval?: number;
}

interface RealtimeHookResult {
    channel: RealtimeChannel | null;
    isConnected: boolean;
    connectionStatus: ConnectionStatus;
    onlineUsers: number;
    remoteStrokes: Stroke[];
    remotePartialStrokes: PartialStroke[];
    remoteCursors: CursorPosition[];
    sendCursorPosition: (position: CursorPosition) => void;
    sendPartialStroke: (partialStroke: PartialStroke) => void;
    sendCompleteStroke: (stroke: Stroke) => void;
    sendClearCanvas: () => void;
    reconnect: () => void;
    clearRemotePartialStrokes: () => void;
    setCursorSyncInterval: (interval: number) => void;
}

// Table name for storing completed strokes
const STROKES_TABLE = 'canvas_strokes';

/**
 * Saves a completed stroke to the database
 * @param supabase - Supabase client
 * @param stroke - The completed stroke to save
 * @param roomId - The room identifier
 */
const saveStrokeToDatabase = async (supabase: SupabaseClient, stroke: Stroke, roomId: string) => {
    try {
        await supabase.from(STROKES_TABLE).insert({
            stroke_id: stroke.id,
            room_id: roomId,
            user_id: stroke.userId,
            points: stroke.points,
            brush_color: stroke.brushColor,
            brush_size: stroke.brushSize,
            line_cap: stroke.lineCap,
            is_eraser: stroke.isEraser || false,
            created_at: new Date().toISOString()
        });
        console.log('Stroke saved to database:', stroke.id);
    } catch (error) {
        console.error('Error saving stroke to database:', error);
    }
};

/**
 * Loads all strokes for a specific room
 * @param supabase - Supabase client
 * @param roomId - The room identifier
 * @returns Array of strokes
 */
const getAllStrokes = async (supabase: SupabaseClient, roomId: string): Promise<Stroke[]> => {
    try {
        const { data, error } = await supabase
            .from(STROKES_TABLE)
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
            
        if (error) {
            console.error('Error loading strokes:', error);
            return [];
        }
        
        if (!data || data.length === 0) {
            console.log('No existing strokes found for room:', roomId);
            return [];
        }
        
        // Convert from database format to Stroke format
        const strokes: Stroke[] = data.map(row => ({
            id: row.stroke_id,
            userId: row.user_id,
            points: row.points,
            brushColor: row.brush_color,
            brushSize: row.brush_size,
            lineCap: row.line_cap,
            isEraser: row.is_eraser || false
        }));
        
        console.log(`Loaded ${strokes.length} strokes for room:`, roomId);
        return strokes;
    } catch (error) {
        console.error('Error loading strokes:', error);
        return [];
    }
};

/**
 * Clears all strokes for a specific room from the database
 * @param supabase - Supabase client
 * @param roomId - The room identifier
 */
const clearAllStrokes = async (supabase: SupabaseClient, roomId: string) => {
    try {
        // Use the dedicated function which has SECURITY DEFINER privileges
        const { error } = await supabase
            .rpc('clear_room_strokes', { p_room_id: roomId });
            
        if (error) {
            console.error('Error clearing strokes:', error);
            throw error; // Rethrow to be caught by the outer catch
        } else {
            console.log('All strokes cleared for room:', roomId);
        }
    } catch (error) {
        console.error('Error clearing strokes:', error);
        // Provide more detailed error information in console
        if (error instanceof Error) {
            console.error(`Details: ${error.message}`);
        }
    }
};

/**
 * Custom hook for managing Supabase real-time collaboration
 * @param supabase - Supabase client instance
 * @param options - Configuration options
 * @returns Real-time collaboration utilities and state
 */
export function useRealtimeCollaboration(
    supabase: SupabaseClient,
    options: RealtimeHookOptions
): RealtimeHookResult {
    const { userId, userName, userColor, roomId, cursorSyncInterval = 50 } = options;

    // State for tracking connection and collaboration data
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [onlineUsers, setOnlineUsers] = useState<number>(1);
    const [remoteStrokes, setRemoteStrokes] = useState<Stroke[]>([]);
    const [remotePartialStrokes, setRemotePartialStrokes] = useState<PartialStroke[]>([]);
    const [remoteCursors, setRemoteCursors] = useState<CursorPosition[]>([]);
    const [currentCursorSyncInterval, setCurrentCursorSyncInterval] = useState<number>(cursorSyncInterval);

    // References for throttling and tracking
    const lastCursorSentTimeRef = useRef<number>(0);
    const processedPartialStrokeIds = useRef<Set<string>>(new Set());
    const initialDataLoadedRef = useRef<boolean>(false);

    // Load existing strokes when the component mounts
    useEffect(() => {
        const loadExistingStrokes = async () => {
            const strokes = await getAllStrokes(supabase, roomId);
            if (strokes.length > 0) {
                setRemoteStrokes(strokes);
            }
            initialDataLoadedRef.current = true;
        };
        
        loadExistingStrokes();
    }, [supabase, roomId]);

    // Initialize channel and set up subscriptions
    useEffect(() => {
        setConnectionStatus('connecting');

        // Create a new realtime channel
        const newChannel = supabase.channel(`whiteboard:${roomId}`, {
            config: {
                broadcast: {
                    self: false,
                },
                presence: {
                    key: userId,
                },
            },
        });

        // Subscribe to cursor updates
        newChannel
            .on('broadcast', { event: 'cursor' }, (payload: { payload: CursorPosition }) => {
                const cursor = payload.payload;
                setRemoteCursors((prevCursors) => {
                    const filtered = prevCursors.filter(c => c.userId !== cursor.userId);
                    return [...filtered, cursor];
                });
            })
            // Subscribe to partial stroke updates during drawing
            .on('broadcast', { event: 'partialStroke' }, (payload: { payload: PartialStroke }) => {
                const partialStroke = payload.payload;
                // Create a unique ID for this partial stroke update
                const updateId = `${partialStroke.strokeId}-${partialStroke.sequence}`;
                
                // Skip if we've already processed this update
                if (processedPartialStrokeIds.current.has(updateId)) return;
                processedPartialStrokeIds.current.add(updateId);
                
                // Add to remote partial strokes
                setRemotePartialStrokes((prevPartialStrokes) => {
                    // Keep a reasonable buffer size to prevent memory issues
                    const newStrokes = [...prevPartialStrokes, partialStroke];
                    // Only keep the last 100 partial strokes to prevent memory bloat
                    if (newStrokes.length > 100) {
                        return newStrokes.slice(newStrokes.length - 100);
                    }
                    return newStrokes;
                });
            })
            // Subscribe to completed stroke updates
            .on('broadcast', { event: 'stroke' }, (payload: { payload: Stroke }) => {
                const stroke = payload.payload;
                setRemoteStrokes((prevStrokes) => [...prevStrokes, stroke]);
                
                // Clear any partial strokes for this completed stroke
                setRemotePartialStrokes((prevPartialStrokes) => 
                    prevPartialStrokes.filter(ps => ps.strokeId !== stroke.id)
                );
            })
            // Subscribe to clear canvas events
            .on('broadcast', { event: 'clear' }, () => {
                // Clear any partial strokes
                setRemotePartialStrokes([]);
                processedPartialStrokeIds.current.clear();
                
                // Also clear all completed strokes
                setRemoteStrokes([]);
                
                // 通知所有Canvas组件有清除事件发生
                const notifyFunc = (window as Window & typeof globalThis & { 
                    notifyCanvasClearEvent?: () => void 
                }).notifyCanvasClearEvent;
                
                if (typeof window !== 'undefined' && notifyFunc) {
                    notifyFunc();
                }
                
                // Make sure we don't affect connection status
                // If we're already connected, stay connected
                if (connectionStatus === 'disconnected') {
                    // Only try to reconnect if we're disconnected
                    console.log('Attempting to reconnect after clear event');
                    setConnectionStatus('connecting');
                }
            })
            // Handle presence state changes
            .on('presence', { event: 'sync' }, () => {
                const state = newChannel.presenceState() as PresenceState;
                const users = Object.values(state).flatMap(presence => presence);
                setOnlineUsers(users.length);
                console.log('Online users:', users);
                
                // Update remote cursor colors from presence state
                setRemoteCursors((prevCursors) => {
                    return prevCursors.map(cursor => {
                        // Find this user in the presence state
                        const userPresence = users.find(u => u.userId === cursor.userId);
                        if (userPresence && userPresence.cursorColor) {
                            // Update with color from presence state
                            return { ...cursor, color: userPresence.cursorColor };
                        }
                        return cursor;
                    });
                });
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string, newPresences: { userId: string; username: string; online_at: string; cursorColor?: string; }[] }) => {
                console.log('User joined:', key, newPresences);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string, leftPresences: { userId: string; username: string; online_at: string; cursorColor?: string; }[] }) => {
                console.log('User left:', key, leftPresences);
                // Remove cursor when user leaves
                setRemoteCursors((prevCursors) =>
                    prevCursors.filter(cursor => !leftPresences.some((p) => p.userId === cursor.userId))
                );
            })
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    setConnectionStatus('connected');
                    console.log('Connected to Supabase realtime channel');

                    // Track presence of current user with color
                    newChannel.track({
                        userId: userId,
                        username: userName,
                        online_at: new Date().toISOString(),
                        cursorColor: userColor,
                    });
                } else if (status === 'CHANNEL_ERROR') {
                    setConnectionStatus('disconnected');
                    console.error('Error connecting to Supabase channel');
                }
            });

        setChannel(newChannel);

        // Cleanup function
        return () => {
            newChannel.unsubscribe();
        };
    }, [supabase, userId, userName, userColor, roomId]);

    // Update presence state when username changes
    useEffect(() => {
        if (channel && isConnected) {
            channel.track({
                userId: userId,
                username: userName,
                online_at: new Date().toISOString(),
                cursorColor: userColor,
            });
        }
    }, [channel, isConnected, userId, userName, userColor]);

    // Function to send cursor position with throttling
    const sendCursorPosition = useCallback((position: CursorPosition) => {
        if (channel && isConnected) {
            // Throttle cursor updates based on the current sync interval
            const now = Date.now();
            if (now - lastCursorSentTimeRef.current > currentCursorSyncInterval) {
                lastCursorSentTimeRef.current = now;
                channel.send({
                    type: 'broadcast',
                    event: 'cursor',
                    payload: {
                        ...position,
                        username: userName,
                        color: userColor
                    }
                });
            }
        }
    }, [channel, isConnected, userName, userColor, currentCursorSyncInterval]);

    // Function to update cursor sync interval
    const setCursorSyncInterval = useCallback((interval: number) => {
        setCurrentCursorSyncInterval(interval);
    }, []);

    // Function to send partial stroke during drawing
    const sendPartialStroke = useCallback((partialStroke: PartialStroke) => {
        if (channel && isConnected) {
            channel.send({
                type: 'broadcast',
                event: 'partialStroke',
                payload: partialStroke
            });
        }
    }, [channel, isConnected]);

    // Function to send completed stroke
    const sendCompleteStroke = useCallback((stroke: Stroke) => {
        if (channel && isConnected) {
            // Broadcast the stroke to other users
            channel.send({
                type: 'broadcast',
                event: 'stroke',
                payload: stroke
            });
            
            // Save the stroke to the database for persistence
            saveStrokeToDatabase(supabase, stroke, roomId);
            console.log('Sent completed stroke to Supabase:', stroke);
        }
    }, [channel, isConnected, supabase, roomId]);

    // Function to send clear canvas event
    const sendClearCanvas = useCallback(() => {
        if (channel && isConnected) {
            channel.send({
                type: 'broadcast',
                event: 'clear',
                payload: { userId }
            });
            
            // Clear all strokes from the database
            clearAllStrokes(supabase, roomId)
                .catch(error => {
                    console.error('Failed to clear canvas:', error);
                    // Optionally notify the user about the error
                });
        }
    }, [channel, isConnected, userId, supabase, roomId]);

    // Function to reconnect to channel
    const reconnect = useCallback(() => {
        if (channel) {
            channel.subscribe();
            setConnectionStatus('connecting');
        }
    }, [channel]);

    // Function to clear remote partial strokes
    const clearRemotePartialStrokes = useCallback(() => {
        setRemotePartialStrokes([]);
        processedPartialStrokeIds.current.clear();
    }, []);

    return {
        channel,
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
    };
}

// Generate a random pastel color for user cursor
export const generateUserColor = (): string => {
    const hue = Math.floor(Math.random() * 360);
    return `hsla(${hue}, 70%, 70%, 0.7)`;
}; 