import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { createEmailTransporter } from "../utils/mailtransporter.util.js";
import { randomBytes } from "crypto";
import { prisma } from "../db/index.js";
import { hashPassword, isPasswordCorrect, generateAccessToken, generateRefreshToken } from "../utils/auth.js";

// Generate Access and Refresh Tokens
const generateAccessTokenAndRefreshTokens = async (userId) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  }
  catch (error) {
    throw new ApiError(500, "Error while generating tokens");
  }
};

// User Registration
const registerUser = asyncHandler(async(req,res) => {
    const {fullname, email, username, roll_no, password, phone_number} = req.body;
    
    // Check for empty fields
    if([fullname, email, username, password, phone_number].some((field) => !field || field.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    if (!email.toLowerCase().endsWith('@iiita.ac.in')) {
        throw new ApiError(400, "Registration is only allowed with IIITA student email IDs (@iiita.ac.in)");
    }

    // Phone number validation (basic 10-digit validation)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone_number)) {
        throw new ApiError(400, "Phone number must be 10 digits");
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        throw new ApiError(400, "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character");
    }

    // Check if user already exists
    const existedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: email.toLowerCase() },
          { phone_number }
        ]
      }
    });

    if (existedUser) {
        throw new ApiError(409, "User with email, username, or phone number already exists");
    }

    // Generate email verification token
    const emailVerificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedPassword = await hashPassword(password);

    // Create user with verification token
    const user = await prisma.user.create({
      data: {
        fullname,
        email: email.toLowerCase(),
        password: hashedPassword,
        roll_no,
        phone_number,
        username: username.toLowerCase(),
        emailVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isVerified: false
      }
    });

    const usercheck = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, fullname: true, email: true, username: true, roll_no: true, phone_number: true, isVerified: true, achievements: true, description: true, createdAt: true, updatedAt: true
      }
    });

    if (!usercheck) {
        throw new ApiError(500, "User not created");
    }

    // Send verification email
    const verificationMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Email Verification</h1>
        <p>Hello ${user.fullname},</p>
        <p>Thank you for registering! Please use the following verification code to activate your account:</p>
        
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #007bff;">
                ${emailVerificationToken}
            </div>
        </div>
        
        <p><strong>⏰ This verification code will expire in 24 hours.</strong></p>
        <p>If you didn't create an account, please ignore this email.</p>
    </div>
    `;

    try {
        const transporter = createEmailTransporter();
        await transporter.sendMail({
            from: `"Smart-Sac" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Verify Your Email Address',
            html: verificationMessage
        });

        return res.status(201).json(
            new ApiResponse(201, usercheck, "User created successfully. Please check your email for verification instructions.")
        );

    } catch (emailError) {
        await prisma.user.delete({ where: { id: user.id } });
        console.error("Email sending error:", emailError);
        throw new ApiError(500, "Error sending verification email. Please try again.");
    }
});

// User Login
const loginUser = asyncHandler(async (req,res) => {
    const {email,password} = req.body;
    if(!email){
        throw new ApiError(400,"username or email is required");
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: email.toLowerCase() },
          { email: email.toLowerCase() }
        ]
      }
    });
    
    if(!user){
        throw new ApiError(400,"user not found");
    }

    if (!user.email.toLowerCase().endsWith('@iiita.ac.in')) {
        throw new ApiError(403, "Login is only allowed for IIITA students");
    }

    const ispassvalid = await isPasswordCorrect(password, user.password);
    if(!ispassvalid){
        throw new ApiError(401,"invalid password");
    }

    const {accessToken, refreshToken} = await generateAccessTokenAndRefreshTokens(user.id);

    const loggedinUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, fullname: true, email: true, username: true, roll_no: true, phone_number: true, isVerified: true, achievements: true, description: true, createdAt: true, updatedAt: true
      }
    });

    const options = {
        httpOnly: true,
        secure: true, 
        sameSite: "none", 
    };

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(
        200,
        {
          user:loggedinUser,
          accessToken,
          refreshToken
        },
        "user loggin in succesfully",
    ))
});

