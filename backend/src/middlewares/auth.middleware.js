import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { prisma } from "../db/index.js"

export const verifyJWT = asyncHandler(async (req,res,next) => {
    try {
        const token = req.cookies?.accessToken|| req.header("Authorization")?.replace("Bearer ","");
        console.log("Token received:", token)
        if(!token){
            throw new ApiError(401,"unaothorize request");
        }
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decodedToken?._id || decodedToken?.id },
            select: { id: true, fullname: true, email: true, username: true, roll_no: true, phone_number: true, isVerified: true, achievements: true, description: true, createdAt: true, updatedAt: true }
        });
    
        if(!user){
            throw new ApiError(401,"invalid Acces TOken");
        }
        // Alias _id to id for backwards compatibility in controllers
        user._id = user.id;
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid acces toekn");
    }
})
