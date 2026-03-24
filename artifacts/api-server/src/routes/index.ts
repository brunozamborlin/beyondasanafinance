import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import productsRouter from "./products";
import paymentsRouter from "./payments";
import teachersRouter from "./teachers";
import otherCostsRouter from "./otherCosts";
import summaryRouter from "./summary";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(paymentsRouter);
router.use(teachersRouter);
router.use(otherCostsRouter);
router.use(summaryRouter);
router.use(settingsRouter);

export default router;
