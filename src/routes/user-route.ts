import Router from "express";
import { createToken, userLogin, userSignup } from "../controller/user-controller";
const router = Router();

router.route("/signup").post(userSignup);
router.route("/login").post(userLogin);
router.route("/token").post(createToken);

export default router;