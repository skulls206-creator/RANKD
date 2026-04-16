import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fairlaunchRouter from "./fairlaunch";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(fairlaunchRouter);
router.use(adminRouter);

export default router;
