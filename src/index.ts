import { Request, Response, NextFunction, RequestHandler } from 'express';

export function mocxy(): RequestHandler {
    return function (req: Request, res: Response, next: NextFunction) {
        res.setHeader('x-mocxy', 'true');
        next();
    };
}
