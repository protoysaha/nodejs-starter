import { Router } from "express";
import { changeCurrentPassword,updateUserDetails,updateUserAvatar,updateUserCoverImage} from "../../controllers/user.controller.js";
import {upload} from "../../middlewares/multer.middleware.js"
import { verifyJWT } from "../../middlewares/auth.middleware.js";
const router = Router()


// Protected routes 

router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/update-profile").patch(verifyJWT,updateUserDetails)
router.route("/update-avatar").patch(
  verifyJWT,
  upload.single("avatar"),   
  updateUserAvatar           
);
router.route("/update-cover-image").patch(verifyJWT, upload.single("cover_image"), updateUserCoverImage);



export default router

