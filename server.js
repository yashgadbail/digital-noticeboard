import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;
const dataFile = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// Helper function to read data
const readData = () => {
    try {
        const rawData = fs.readFileSync(dataFile, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error("Error reading data.json:", error);
        return { notices: [], events: [], birthdays: [] };
    }
};

// Helper function to save data
const saveData = (data) => {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Error writing data.json:", error);
        return false;
    }
};

// ==========================================
// API Endpoints
// ==========================================

// Get all data
app.get('/api/data', (req, res) => {
    const data = readData();
    res.json(data);
});

// Update entire dataset (simple approach for Admin Panel)
app.post('/api/data', (req, res) => {
    const newData = req.body;

    // Basic validation to ensure required keys exist
    if (!newData.notices || !newData.events || !newData.birthdays || !newData.cctv) {
        return res.status(400).json({ error: "Invalid data structure." });
    }

    if (saveData(newData)) {
        res.json({ success: true, message: "Data saved successfully." });
    } else {
        res.status(500).json({ error: "Failed to save data." });
    }
});

app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
