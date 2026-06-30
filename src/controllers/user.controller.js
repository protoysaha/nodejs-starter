import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";
import { deleteFile } from "../utils/deleteFile.js";

const generateAccessAndRefereshTokens = async (userId) => {
   try {
      const user = await User.findByPk(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()
      user.refresh_token = refreshToken

      await user.save({ validate: false });
      return { accessToken, refreshToken }


   } catch (error) {
      throw new ApiError(500, "Somethins went wrong while generating access and refresh token")
   }
}


const registerUser = asyncHandler(async (req, res) => {
   // res.status(200).json({
   //      message: "ok"
   // })

   const { fullname, email, username, password } = req.body

   if ([fullname, email, username, password].some((field) =>
      field?.trim() === "")
   ) {
      throw new ApiError(400, "all fields are required");

   }
   //   const existedUser = await User.findOne({
   //       $or:[{ username }, { email }]
   //    })

   const existedUser = await User.findOne({
      where: {
         [Op.or]: [{ username }, { email }]
      }
   });

   if (existedUser) {
      throw new ApiError(409, "User with email or username already exists")

   }
   const avatarLocalPath = req.files?.avatar[0]?.path;
   // const coverImageLocalPath = req.files?.cover_image[0]?.path;
   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.cover_image) && req.files.cover_image.length > 0) {

      coverImageLocalPath = req.files.cover_image[0].path

   }
   if (!avatarLocalPath) {

      throw new ApiError(400, "avatar file is required")

   }
   const user = await User.create({
      fullname,
      avatar: avatarLocalPath,
      cover_image: coverImageLocalPath || "",
      email,
      password,
      username: username.toLowerCase(),
      role_id: 3,      // ✅ default role = "user"
      is_active: 1
   })
   // const createdUser = await User.findById(user.id).select(
   //    "-password -refresh_token" 
   // )
   const createdUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password', 'refresh_token'] }
   });

   if (!createdUser) {

      throw new ApiError(500, "Something went wrong while register the user")

   }

   return res.status(201).json(
      new ApiResponse(200, createdUser, "User registerd Successfully")
   )






})



const loginUser = asyncHandler(async (req, res) => {

   const { email, username, password } = req.body

   console.log(email);


   // if (!username && !email) {
   //    throw new ApiError(400, "username or email is required")

   // }

   if (!(username || email)) {
      throw new ApiError(400, "username or email is required")

   }

   // username and  email both required

   // const user = await User.findOne({
   //    where: {
   //       [Op.or]: [{ username }, { email }]
   //    }
   // });

   // username or email
   const whereClause = [];
   if (username) whereClause.push({ username });
   if (email) whereClause.push({ email });

   const user = await User.findOne({
      where: {
         [Op.or]: whereClause
      }
   });


   if (!user) {
      throw new ApiError(404, "User does not exist")

   }
   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
      throw new ApiError(401, "Invalid user credentials")
   }

   const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user.id)

   const loggedInUser = await await User.findByPk(user.id, {
      attributes: { exclude: ['password', 'refresh_token'] }
   });

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new ApiResponse(200,
            {
               user: loggedInUser, accessToken,
               refreshToken
            },
            "User logged in Successfully"
         )
      )


})


const logoutUser = asyncHandler(async (req, res) => {

   // User.findByAndUpdate( req.user.id,{
   //    $set:{
   //       refreshToken:undefined
   //    }
   // },
   // {
   //    new:true
   // }
   // )

   await User.update(
      { refresh_token: null },
      { where: { id: req.user.id } }
   );

   const options = {
      httpOnly: true,
      secure: true
   }

   return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(
         new ApiResponse(200,
            {},
            "User logged out Successfully"
         )
      )

})

