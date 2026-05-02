import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { prisma } from "../db/index.js";
import { generateAccessToken, generateRefreshToken } from "../utils/auth.js";

const generateAccessTokenAndRefreshTokens = async (adminId) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    await prisma.admin.update({
      where: { id: adminId },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error while generating tokens");
  }
};

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};

const registerAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    throw new ApiError(401, "Invalid password");
  }

  const existedUser = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (existedUser) {
    throw new ApiError(409, "Admin with this email already exists");
  }

  const admin = await prisma.admin.create({ data: { email: email.toLowerCase() } });
  
  const usercheck = await prisma.admin.findUnique({
    where: { id: admin.id },
    select: { id: true, email: true, createdAt: true, updatedAt: true }
  });

  if (!usercheck) {
    throw new ApiError(500, "Admin was not created");
  }

  return res.status(201).json(new ApiResponse(201, usercheck, "Admin created successfully"));
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshTokens(admin.id);

  res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { admin: { id: admin.id, email: admin.email }, accessToken, refreshToken },
        "Login successful"
      )
    );
});

const logoutAdmin = asyncHandler(async (req, res) => {
  const adminId = req.user?._id || req.user?.id;
  await prisma.admin.update({
    where: { id: adminId },
    data: { refreshToken: null }
  });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Admin logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const admin = await prisma.admin.findUnique({ where: { id: decodedToken?._id || decodedToken?.id }});
    if (!admin) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== admin?.refreshToken) {
      throw new ApiError(401, "Refresh token mismatch");
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshTokens(admin.id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Admin logged in successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const getCurrentAdmin = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const adminId = req.user?._id || req.user?.id;
  const admin = await prisma.admin.update({
    where: { id: adminId },
    data: { email: email.toLowerCase() },
    select: { id: true, email: true, createdAt: true, updatedAt: true }
  });

  return res.status(200).json(new ApiResponse(200, admin, "Account details updated"));
});

const dashboardDetails = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) throw new ApiError(401, "Unauthorized");

  const [equipment, announcements, ticket, equipmentHistory] = await Promise.all([
    prisma.equipment.findMany(),
    prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 2 }),
    prisma.ticket.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.equipmentHistory.findMany({
      orderBy: { changedAt: 'desc' },
      take: 5,
      include: { equipment: { select: { name: true, status: true } }, user: { select: { fullname: true, email: true, roll_no: true } } }
    })
  ]);

  return res.status(200).json(
    new ApiResponse(200, { equipment, announcements, ticket, equipmentHistory }, "Dashboard details sent")
  );
});

const updateEquipment = asyncHandler(async (req, res) => {
  const { status, equipmentid, roll_no, duration } = req.body;

  if (!status) throw new ApiError(400, "Status is required");
  if (!equipmentid) throw new ApiError(400, "Equipment ID is required");

  const equipmentDoc = await prisma.equipment.findUnique({ where: { id: equipmentid }});
  if (!equipmentDoc) throw new ApiError(404, "Equipment not found");

  let user = null;
  let registered = false;
  let newStatusMap = status === "in-use" ? "in_use" : status;

  if (status === "in-use") {
    if (!roll_no || !duration) {
      throw new ApiError(400, "roll_no and duration are required for in-use status");
    }

    user = await prisma.user.findFirst({ where: { roll_no }});
    
    await prisma.equipmentHistory.create({
      data: {
        equipmentId: equipmentDoc.id,
        status: equipmentDoc.status,
        userId: equipmentDoc.userId,
        roll_no: equipmentDoc.roll_no || null,
        duration: equipmentDoc.duration || null,
        changedAt: new Date(),
        expireAt: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000) // Approx 3 months
      }
    });

    if (user) {
      registered = true;
      equipmentDoc.userId = user.id;
      equipmentDoc.roll_no = user.roll_no;
    } else {
      registered = true;
      equipmentDoc.userId = null;
      equipmentDoc.roll_no = roll_no;
    }
    equipmentDoc.duration = duration;
    equipmentDoc.status = "in_use";
  } else {
    await prisma.equipmentHistory.create({
      data: {
        equipmentId: equipmentDoc.id,
        status: equipmentDoc.status,
        userId: equipmentDoc.userId,
        roll_no: equipmentDoc.roll_no || null,
        duration: equipmentDoc.duration || null,
        changedAt: new Date(),
        expireAt: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000)
      }
    });

    equipmentDoc.userId = null;
    equipmentDoc.duration = null;
    equipmentDoc.roll_no = null;
    equipmentDoc.status = newStatusMap;
  }

  const updatedEquipment = await prisma.equipment.update({
    where: { id: equipmentDoc.id },
    data: {
      userId: equipmentDoc.userId,
      duration: equipmentDoc.duration,
      roll_no: equipmentDoc.roll_no,
      status: equipmentDoc.status
    }
  });

  const responseData = {
    equipment: updatedEquipment,
    registered,
    user: user ? user : { roll_no },
  };

  return res.status(200).json(new ApiResponse(200, responseData, "Equipment updated successfully"));
});

