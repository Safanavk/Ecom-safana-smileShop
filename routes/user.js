const express = require('express');
const router = express.Router();
const passport = require('../config/passport-config');
const userCtrl = require('../controllers/userCtrl')
const usersideCtrl = require('../controllers/usersideCtrl');
const Product = require('../model/productSchema')
const addressCtrl = require('../controllers/addressCtrl'); 
const orderCtrl = require('../controllers/orderCtrl');
const { checkProductExists } = require('../middlewares/auth'); 

router.get('/pagenotfound',userCtrl.pageNotFound);
// Define your user routes here
router.get('/',userCtrl.getHomePage);
router.get('/login',userCtrl.getLoginPage);
router.get('/signup',userCtrl.getSignupPage);
router.post('/signup',userCtrl.newUserRegistration);
router.post('/auth/verify-otp', userCtrl.verifyOtp);
router.post('/auth/resend', userCtrl.resendOtp);
router.post('/auth/login', userCtrl.loginUser);
router.get('/auth/logout', userCtrl.logoutUser);



// Google OAuth Routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    req.session.user = req.user; // Ensure user is set in session
    res.redirect('/');
});

// Product Page
router.get('/products', usersideCtrl.getProducts);
router.get('/products/:id', checkProductExists ,usersideCtrl.getProductDetails); // Apply middleware here


// Forgot Password
router.get('/forgot-pass', userCtrl.getForgotPasswordPage);
router.post('/auth/forgot-pass', userCtrl.handleForgotPassword);
router.get('/reset', userCtrl.handleResetPasswordPageAndRequest);
router.post('/auth/reset', userCtrl.handleResetPasswordPageAndRequest);


//profile

router.get('/profile', userCtrl.profile)
router.post('/profile/update', userCtrl.updateProfile);
router.get('/orders', userCtrl.orders)
router.get('/address', addressCtrl.getAddresses);
router.post('/address', addressCtrl.addAddress);
router.delete('/address/:id', addressCtrl.deleteAddress);
router.get('/address/edit/:id',addressCtrl.getEditAddress); // Fetch address to edit
router.post('/address/edit/:id', addressCtrl.updateAddress);
router.get('/wallet', userCtrl.wallet)


// Cart Routes
router.get('/cart/data', userCtrl.getCart);
router.post('/check-cart',userCtrl.checkCart);
router.post('/add-to-cart',userCtrl.addToCart);
router.post('/cart/remove/:id', userCtrl.removeFromCart);
router.post('/cart/update/:productId', userCtrl.updateCartQuantity);
router.get('/api/product/:productId/variant/:size',userCtrl.getProductVariant);

router.get('/checkout', orderCtrl.checkout);
router.post('/orders', orderCtrl.createOrder);
router.get('/confirm', orderCtrl.orderConfirm);
router.get('/get/orders', orderCtrl.getUserOrders);
router.get('/orders/:id', orderCtrl.getOrderDetails);


module.exports = router;
