import { Request, Response, NextFunction } from 'express';

export function mocxy() {
    return function (req: Request, res: Response, next: NextFunction) {
        res.setHeader('x-mocxy', 'true'); // zichtbaar teken dat het werkt
        next();
    };
}
