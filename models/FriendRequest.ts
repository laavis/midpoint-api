import * as mongoose from 'mongoose';

export interface IFriendRequest {
  _id: mongoose.Types.ObjectId;
  requester: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: number;
}

const FriendRequestSchema = new mongoose.Schema({
  requester: mongoose.Types.ObjectId,
  receiver: mongoose.Types.ObjectId,
  status: Number
});

const FriendRequest = mongoose.model<IFriendRequest & mongoose.Document>('FriendRequest', FriendRequestSchema);

export default FriendRequest;