const refreshAccessToken = asyncHandler(async (req, res) => {

   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request")
   }

   try {
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);


      const user = await User.findByPk(decodedToken?.id, {
         attributes: { exclude: ['password'] }
      });


      if (!user) {

         throw new ApiError(401, "Invalid Refresh Token")
      }
      if (incomingRefreshToken !== user?.refresh_token) {
         throw new ApiError(401, "Refresh token is expired or used")
      }

      const options = {
         httpOnly: true,
         secure: true
      }

      const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user.id)

      return res
         .status(200)
         .cookie("accessToken", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(
            new ApiResponse(200,
               {
                  accessToken,
                  refreshToken: newRefreshToken
               },
               "Access Refreshed Successfully"
            )
         )
   } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")

   }

})


const changeCurrentPassword = asyncHandler(async (req, res) => {

   const { oldPassword, newPassword, confirmPassword } = req.body
   if (!(newPassword === confirmPassword)) {
      throw new ApiError(400, "confirm password does not match")

   }

   const user = await User.findByPk(req.user?.id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {

      throw new ApiError(400, "Invalid old password")

   }
   user.password = newPassword
   await user.save({ validateBeforeSave: false })

   return res
      .status(200)
      .json(
         new ApiResponse(200,
            {},
            "Password set Successfully"
         )
      )

})


const getCurrentUser = asyncHandler(async (req, res) => {

   return res
      .status(200)
      .json(
         new ApiResponse(200,
            req.user,
            "User details fetched successfully"
         )
      )
})


// const updateUserDetails = asyncHandler(async (req, res) => {


//    const { fullname, email } = req.body
//    if (!fullname || !email) {
//       throw new ApiError(400, "All fields are required")

//    }

//    const user = await User.update(
//       { fullname: fullname },
//       { email: email },
//       { where: { id: req.user.id } },
//       { attributes: { exclude: ['password', 'refresh_token'] } }
//    );

//    return res
//       .status(200)
//       .json(
//          new ApiResponse(200,
//             user,
//             "User updated successfully"
//          )
//       )
// })


const updateUserDetails = asyncHandler(async (req, res) => {

   if (!req.body) {
      throw new ApiError(400, "Request body is missing");
   }

   const { fullname, email } = req.body;
   if (!fullname || !email) {
      throw new ApiError(400, "All fields are required");
   }

   const user = await User.update(
      { fullname, email },
      { where: { id: req.user.id } }
   );
   const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refresh_token'] }
   });

   return res
      .status(200)
      .json(
         new ApiResponse(200,
            updatedUser, 
            "User updated successfully"
         )
      );
});


const updateUserAvatar = asyncHandler(async (req, res) => {

   const avatarLocalPath = req.file?.path

   if (!avatarLocalPath) {
      throw new ApiError(400, "avatar file is required")
   }
   const currentUser = await User.findByPk(req.user.id, {
      attributes: ["avatar"],
   });

   await User.update(
      { avatar: avatarLocalPath },
      { where: { id: req.user.id } },
      { attributes: { exclude: ['password', 'refresh_token'] } }
   );

   if (currentUser?.avatar) {
      deleteFile(currentUser.avatar);
   }

   const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refresh_token'] }
   });

   return res
      .status(200)
      .json(
         new ApiResponse(200,
            updatedUser,
            "Avatar updated successfully"
         )
      )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {

   const coverImageLocalPath = req.file?.path
   if (!coverImageLocalPath) {
      throw new ApiError(400, "cover image file is required")
   }

   const currentUser = await User.findByPk(req.user.id, {
      attributes: ["avatar"],
   });

   await User.update(
      { cover_image: coverImageLocalPath },
      { where: { id: req.user.id } },
      { attributes: { exclude: ['password', 'refresh_token'] } }
   );

   if (currentUser?.cover_image) {
      deleteFile(currentUser.cover_image);
   }


   const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refresh_token'] }
   });

   return res
      .status(200)
      .json(
         new ApiResponse(200,
            updatedUser,
            "Cover Image updated successfully"
         )
      )

})

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateUserDetails,
   updateUserAvatar,
   updateUserCoverImage

}