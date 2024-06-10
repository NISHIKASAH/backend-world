import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const userDetails = await User.findById(userId);
    const accessToken = userDetails.generateAccessToken();
    const refreshToken = userDetails.generateRefreshToken();
    //make userLogin till refreshToken is not expired (1oday);
    userDetails.refreshToken = refreshToken;
    await userDetails.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      50,
      "something went wrong while generating acessrefreshToken"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { fullName, email, username, password } = req.body;
  //console.log("email: ", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  //console.log(req.files);

  //here we are taking multiple files(image) in upload (look at upload middleware in routing endpoint)
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while user registration");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req.data
  //username or email not empty
  //get model userdata
  //find user in database
  //verify password
  //generate access and refresh token
  //set cookies

  const { username, email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "username or email is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "user doesnot exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credential");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user login sucessfully"
      )
    );
});

const logOut = async (req, res) => {
  //to acess user details , with help of custom auth middlware
  //delete refreshToken
  //clear cookies
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logout successfully"));
};
const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    //getting a new referesh token  , after accessToke expire
    // and updating user refresh Token/session storage and cookies
    //for keeping user login for a while

    const token = req.cookies?.refreshToken;
    if (!token) {
      throw new ApiError("unAuthroized request");
    }
    const decodeToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodeToken._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError("invalid refresh Token");
    }
    if (user._id !== decodeToken._id) {
      throw new ApiError("token is expired  or used");
    }
    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newrefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "invalid access or refresh Token");
  }
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  //get oldpassword req.user
  //get new password from req.body
  //verify password using ispasswordcorrect
  //change password and update user
  const { oldpassword, newpassword } = req.body;
  if (!oldpassword && !newpassword) {
    throw new ApiError(401, "field cannot be empty");
  }
  const userdetails = await User.findById(req.user._id);

  const passwordValidation = await userdetails.isPasswordCorrect(oldpassword);
  if (!passwordValidation) {
    throw new ApiError(400, " oldpassword is invalid");
  }
  userdetails.password = newpassword;
  await userdetails.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password change successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetch successfully"));
});
const updateAccountDetails = asyncHandler(async (req, res) => {
  //fullname ,email
  //identify user in db and update
  //send response with updated user profile
  const { email, fullName } = req.body;
  if (!email && !password) {
    throw new ApiError(401, "user fieild cannot be empty");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        email: email,
        fullName: fullName,
      },
    },
    {
      new: true,
    }
  ).select("-password ");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "user update successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //get avatarpath
  //update on db
  //upload new path on cloudinary
  //delete the temp store files(avatar)
  const avatarPath = req.file?.path;
  if (!avatarPath) {
    throw new ApiError(401, "user field cannot be empty");
  }
  const avatar = await uploadOnCloudinary(avatarPath);
  if (!avatar.url) {
    throw new ApiError(400, "avatar file is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image is missing");
  }
  const coverImagedetails = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImagedetails.url) {
    throw new ApiError(400, " not upload on cloudinary , no details available");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImagedetails.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  //---using mongoose aggregation pipeline for all operation here
  //filtering User to get userdetail of requested user
  //join user with subscribe model using aggregation pipeline(lookup)
  //adding some field in User model
  //exclduing some field
  //sending a res
  //aggregation pipleline return [{},{}](mostly) or {}
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(404, "channel does not exists");
  }
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        channelSubscriberCount: {
          $size: "$subscribers",
        },
      },
      channelSubscribeToCount: {
        $size: "$subscribedTo",
      },
    },
    {
      isSubscribe: {
        $cond: {
          //id is present inside subscription.subscribe
          if: { $in: [req.user?._id, "$subscribers.subscriber"] },
          then: true,
          else: false,
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        channelSubscriberCount: 1,
        channelSubscribeToCount: 1,
        isSubscribe: 1,
      },
    },
  ]);
  if (!channel) {
    throw new ApiError(404, "channel does not exists");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel[0],
        "User(channel) profil details fetch successfully"
      )
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "Videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipleLine: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipleline: [
                {
                  $project: {
                    fullname: 1,
                    avatar: 1,
                    owner: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHisory,
        "User watchHistory fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logOut,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
