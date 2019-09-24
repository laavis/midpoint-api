import * as mongoose from 'mongoose';

interface IUser {
  email: string;
  username: string;
  password: string;
  friends: [mongoose.Types.ObjectId];
}

const UserSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  friends: [mongoose.Types.ObjectId]
});

const User = mongoose.model<IUser & mongoose.Document>('User', UserSchema);

export default User;
