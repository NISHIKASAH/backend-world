import dotenv from "dotenv";
import ConnectDb from "./db/index.js";

//config .env file
dotenv.config({
  path: "./env",
});

ConnectDb();
