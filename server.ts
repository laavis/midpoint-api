import 'dotenv/config';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as passport from 'passport';
import validateEnv from './utils/validateEnv';
import configurePassport from './config/passport';

import user from './routes/user';

validateEnv();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());

configurePassport(passport);

const { MONGO_USER, MONGO_PASSWORD, MONGO_PATH } = process.env;
mongoose.connect(`mongodb://${MONGO_USER}:${MONGO_PASSWORD}${MONGO_PATH}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use('/user', user);

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}`);
});
