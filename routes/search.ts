import { Router, Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as passport from 'passport';
import User from '../models/User';

const router = Router();

router.get('/test', (req: Request, res: Response) => res.json({ msg: 'Search works' }));

router.get(
  '/users',
  passport.authenticate('jwt', { session: false }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const searchTerm = req.body.username;

      if (!searchTerm.length) {
        return res.json({ users: [] });
      }

      const matchingUsers = await User.find({ username: { $regex: searchTerm } }, { username: 1, _id: 1 });

      return res.json({ users: matchingUsers });
    } catch (e) {
      next(e);
    }
  }
);
export default router;
