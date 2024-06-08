import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//setting up configuraton(middleware) - for preparing  for taking data from different form .
//different origin(cors)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
// middleware for json data
app.use(
  express.json({
    limit: "16kb",
  })
);
//middleware for %20 ,spaces in url
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

//middleware for assests,images,files
app.use(express.static("public"));
//middlware for cookieparser
app.use(cookieParser());

//import routes
import userRoute from "./routes/user.routes.js";

app.use("/api/v1/users", userRoute);

export { app };
