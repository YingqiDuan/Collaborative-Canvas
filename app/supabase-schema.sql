-- Canvas Stroke Storage Schema
-- Run this SQL in the Supabase SQL editor to create the necessary table

-- Create a table to store canvas strokes
CREATE TABLE IF NOT EXISTS canvas_strokes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stroke_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    points JSONB NOT NULL,
    brush_color TEXT NOT NULL,
    brush_size INTEGER NOT NULL,
    line_cap TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Add indexes for better query performance
    CONSTRAINT unique_stroke_id UNIQUE (stroke_id)
);

-- Create an index on room_id for faster queries
CREATE INDEX IF NOT EXISTS idx_canvas_strokes_room_id ON canvas_strokes(room_id);

-- Set up Row Level Security (RLS)
ALTER TABLE canvas_strokes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all authenticated users to select strokes
CREATE POLICY "Allow anyone to select strokes" ON canvas_strokes
    FOR SELECT USING (true);

-- Create a policy that allows all authenticated users to insert strokes
CREATE POLICY "Allow anyone to insert strokes" ON canvas_strokes
    FOR INSERT WITH CHECK (true);

-- Create a policy that allows only the same user or specific admin roles to delete strokes
CREATE POLICY "Allow deletion of strokes" ON canvas_strokes
    FOR DELETE USING (
        auth.uid()::text = user_id OR 
        auth.uid() IN (SELECT id FROM auth.users WHERE auth.users.role = 'admin')
    );

-- Add an API function to clear all strokes for a room
CREATE OR REPLACE FUNCTION clear_room_strokes(p_room_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM canvas_strokes
    WHERE room_id = p_room_id;
END;
$$; 