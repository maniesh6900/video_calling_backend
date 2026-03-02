import express from "express";
const app = express();
import cookieParser from "cookie-parser";
import cors from "cors";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({origin: "*"}));

// import UserRoute from "./routes/user-route";
// app.use("/api/v1/user", UserRoute);

export {app};