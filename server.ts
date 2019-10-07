import 'dotenv/config';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as bodyParser from 'body-parser';
import * as passport from 'passport';
import * as admin from 'firebase-admin';
import validateEnv from './utils/validateEnv';
import configurePassport from './config/passport';

import user from './routes/user';
import friends from './routes/friends';
import search from './routes/search';
import meetingRequest from './routes/meetingRequest';

validateEnv();

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());

configurePassport(passport);
admin.initializeApp({
  credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
  databaseURL: 'https://my-project-1548072053798.firebaseio.com'
});

const { MONGO_USER, MONGO_PASSWORD, MONGO_PATH } = process.env;
mongoose.connect(`mongodb://${MONGO_USER}:${MONGO_PASSWORD}${MONGO_PATH}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use('/user', user);
app.use('/search', search);
app.use('/friends', friends);
app.use('/meeting-request/', meetingRequest);

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}`);
});
