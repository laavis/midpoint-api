import * as mongoose from 'mongoose';

export interface IFriendToken {
  _id: mongoose.Types.ObjectId;
  requester: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FriendTokenSchema = new mongoose.Schema({
  requester: mongoose.Types.ObjectId,
  createdAt: Date
});

const FriendToken = mongoose.model<IFriendToken & mongoose.Document>('FriendToken', FriendTokenSchema);

export default FriendToken;
