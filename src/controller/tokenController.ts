import { ApiError } from "../utils/ApiError";
import { ApiReponse } from "../utils/ApiReponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
// const RtcTokenBuilder = require('../src/RtcTokenBuilder2').RtcTokenBuilder
// const RtcRole = require('../src/RtcTokenBuilder2').Role
import {Role, RtcTokenBuilder }from "../utils/rtcTokenBuilder";


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