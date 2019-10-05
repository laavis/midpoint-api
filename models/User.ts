import * as mongoose from 'mongoose';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  password: string;
  friendsList: [mongoose.Types.ObjectId];
  firebaseToken: string;
}

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  friendsList: [mongoose.Types.ObjectId],
  firebaseToken: String
});

const User = mongoose.model<IUser & mongoose.Document>('User', UserSchema);

export default User;
