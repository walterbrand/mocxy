import express from 'express';
import type { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { loadCsvDataAsMap } from './load-csv-data.js';


export function mocxy(): Router {
    const basePath = process.cwd();
    const dataMap = loadCsvDataAsMap(basePath);

    const router = express.Router();

    // middleware: zet herkenbare header
    router.use((req: Request, res: Response, next: NextFunction) => {
        res.setHeader('x-mocxy', 'on');
        next();
    });

    // GET /api/:resource
    router.get('/api/:resource', (req: Request, res: Response) => {
        const { resource } = req.params;
        const items = dataMap.get(resource);

        if (!items) {
            return res.status(404).json({ error: `Resource '${resource}' not found.` });
        }

        res.json({value: items, count: items.length});
    });


    return router;
}
