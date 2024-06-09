import mongoose, { Schema } from "mongoose";

const subscriptionSchema = Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //user who is subscribing
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, //user  who own channel
      ref: "User",
    },
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
