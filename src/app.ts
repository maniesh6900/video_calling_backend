import express from "express";
const app = express();
import cookieParser from "cookie-parser";
import cors from "cors";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({origin:[ "https://video-call-front-five.vercel.app", "http://localhost"]}));

import UserRoute from "./routes/tokenRoute";
app.use("/api/v1/user", UserRoute);

export {app};