// Verify Email Token
const verifyEmail = asyncHandler(async (req, res) => {
    const { token, email } = req.body;

    if (!token || !email) {
        throw new ApiError(400, "Token and email are required");
    }

    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() }
      }
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired verification token");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    const verifiedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, fullname: true, email: true, username: true, roll_no: true, phone_number: true, isVerified: true, achievements: true, description: true, createdAt: true, updatedAt: true
      }
    });

    return res.status(200).json(
        new ApiResponse(200, verifiedUser, "Email verified successfully")
    );
});

// Resend Verification Email
const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) {
        return res.status(200).json(
            new ApiResponse(200, {}, "If an account exists with this email, a verification token has been sent")
        );
    }

    if (user.isVerified) {
        throw new ApiError(400, "Email is already verified");
    }

    const emailVerificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    const verificationMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Email Verification</h1>
        <p>Hello ${user.fullname},</p>
        <p>Here is your new verification code:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #007bff;">
                ${emailVerificationToken}
            </div>
        </div>
        <p><strong>⏰ This verification code will expire in 24 hours.</strong></p>
    </div>
    `;

    try {
        const transporter = createEmailTransporter();
        await transporter.sendMail({
            from: `"Smart-Sac" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Verify Your Email Address',
            html: verificationMessage
        });

        return res.status(200).json(
            new ApiResponse(200, {}, "Verification email sent successfully")
        );
    } catch (error) {
        console.error("Email sending error:", error);
        throw new ApiError(500, "Error sending verification email");
    }
});

const logoutUser = asyncHandler(async(req,res)=> {
    const userId = req.user?._id || req.user?.id || req.body?.user;
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
    
    const options = {
        httpOnly: true,
        secure: true, 
        sameSite: "none", 
    };

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json({ message: "User logged out successfully" });
});

const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(500,"generating refresh token failed");
    }

    try {
        if (!process.env.REFRESH_TOKEN_SECRET) {
          throw new ApiError(500, "Server misconfiguration: missing REFRESH_TOKEN_SECRET");
        }
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await prisma.user.findUnique({ where: { id: decodedToken?._id || decodedToken?.id }});
        if(!user){
            throw new ApiError(401,"invalid refresh token");
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"not same");
        }
        const options = {
            httpOnly: true,
            secure: true, 
            sameSite: "none", 
        };

        const {accessToken, refreshToken} = await generateAccessTokenAndRefreshTokens(user.id);
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(new ApiResponse(
            200,
            { accessToken, refreshToken },
            "user logged in successfully",
        ))
    } catch (error) {
        throw new ApiError(501, error?.message || "Internal Error");
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword,newPassword} = req.body;
    const userId = req.user?._id || req.user?.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    const isPassCorrect = await isPasswordCorrect(oldPassword, user.password);
    if(!isPassCorrect) throw new ApiError(400,"invalid old password");
    
    const hashedNewPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });
    
    return res.status(200).json(new ApiResponse(200,{},"password changed"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return res.status(200).json(
      new ApiResponse(200, {}, "If an account exists with this email, a password reset token has been sent")
    );
  }

  const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Password Reset Token</h1>
      <p>Hello ${user.fullname || 'User'},</p>
      <p>You requested a password reset. Please use the following token to reset your password:</p>
      
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px;">
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #007bff;">
          ${resetToken}
        </div>
      </div>
      <p><strong>⏰ This token will expire in 10 minutes.</strong></p>
    </div>
  `;

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: `"Smart-Sac" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Token',
      html: message
    })

    return res.status(200).json(
      new ApiResponse(200, {}, "If an account exists with this email, a password reset token has been sent")
    );
  } catch (error) {
    console.error("Email sending error:", error);
    throw new ApiError(500, "Error sending email. Please check server logs.");
  }
});

