import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import cartRouter from "./cart";
import wishlistRouter from "./wishlist";
import ordersRouter from "./orders";
import reviewsRouter from "./reviews";
import addressesRouter from "./addresses";
import couponsRouter from "./coupons";
import sellerRouter from "./seller";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(wishlistRouter);
router.use(ordersRouter);
router.use(reviewsRouter);
router.use(addressesRouter);
router.use(couponsRouter);
router.use(sellerRouter);
router.use(adminRouter);

export default router;
