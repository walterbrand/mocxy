import express from 'express';
import type { Request, Response } from 'express';
import type { RequestHandler } from 'express';
import { mocxy } from 'mocxy';

const app = express();

const middleware: RequestHandler = mocxy(); // 🔧 expliciete typehint

app.use(middleware); // ✅ geen TS2769 meer

app.get('/', (req: Request, res: Response) => {
    res.send('Mocxy is active!');
});

app.listen(3333, () => {
    console.log('Running at http://localhost:3333');
});