const verifyResetToken = asyncHandler(async (req, res,next) => {
  const { token } = req.body;
  if (!token) {
    throw new ApiError(400, "Token is required");
  }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() }
    }
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  return res.status(200).json(
    new ApiResponse(200, { verified: true, token }, "Token verified successfully")
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token) throw new ApiError(400, "Reset token is missing");
  if (!newPassword || !confirmPassword) throw new ApiError(400, "Token and passwords are required");
  if (newPassword !== confirmPassword) throw new ApiError(400, "Passwords do not match");

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
      throw new ApiError(400, "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character");
  }

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() }
    }
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      refreshToken: null
    }
  });

  return res.status(200).json(
    new ApiResponse(200, {}, "Password reset successful. Please login with your new password.")
  );
});

const getCurrentUser = asyncHandler(async(req,res) => {
    const userId = req.user?._id || req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        games: { include: { game: true } }
      }
    });
    
    // omit sensitive data
    delete user.password;
    delete user.refreshToken;

    const bookedItems = await prisma.equipment.findMany({
      where: { userId: user.id }
    });
    
    return res.status(200).json(
        new ApiResponse(
            200, 
            { 
                userDetails: user, 
                bookedItems,
            },
            "Current user and booked items fetched successfully"
        )
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const allowedFields = ["phone_number", "fullname", "roll_no", "achievements"];
  const updates = {};
  
  for (const field of allowedFields) {
    if (req.body[field] && req.body[field].toString().trim() !== "") {
      updates[field] = req.body[field];
    }
  }

  if (updates.phone_number) {
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(updates.phone_number)) {
        throw new ApiError(400, "Phone number must be 10 digits");
    }
    const existingPhone = await prisma.user.findFirst({
      where: {
        phone_number: updates.phone_number,
        id: { not: userId }
      }
    });
    if (existingPhone) throw new ApiError(409, "Phone number already in use");
  }

  if (req.body.email) {
    let email = req.body.email.toLowerCase().trim();
    if (!email.endsWith('@iiita.ac.in')) {
      throw new ApiError(400, "Only IIITA student email IDs (@iiita.ac.in) are allowed");
    }
    const existingEmail = await prisma.user.findFirst({
      where: { email, id: { not: userId } }
    });
    if (existingEmail) throw new ApiError(409, "Email already in use");
    updates.email = email;
  }

  const userGames = req.body.games;
  if (userGames) {
    if (!Array.isArray(userGames)) throw new ApiError(400, "Games must be an array");
    for (const g of userGames) {
      if (!g.game || g.rating === undefined) {
        throw new ApiError(400, "Each game must include both game and rating");
      }
      if (typeof g.rating !== "number" || g.rating < 0 || g.rating > 5) {
        throw new ApiError(400, "Game rating must be a number between 0 and 5");
      }
    }
  }

  if (Object.keys(updates).length === 0 && !userGames) {
    throw new ApiError(400, "At least one field is required to update");
  }

  // Handle Game updates using transaction
  const updatedUser = await prisma.$transaction(async (tx) => {
    let user = await tx.user.update({
      where: { id: userId },
      data: updates
    });

    if (userGames) {
      // Clear existing ratings
      await tx.userGameRating.deleteMany({ where: { userId: user.id }});
      
      // Add new ratings
      for (const g of userGames) {
        await tx.userGameRating.create({
          data: {
            userId: user.id,
            gameId: g.game,
            rating: g.rating
          }
        });
      }
    }
    
    return tx.user.findUnique({
      where: { id: userId },
      include: { games: { include: { game: true } } }
    });
  });

  return res.status(200).json(new ApiResponse(200, updatedUser, "Account details updated successfully"));
});