const getEquipment = asyncHandler(async (req, res) => {
  const equipments = await prisma.equipment.findMany();
  return res.status(200).json(new ApiResponse(200, equipments, "Equipments fetched successfully"));
});

const addGame = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Game name is required");
  }

  const key = name.toLowerCase().trim();
  const existingGame = await prisma.game.findUnique({ where: { name: key } });
  if (existingGame) {
    throw new ApiError(409, "Game with this name already exists");
  }

  const game = await prisma.game.create({ data: { name: key } });
  return res.status(201).json(new ApiResponse(201, game, "Game created successfully"));
});

const removeGame = asyncHandler(async (req, res) => {
  const { name } = req.query;

  if (!name || !name.trim()) {
    throw new ApiError(400, "Game name is required");
  }

  const key = String(name).toLowerCase().trim();
  const game = await prisma.game.findUnique({ where: { name: key }, include: { equipments: true } });
  if (!game) {
    throw new ApiError(404, "Game not found");
  }

  const equipmentIds = game.equipments.map(e => e.id);
  await prisma.equipment.deleteMany({ where: { id: { in: equipmentIds } } });
  await prisma.game.delete({ where: { id: game.id } });

  return res.status(200).json(new ApiResponse(200, null, "Game and associated equipment removed successfully"));
});

const addEquipment = asyncHandler(async (req, res) => {
  const { gameName, name } = req.body;

  if (!gameName || !name) {
    throw new ApiError(400, "Both gameName and equipment name are required");
  }

  const game = await prisma.game.findUnique({ where: { name: gameName.toLowerCase().trim() } });
  if (!game) {
    throw new ApiError(404, "Game not found");
  }

  const equipment = await prisma.equipment.create({
    data: {
      name: name.toLowerCase().trim(),
      games: { connect: { id: game.id } }
    }
  });

  return res.status(201).json(new ApiResponse(201, { equipment, game }, "Equipment added to game successfully"));
});

const removeEquipment = asyncHandler(async (req, res) => {
  const { gameName, name } = req.query;

  if (!gameName || !name) {
    throw new ApiError(400, "Both gameName and equipment name are required");
  }

  const game = await prisma.game.findUnique({ where: { name: String(gameName).toLowerCase().trim() }, include: { equipments: true } });
  if (!game) {
    throw new ApiError(404, "Game not found");
  }

  const equipment = await prisma.equipment.findUnique({ where: { name: String(name).toLowerCase().trim() }});
  if (!equipment) {
    throw new ApiError(404, "Equipment not found");
  }

  const isAssociated = game.equipments.some(e => e.id === equipment.id);
  if (!isAssociated) {
    throw new ApiError(400, "Equipment not associated with this game");
  }

  await prisma.game.update({
    where: { id: game.id },
    data: { equipments: { disconnect: { id: equipment.id } } }
  });
  
  await prisma.equipment.delete({ where: { id: equipment.id }});

  const updatedGame = await prisma.game.findUnique({ where: { id: game.id }, include: { equipments: true } });

  return res.status(200).json(
    new ApiResponse(200, { game: updatedGame, removedEquipment: equipment }, "Equipment removed successfully")
  );
});

const makeAnnouncement = asyncHandler(async (req, res) => {
  const { heading, content, footer, expiresIn } = req.body;

  if (!heading || !content) {
    throw new ApiError(400, "Heading and content are required");
  }

  const daysToExpire = expiresIn && !isNaN(expiresIn) ? Number(expiresIn) : 90;
  if (daysToExpire <= 0) {
    throw new ApiError(400, "expiresIn must be a positive number of days");
  }

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysToExpire);

  const announcement = await prisma.announcement.create({
    data: {
      heading: heading.trim(),
      content: content.trim(),
      footer: footer?.trim() || "",
      expireAt: expirationDate,
    }
  });

  return res.status(201).json(
    new ApiResponse(201, announcement, 'Announcement created successfully (expires in ' + daysToExpire + ' days)')
  );
});

const getAnnouncements = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
  });

  return res.status(200).json(
    new ApiResponse(200, { announcements, currentPage: page }, "Announcements fetched successfully")
  );
});

