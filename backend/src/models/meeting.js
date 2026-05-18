// models/meeting.js
import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  meeting_code: {
    type: String,
    required: true,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  meeting_name: {
    type: String,
    default: null
  }
});

meetingSchema.index({ user_id: 1, meeting_code: 1 }, { unique: true });

const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;