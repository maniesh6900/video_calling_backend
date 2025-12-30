import z from "zod";

export const UserSignupSchema = z.object({
    username : z.string().min(3),
    password : z.string().min(3).max(10),
    email : z.string().email(), 
});

export const UserLoginSchema = z.object({
    password : z.string(),
    // how can i choose username or email?
    usernameOrEmail : z.string(),
});