const dashboardDetails = asyncHandler(async (req,res)=>{
  const user = req.user;
  const userId = user?._id || user?.id;
  if(!userId) throw new ApiError(500, "no user found");

  const [
    numberOfUnreadMessages,
    numberOfOpenTickets,
    equipment,
    announcements
  ] = await Promise.all([
    prisma.message.count({ where: { receiverId: userId, status: { notIn: ["read", "unsent"] } } }),
    prisma.ticket.count({ where: { senderId: userId, status: "open" } }),
    prisma.equipment.findMany({ include: { user: { select: { fullname: true, phone_number: true } } } }),
    prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 2 })
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { unreadMessages: numberOfUnreadMessages, openTickets: numberOfOpenTickets, equipment, announcements },
      "Dashboard details sent"
    )
  );
});

const getAllPlayers = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const players = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: {
      id: true,
      fullname: true,
      games: { include: { game: { select: { name: true } } } }
    }
  });

  if (!players) {
    throw new ApiError(404, "No players found");
  }
  return res.status(200).json(new ApiResponse(200, players, "Players fetched successfully"));
});

const getPlayers = asyncHandler(async (req, res) => {
  const { gameIds } = req.query;
  const userId = req.user?._id || req.user?.id;

  if (!gameIds) {
    throw new ApiError(400, "Please provide at least one game ID in query (e.g. ?gameIds=id1,id2)");
  }

  const gameIdArray = gameIds.split(",");

  const players = await prisma.user.findMany({
    where: {
      id: { not: userId },
      games: { some: { gameId: { in: gameIdArray } } }
    },
    select: {
      id: true,
      fullname: true,
      games: { include: { game: { select: { name: true } } } }
    }
  });

  if (!players || players.length === 0) {
    throw new ApiError(404, "No players found for the specified games");
  }

  return res.status(200).json(new ApiResponse(200, players, "Players fetched successfully"));
});

const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content } = req.body;
  const senderId = req.user?._id || req.user?.id;

  if (!receiverId || !content) {
    throw new ApiError(400, "Receiver ID and content are required");
  }

  const uniqueId = randomBytes(16).toString('hex');

  const message = await prisma.message.create({
    data: {
      id: uniqueId,
      senderId: senderId,
      receiverId: receiverId,
      content: content,
      status: "sent"
    }
  });

  return res.status(201).json(new ApiResponse(201, message, "Message sent successfully"));
});

const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;

  // We rewrite the aggregate pipeline to Prisma equivalent
  // using queryRaw since Prisma lacks grouped aggregations of complex relation data natively easily.
  const conversationsRaw = await prisma.$queryRaw`
    WITH RankedMessages AS (
      SELECT 
        m.*,
        CASE WHEN m."senderId" = ${userId} THEN m."receiverId" ELSE m."senderId" END as "otherUserId",
        ROW_NUMBER() OVER (
          PARTITION BY CASE WHEN m."senderId" = ${userId} THEN m."receiverId" ELSE m."senderId" END
          ORDER BY m."createdAt" DESC
        ) as rn
      FROM "Message" m
      WHERE m."senderId" = ${userId} OR m."receiverId" = ${userId}
    )
    SELECT 
      rm.*,
      (SELECT count(*) FROM "Message" m2 WHERE m2."receiverId" = ${userId} AND m2."senderId" = rm."otherUserId" AND m2.status = 'received') as "unreadCount",
      u.fullname as "otherUser_fullname"
    FROM RankedMessages rm
    JOIN "User" u ON u.id = rm."otherUserId"
    WHERE rm.rn = 1
    ORDER BY rm."createdAt" DESC
  `;

  // Format the raw output to match the previous frontend structure
  const formattedConversations = conversationsRaw.map(conv => ({
    otherUser: {
      id: conv.otherUserId,
      fullname: conv.otherUser_fullname,
      sport: "N/A" // Simplified here as getting specific first game is complex in raw query
    },
    lastMessage: conv.content,
    lastMessageStatus: conv.status,
    lastMessageSender: conv.senderId,
    lastMessageCreatedAt: conv.createdAt,
    unreadCount: Number(conv.unreadCount)
  }));

  return res.status(200).json(new ApiResponse(200, formattedConversations, "Conversations fetched successfully"));
});

