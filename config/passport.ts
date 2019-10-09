import { Strategy, ExtractJwt } from 'passport-jwt';
import User from '../models/User';

interface IOptions {
  [key: string]: any;
}

const options: IOptions = {};

options.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
options.secretOrKey = process.env.JWT_SECRET;

function configurePassport(passport: any) {
  passport.use(
    new Strategy(options, (jwtPayload: any, done: any) => {
      User.findById(jwtPayload.id)
        .then(user => {
          // If user has been found
          if (user) {
            return done(null, user);
          }
          return done(null, false);
        })
        .catch(err => console.error(err));
    })
  );
}

export default configurePassport;
