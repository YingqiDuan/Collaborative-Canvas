# Collaborative Canvas Drawing App

A real-time collaborative drawing application built with Next.js and Supabase.

## Features

- Real-time collaborative drawing with multiple users
- Cursor tracking to see where other users are drawing
- Customizable brush sizes, colors, and styles
- Performance settings for different network conditions
- Persistent drawing history - new users can see previous drawings
- Save drawings as PNG images

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Set up Supabase

1. Create a new project on [Supabase](https://supabase.io)
2. Once your project is created, go to the SQL Editor
3. Copy and paste the SQL from `app/supabase-schema.sql` and run it to create the necessary tables

### 4. Configure environment variables

Create a `.env.local` file in the root directory with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Replace the values with your Supabase project URL and anon key found in the Supabase dashboard under Project Settings > API.

### 5. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Schema

The application uses a `canvas_strokes` table in Supabase to store drawing data:

- `id`: Auto-generated unique identifier
- `stroke_id`: Unique identifier for each stroke
- `room_id`: Identifier for the drawing room (allows multiple canvases)
- `user_id`: Identifier of the user who created the stroke
- `points`: JSON array of points that make up the stroke
- `brush_color`: Color of the stroke
- `brush_size`: Size/width of the stroke
- `line_cap`: Style of line cap used ('butt', 'round', or 'square')
- `created_at`: Timestamp when the stroke was created

## How Real-time Collaboration Works

This application uses Supabase's real-time subscriptions to enable collaborative drawing:

1. When a user draws, partial strokes are sent in real-time to other connected users
2. Completed strokes are saved to the database for persistence
3. When a new user connects, they load all existing strokes from the database
4. User cursors are tracked and displayed to enhance collaboration
5. Performance settings allow optimization for different network conditions

## Troubleshooting

### No real-time updates

Make sure you have:
- Set up your Supabase project correctly with the provided SQL schema
- Added the correct environment variables
- Enabled real-time functionality in your Supabase dashboard (Project Settings > API > Real-time)

### Missing previous drawings

If you can't see drawings made before you connected:
- Check that the `canvas_strokes` table was created properly
- Verify that RLS policies are correctly configured to allow selections
- Check the browser console for any errors when loading existing strokes

## License

[MIT](LICENSE)