const getMessages = asyncHandler(async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user?._id || req.user?.id;

  if (!otherUserId) throw new ApiError(400, "The other user's ID is required");

  // Mark all messages from this user as "read"
  await prisma.message.updateMany({
    where: { receiverId: userId, senderId: otherUserId, status: "received" },
    data: { status: "read" }
  });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    sender: msg.senderId,
    content: msg.content,
    createdAt: msg.createdAt,
    status: msg.status
  }));

  return res.status(200).json(new ApiResponse(200, formattedMessages, "Messages fetched successfully"));
});

const newEquipmentTicket = asyncHandler(async (req, res) => {
  const { equipment, game, heading, details } = req.body;
  const user = req.user;
  const userId = user?._id || user?.id;

  if (!equipment || !game || !heading || !details) {
    throw new ApiError(400, "All fields are required");
  }

  const ticket = await prisma.ticket.create({
    data: {
      heading,
      content: details,
      senderId: userId
    }
  });

  const message = `
    <h2>New Equipment Request</h2>
    <p><strong>Game:</strong> ${game}</p>
    <p><strong>Equipment:</strong> ${equipment}</p>
    <p><strong>Heading:</strong> ${heading}</p>
    <p><strong>Details:</strong> ${details}</p>
    <p><em>Requested by:</em> ${user.fullname || user.email}</p>
  `;

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: '"Smart-Sac" <' + process.env.EMAIL_USER + '>',
      to: process.env.SPORTS_HEAD_EMAIL,
      subject: "New Equipment Request",
      html: message,
    });
    res.status(200).json(new ApiResponse(200, { ticketId: ticket.id }, "New equipment ticket sent successfully"));
  } catch (error) {
    throw new ApiError(500, "Failed to send email");
  }
});

const brokenEquipmentTicket = asyncHandler(async (req, res) => {
  const { equipmentId, heading, content } = req.body;
  const user = req.user;
  const userId = user?._id || user?.id;

  if (!equipmentId || !heading || !content) {
    throw new ApiError(400, "All fields are required");
  }

  const equipmentData = await prisma.equipment.findUnique({ where: { id: equipmentId }});
  if (!equipmentData) throw new ApiError(404, "Equipment not found");

  const ticket = await prisma.ticket.create({
    data: {
      heading,
      content,
      equipmentId: equipmentData.id,
      senderId: userId
    }
  });

  const message = `
    <h2>Broken Equipment Report</h2>
    <p><strong>Equipment:</strong> ${equipmentData.name}</p>
    <p><strong>Heading:</strong> ${heading}</p>
    <p><strong>Details:</strong> ${content}</p>
    <p><em>Reported by:</em> ${user.fullname || user.email}</p>
  `;

  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: '"Smart-Sac" <' + process.env.EMAIL_USER + '>',
      to: process.env.SPORTS_HEAD_EMAIL,
      subject: "Broken Equipment Report",
      html: message,
    });
    res.status(200).json(new ApiResponse(200, { ticketId: ticket.id }, "Broken equipment report sent successfully"));
  } catch (error) {
    throw new ApiError(500, "Failed to send email");
  }
});

const getGames = asyncHandler(async (req, res) => {
  const games = await prisma.game.findMany();
  return res.status(200).json(new ApiResponse(200, games, "Games fetched successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    updateAccountDetails,
    getCurrentUser,
    changeCurrentPassword,
    forgotPassword,
    verifyResetToken,
    refreshAccessToken,
    resetPassword,
    dashboardDetails,
    getAllPlayers,
    getPlayers,
    sendMessage,
    getConversations,
    getMessages,
    getGames,
    brokenEquipmentTicket,
    newEquipmentTicket,
    verifyEmail,
    resendVerificationEmail
};
