import { Router } from "express";
import { registerUser ,loginUser ,logoutUser ,refreshAccessToken,getCurrentUser} from "../../controllers/auth.controller.js";
import {upload} from "../../middlewares/multer.middleware.js"
import { verifyJWT } from "../../middlewares/auth.middleware.js";
const router = Router()

router.route("/register").post(
    upload.fields([
    {
        name:"avatar",
        maxCount: 1
    },
    {
        name:"cover_image",
        maxCount: 1

    }
    ]),
    registerUser)
router.route("/login").post(loginUser)
// secure route
router.route("/logout").post(verifyJWT ,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/profile").get(verifyJWT,getCurrentUser)




export default router

