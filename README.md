# SCMS Digital Noticeboard

A modern, glassmorphism-styled digital noticeboard for the Scientific Computing, Modeling & Simulation department.

## Features
- Real-time Clock & Celestial Time Indicator (Sun/Moon Dial)
- Auto-cycling screens for Notices, Events, Birthdays, CCTV Feeds, and Video Playlists
- Admin Interface for remote management of data and visibility toggles
- 3D Interactive WebGL Background

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed on your machine (e.g., Raspberry Pi or local PC).
2. Clone or download this repository.
3. Open a terminal in the project directory and install the dependencies:
   ```bash
   npm install
   ```

## Running the Noticeboard

To start both the backend server and the frontend development server simultaneously, run:
```bash
npm run dev
```

## Accessing the Interfaces

Once the server is running, you can access the following pages in your web browser:

- **Digital Noticeboard (Main Display):** `http://localhost:5173/`
- **Admin Dashboard (Management):** `http://localhost:5173/admin.html`

*Note: If `localhost:5173` is in use, Vite will automatically assign the next available port (e.g., 5174). Check your terminal output for the exact URL.*

## Data Management
All content (notices, events, video playlists) is stored in `data.json` and managed securely via the Admin Dashboard. The system automatically polls for changes every 30 seconds, so you don't need to refresh the display!
