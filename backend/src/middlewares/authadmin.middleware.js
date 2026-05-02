import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { prisma } from "../db/index.js"

export const verifyJWT = asyncHandler(async (req,res,next) => {
    try {
        const token = req.cookies?.accessToken|| req.header("Authorization")?.replace("Bearer ","");
        if(!token){
            throw new ApiError(401,"unaothorize request");
        }
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await prisma.admin.findUnique({
            where: { id: decodedToken?._id || decodedToken?.id },
            select: { id: true, email: true, createdAt: true, updatedAt: true }
        });
    
        if(!user){
            throw new ApiError(401,"invalid Acces TOken");
        }
        user._id = user.id;
        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid acces toekn");
    }
})
