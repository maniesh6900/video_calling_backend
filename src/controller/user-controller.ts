import { client } from "../prisma";
import { ApiError } from "../utils/ApiError";
import { ApiReponse } from "../utils/ApiReponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { UserLoginSchema, UserSignupSchema } from "../types";
import bcrypt from "bcrypt";
// const RtcTokenBuilder = require('../src/RtcTokenBuilder2').RtcTokenBuilder
// const RtcRole = require('../src/RtcTokenBuilder2').Role
import {Role, RtcTokenBuilder }from "../utils/rtcTokenBuilder";




export const userSignup = asyncHandler(async (req: Request, res: Response) => {
    const parsedData = UserSignupSchema.safeParse(req.body);
    if (!parsedData.success) {
        throw new ApiError(400, "Invalid input data");
    }
    const existingUser = await client.user.findFirst({
        where: { 
            email: parsedData.data.email,
        },
    });
    if (existingUser) {
        throw new ApiError(411, "User already exists");
    }

    const salt =  bcrypt.genSaltSync(12);
    const hashedPassword = bcrypt.hashSync(parsedData.data.password, salt);

    const user  = await client.user.create({
        data : {
            email: parsedData.data.email,
            password: hashedPassword,
            username: parsedData.data.username,
        },
    });
     if(!user) {
        throw new ApiError(500, "User creation failed");
    }
    const token  = jwt.sign({
        userId: user.id,  
    }, process.env.SECRET_KEY as string);

    res
    .cookie("token", token, {secure : true, httpOnly: true})
    .json(
        new ApiReponse(200, "User created successfully", { user, token }),
    );
});

export const userLogin = asyncHandler(async (req: Request, res: Response) => {
    const passedData = UserLoginSchema.safeParse(req.body);
    if (!passedData.success)    
        throw new ApiError(400, "Invalid input data");

    const user = await client.user.findFirst({
        where: {
            OR: [
                { username: passedData.data.usernameOrEmail },
                { email: passedData.data.usernameOrEmail },
            ],
        },
    });

    if(!user) {
        throw new ApiError(404, "User not found");
    }
    const isPasswordValid = bcrypt.compareSync(passedData.data.password, user.password);
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }

    const token = jwt.sign(
        { userId: user.id },
        process.env.SECRET_KEY as string,
    );

    res
    .cookie("token", token, { secure: true, httpOnly: true })
    .json(
        new ApiReponse(200, "User logged in successfully", { user, token }),
    );

});

export const createToken = asyncHandler(async (req : Request, res : Response )=>{
    const {channel, _uid} = req.body;
    
    
    const appId = process.env.AGORA_APP_ID;
    // Get the value of the environment variable AGORA_APP_CERTIFICATE. Make sure you set this variable to the App certificate you obtained from Agora console
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    // Replace channelName with the name of the channel you want to join
    const channelName = channel;
    // Fill in your actual user ID
    const uid = _uid;
    // Set streaming permissions
    const role = Role.PUBLISHER;
    // Token validity time in seconds
    const tokenExpirationInSecond = 3600;
    // The validity time of all permissions in seconds
    const privilegeExpirationInSecond = 3600;
    // console.log("App Id:", appId);
    // console.log("App Certificate:", appCertificate);
    if (appId == undefined || appId == "" || appCertificate == undefined || appCertificate == "") {
      console.log("Need to set environment variable AGORA_APP_ID and AGORA_APP_CERTIFICATE");
      process.exit(1);
    }
    // Generate Token
    const tokenWithUid = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, tokenExpirationInSecond, privilegeExpirationInSecond);
    res
    .cookie("token", tokenWithUid, { secure: true, httpOnly: true })
    .json(
        new ApiReponse(200, "Token generated successfully", { token: tokenWithUid }),
    );
});
