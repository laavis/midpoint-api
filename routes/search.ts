import { Router, Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import User from '../models/User';

const router = Router();

router.get('/test', (req: Request, res: Response) => res.json({ msg: 'Search works' }));

export default router;
