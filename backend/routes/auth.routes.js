const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth");
const { validate, schemas } = require("../middleware/validate");
const rateLimiter = require("../middleware/rateLimiter");

// Public
router.post("/register", rateLimiter.auth, validate(schemas.register), authController.register);
router.post("/login",    rateLimiter.auth, validate(schemas.login),    authController.login);
router.post("/refresh",  authController.refreshToken);
router.post("/forgot-password", rateLimiter.passwordReset, validate(schemas.forgotPassword), authController.forgotPassword);
router.patch("/reset-password/:token", validate(schemas.resetPassword), authController.resetPassword);
router.get("/verify-email/:token", authController.verifyEmail);

// Protected
router.use(protect);
router.post("/logout", authController.logout);
router.get("/me",      authController.getMe);

module.exports = router;
