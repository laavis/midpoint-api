import * as mongoose from 'mongoose';

export interface IFriendRequest {
  success: Boolean;
  _id: mongoose.Types.ObjectId;
  requester: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: Number;
}

const FriendRequestSchema = new mongoose.Schema({
  success: Boolean,
  requester: mongoose.Types.ObjectId,
  receiver: mongoose.Types.ObjectId,
  status: Number
});

const FriendRequest = mongoose.model<IFriendRequest & mongoose.Document>('FriendRequest', FriendRequestSchema);

export default FriendRequest;
