import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fairlaunchRouter from "./fairlaunch";

const router: IRouter = Router();

router.use(healthRouter);
router.use(fairlaunchRouter);

export default router;