const getNoOfAnnouncements = asyncHandler(async (req, res) => {
  const totalAnnouncements = await prisma.announcement.count();
  const limit = 10;
  const totalPages = Math.ceil(totalAnnouncements / limit);

  return res.status(200).json(
    new ApiResponse(200, { totalAnnouncements, totalPages }, "Announcement count fetched successfully")
  );
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const announcement = await prisma.announcement.findUnique({ where: { id }});
  if (!announcement) {
    throw new ApiError(404, "Announcement not found");
  }

  await prisma.announcement.delete({ where: { id } });

  return res.status(200).json(new ApiResponse(200, null, "Announcement deleted successfully"));
});

const updateTicket = asyncHandler(async (req, res) => {
  const { ticketId, newStatus } = req.body;
  if (!ticketId || !newStatus) {
    throw new ApiError(400, "Ticket ID and new status are required");
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }});
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  const allowedStatuses = ["in-process", "open", "closed"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new ApiError(400, "Invalid status value");
  }

  let mappedStatus = newStatus === "in-process" ? "in_process" : newStatus;

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: mappedStatus }
  });

  return res.status(200).json(
    new ApiResponse(200, updatedTicket, "Ticket status updated to '" + newStatus + "' successfully")
  );
});

const getNoOfActiveTickets = asyncHandler(async (req, res) => {
  const totalTickets = await prisma.ticket.count({
    where: { status: { in: ["in_process", "open"] } },
  });

  const limit = 10;
  const totalPages = Math.ceil(totalTickets / limit);

  return res.status(200).json(
    new ApiResponse(200, { totalTickets, totalPages }, "Active ticket count fetched successfully")
  );
});

const getActiveTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const tickets = await prisma.ticket.findMany({
    where: { status: { in: ["in_process", "open"] } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      sender: { select: { fullname: true, roll_no: true, email: true } },
      equipment: { select: { name: true } }
    }
  });

  return res.status(200).json(
    new ApiResponse(200, { tickets, currentPage: page }, "Active tickets fetched successfully")
  );
});

const getRecentEquipmentHistory = asyncHandler(async (req, res) => {
  const history = await prisma.equipmentHistory.findMany({
    orderBy: { changedAt: 'desc' },
    take: 10,
    include: {
      equipment: { select: { name: true, status: true } },
      user: { select: { fullname: true, email: true, roll_no: true } }
    }
  });

  return res.status(200).json(
    new ApiResponse(200, { history, count: history.length }, "Recent equipment history fetched successfully")
  );
});

const getEquipmentRecentHistoryDict = asyncHandler(async (req, res) => {
  const equipments = await prisma.equipment.findMany({ select: { id: true, name: true }});

  const equipmentHistoryDict = {};

  for (const eq of equipments) {
    const recentHistory = await prisma.equipmentHistory.findMany({
      where: { equipmentId: eq.id },
      orderBy: { changedAt: 'desc' },
      take: 10,
      include: { user: { select: { fullname: true, email: true, roll_no: true } } }
    });
    equipmentHistoryDict[eq.name] = recentHistory;
  }

  return res.status(200).json(
    new ApiResponse(200, equipmentHistoryDict, "Recent 10 history entries per equipment fetched successfully")
  );
});

const getNoOfEquipmentHistory = asyncHandler(async (req, res) => {
  const { equipmentId } = req.params;

  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }});
  if (!equipment) throw new ApiError(404, "Equipment not found");

  const totalHistory = await prisma.equipmentHistory.count({ where: { equipmentId }});
  const limit = 10;
  const totalPages = Math.ceil(totalHistory / limit);

  return res.status(200).json(
    new ApiResponse(200, { totalHistory, totalPages }, "Equipment history count fetched successfully")
  );
});

const getEquipmentHistory = asyncHandler(async (req, res) => {
  const { equipmentId } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId }});
  if (!equipment) throw new ApiError(404, "Equipment not found");

  const history = await prisma.equipmentHistory.findMany({
    where: { equipmentId },
    orderBy: { changedAt: 'desc' },
    skip,
    take: limit,
    include: { user: { select: { fullname: true, email: true, roll_no: true } } }
  });

  return res.status(200).json(
    new ApiResponse(200, { history, currentPage: page }, "Equipment history fetched successfully")
  );
});

export {
  loginAdmin,
  logoutAdmin,
  refreshAccessToken,
  updateAccountDetails,
  getCurrentAdmin,
  registerAdmin,
  dashboardDetails,
  updateEquipment,
  addGame,
  removeGame,
  addEquipment,
  removeEquipment,
  makeAnnouncement,
  getAnnouncements,
  getNoOfAnnouncements,
  deleteAnnouncement,
  updateTicket,
  getNoOfActiveTickets,
  getActiveTickets,
  getRecentEquipmentHistory,
  getEquipmentRecentHistoryDict,
  getNoOfEquipmentHistory,
  getEquipmentHistory,
  getEquipment
};
