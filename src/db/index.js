import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const ConnectDb = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URL}/${DB_NAME}`
    );
    console.log(
      `MONGODB CONNNECTED !! HOST DB : ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("mongodb not connected", error);
    throw error;
  }
};

export default ConnectDb;
