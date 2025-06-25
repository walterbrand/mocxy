import express from 'express';
import { loadCsvDataAsMap } from './load-csv-data.js';
export function mocxy() {
    const basePath = process.cwd();
    const dataMap = loadCsvDataAsMap(basePath);
    const router = express.Router();
    // middleware: zet herkenbare header
    router.use((req, res, next) => {
        res.setHeader('x-mocxy', 'on');
        next();
    });
    // GET /api/:resource
    router.get('/api/:resource', (req, res) => {
        const { resource } = req.params;
        const items = dataMap.get(resource);
        if (!items) {
            return res.status(404).json({ error: `Resource '${resource}' not found.` });
        }
        res.json(items);
    });
    return router;
}
