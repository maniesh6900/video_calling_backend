import Router from "express";
import { createToken} from "../controller/tokenController";
const router = Router();


router.route("/token").post(createToken);

export default router;