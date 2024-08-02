const User = require('../model/userSchema');
const Otp = require('../model/otpSchema');
const Cart = require('../model/cartSchema')
const { GenerateOtp, sendMail } = require('../helpers/otp-verification');
const Product = require('../model/productSchema');


// Page Not Found
const pageNotFound = async (req, res) => {
    try {
        res.render("404");
    } catch (error) {
        console.log(error.message);
    }
};


// Home Page
const getHomePage = async (req, res) => {
    try {
        const locals = { title: "Ecom Online Store" };
        res.render('index', { title: locals.title, user: req.session.user, admin: req.session.admin });
    } catch (error) {
        console.log("Something went wrong: " + error);
    }
};


const getLoginPage = async (req, res) => {
    try {
        const locals = {
            title: "Login Page"
        };
        if (!req.session.user) {
            res.render("user/login", { title: locals.title });
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.log(error.message);
    }
};

// Go to Signup Page
const getSignupPage = async (req, res) => {
    try {
        const locals = {
            title: "Sign Up Page"
        };
        res.render("user/signup", { title: locals.title });
    } catch (error) {
        console.log(error.message);
    }
};


const bcrypt = require('bcrypt'); // Ensure bcrypt is required

const newUserRegistration = async (req, res) => {
    let { firstname, lastname, mobile, email, password, password2 } = req.body;

    try {
        let errors = [];

        // Check required fields
        if (!firstname || !lastname || !email || !mobile || !password || !password2) {
            errors.push({ msg: 'Please fill in all fields' });
        }

        if (errors.length === 0) {
            // Check passwords match
            if (password !== password2) {
                errors.push({ msg: 'Passwords do not match' });
            }

            const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
            // Check password format
            if (!passwordRegex.test(password)) {
                errors.push({ msg: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
            }

            // Check mobile number
            const mobileRegex = /^\d{10}$/;
            if (!mobileRegex.test(mobile) || mobile === '0000000000') {
                errors.push({ msg: 'Please enter a valid 10-digit mobile number' });
                
            }

            if (errors.length === 0) {
                const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
                if (existingUser) {
                    errors.push({ msg: 'User with this email or mobile number already exists' });
                }
            }
        }

        if (errors.length > 0) {
            return res.render("user/signup", { errors, firstname, lastname, email, mobile });
        }
        const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
        if (existingUser) {
            errors.push({ msg: 'User with this email or mobile number already exists' });
            return res.render("user/signup", { errors, firstname, lastname, email, mobile });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            firstname,
            lastname,
            mobile,
            email,
            password: hashedPassword,
            isBlocked: false,
            isVerified: false,
            isAdmin: false
        });

        const savedUser = await newUser.save();
        if (!savedUser) {
            errors.push({ msg: 'Failed to register user. Please try again.' });
            return res.render("user/signup", { errors, firstname, lastname, email, mobile });
        }

        const otpCode = GenerateOtp();
        const otpData = new Otp({
            userId: savedUser._id,
            otp: otpCode,
            createdAt: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
        });

        await otpData.save();
        const sendmail = await sendMail(email, otpCode);
        if (sendmail) {
            req.session.userOtp = otpCode;
            req.session.userData = savedUser;
            return res.render("user/verifyotp", { email });
        } else {
            errors.push({ msg: 'Failed to send OTP email.' });
            return res.render("user/signup", { errors, firstname, lastname, email, mobile });
        }

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).render("user/signup", { error_msg: 'An error occurred during registration.', firstname, lastname, email, mobile });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, error_msg: "User not found" });
        }

        const otpCode = GenerateOtp();
        const otpData = await Otp.findOneAndUpdate(
            { userId: user._id },
            {
                otp: otpCode,
                createdAt: Date.now(),
                expiresAt: Date.now() + (5 * 60 * 1000)
            },
            { new: true, upsert: true }
        );

        const sendmail = await sendMail(email, otpCode);
        if (sendmail) {
            req.session.userOtp = otpCode;
            req.session.userData = user;
            return res.json({ success: true, success_msg: "OTP resent successfully", email });
        } else {
            return res.json({ success: false, error_msg: "Failed to send OTP email." });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, error_msg: "An error occurred while resending the OTP." });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const { userOtp, userData } = req.session;

        if (otp !== userOtp) {
            return res.status(400).json({ error_msg: "Invalid OTP" });
        }

        const user = await User.findById(userData._id);
        if (!user) {
            return res.status(400).json({ error_msg: "User not found" });
        }

        user.isVerified = true;
        await user.save();
        req.session.userOtp = null;
        req.session.userData = null;
        return res.status(200).json({ success_msg: "Your account has been verified. Please log in." });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error_msg: "An error occurred while verifying the OTP." });
    }
};

// Go to otp page
const getOtpPage = async (req, res) => {
    try {
        const locals = {
            title: "Otp Page"
        };
        res.render("verify-otp", { title: locals.title });
    } catch (error) {
        console.log(error.message);
    }
};



// Login user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render("user/login", { error_msg: "Please fill in both email and password." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.render("user/login", { error_msg: "Invalid email or password." });
        }

        if (!user.isVerified) {
            return res.render("user/login", { error_msg: "Please verify your email first." });
        }

        if (user.isBlocked) {
            return res.render("user/login", { error_msg: "Your account is blocked. Please contact support." });
        }

        const isMatch = await bcrypt.compare(password, user.password); // Add await here
        if (!isMatch) {
            return res.render("user/login", { error_msg: "Invalid email or password." });
        }

        req.session.user = user;
        return res.redirect("/");
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).send("An error occurred during login.");
    }
};

// Logout user
const logoutUser = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log(err.message);
                res.redirect('/');
                return res.status(500).send("An error occurred during logout.");
            }
            res.redirect('/login');
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("An error occurred during logout.");
    }
};


// Forgot Password Page
const getForgotPasswordPage = async (req, res) => {
    try {
        const locals = {
            title: "Forgot Password"
        };
        res.render("user/forgot-password", { title: locals.title });
    } catch (error) {
        console.log(error.message);
    }
};

// Handle Forgot Password Request
const handleForgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.render("user/forgot-password", { error_msg: "No account with that email address exists." });
        }

        const otp = GenerateOtp();
        const otpExpires = Date.now() + (5 * 60 * 1000);

        const newOtp = new Otp({
            userId: user._id,
            otp: otp,
            expiresAt: otpExpires
        });

        await newOtp.save();

        const emailDetails = await sendMail(email, otp);
        if (!emailDetails) {
            return res.render("user/forgot-password", { error_msg: "Failed to send OTP email." });
        }

        res.render("user/reset-password", { success_msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.', title: "Reset Password" });

    } catch (error) {
        console.log(error.message);
        res.status(500).send("An error occurred while processing your request.");
    }
};

// Reset Password Page & Handle Reset Password
const handleResetPasswordPageAndRequest = async (req, res) => {
    try {
        const { otp, password, password2 } = req.body;

        if (!otp || !password || !password2) {
            return res.render("user/reset-password", { error_msg: "Please fill in all fields." });
        }

        if (password !== password2) {
            return res.render("user/reset-password", { error_msg: "Passwords do not match." });
        }

        const otpData = await Otp.findOne({ otp });
        if (!otpData) {
            return res.render("user/reset-password", { error_msg: "Invalid OTP." });
        }

        if (otpData.expiresAt < Date.now()) {
            return res.render("user/reset-password", { error_msg: "OTP has expired." });
        }

        const user = await User.findById(otpData.userId);
        if (!user) {
            return res.render("user/reset-password", { error_msg: "User not found." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        await user.save();

        await Otp.deleteMany({ userId: user._id });

        res.render("user/login", { success_msg: "Password has been reset. Please log in." });

    } catch (error) {
        console.log(error.message);
        res.status(500).send("An error occurred while processing your request.");
    }
};


//profile

const profile = async(req,res)=>{
    try{
        if(!req.session.user){
            res.redirect('/login')
        }
        res.render('user/profile',{
            title: 'User Profile',
            user: req.session.user
        })

    }
    catch(error){
        res.status(400).json({message : "error" })
        console.error(error)
    }
}
const updateProfile = async (req, res) => {
    try {
        const { firstname, lastname, email, mobile } = req.body;
        const userId = req.session.user._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.firstname = firstname;
        user.lastname = lastname;
        user.email = email;
        user.mobile = mobile;

        await user.save();

        req.session.user = user;
        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
const orders = async(req,res)=>{
    try{
        if(!req.session.user){
            res.redirect('/login')
        }
        res.render('user/orders',{
            title: 'Orders',
            user: req.session.user
        })

    }
    catch(error){
        res.status(400).json({message : "error" })
        console.error(error)
    }
}

const wallet = async(req,res)=>{
    try{
        if(!req.session.user){
            res.redirect('/login')
        }
        res.render('user/wallet',{
            title: 'Wallet',
            user: req.session.user
        })

    }
    catch(error){
        res.status(400).json({message : "error" })
        console.error(error)
    }
}


const getCart = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const cart = await Cart.findOne({ user: req.session.user._id }).populate('items.product');
        if (!cart) {
            return res.render('user/cart', { cart: null, title: "Cart Page" });
        }
        res.render('user/cart', { cart, title: "Cart Page" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
const checkCart = async (req, res) => {
    try {
        const { productId, variantSize } = req.body;
        const userId = req.session.user._id;

        if (!productId || !variantSize) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.json({ success: true, inCart: false });
        }

        const existingCartItem = cart.items.find(
            item => item.product.toString() === productId && item.size === variantSize
        );

        if (existingCartItem) {
            res.json({ success: true, inCart: true });
        } else {
            res.json({ success: true, inCart: false });
        }
    } catch (error) {
        console.error('Error checking cart:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
const addToCart = async (req, res) => {
    try {
        const { productId, variantSize, quantity } = req.body;
        const userId = req.session.user._id;

        if (!quantity) {
            return res.status(400).json({ success: false, message: "quantity" });
        }
        if ( !variantSize) {
            return res.status(400).json({ success: false, message: "Missing variant size" });
        }
        if (!productId) {
            return res.status(400).json({ success: false, message: "product id" });
        }

        // Validate quantity
        const parsedQuantity = parseInt(quantity, 10);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ success: false, message: "Invalid quantity" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        if(!product.status){
            return res.status(404).json({ success: false, message: "Product unlisted" });
        }

        const variant = product.variants.find(v => v.size === variantSize);
        if (!variant) {
            return res.status(400).json({ success: false, message: "Variant not found" });
        }

        if (variant.stock < parsedQuantity) {
            return res.status(400).json({ success: false, message: `Only ${variant.stock} units available in the selected size.` });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [], totalPrice: 0 });
        }

        const existingCartItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size === variantSize
        );

        if (existingCartItemIndex !== -1) {
            cart.items[existingCartItemIndex].quantity += parsedQuantity;
        } else {
            cart.items.push({ product: productId, size: variantSize, quantity: parsedQuantity });
        }

        cart.totalPrice += product.price * parsedQuantity;
        await cart.save();

        res.json({ success: true, message: "Product added to cart" });

    } catch (error) {
        console.error('Error adding product to cart:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const removeFromCart = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please log in to remove products from your cart.' });
    }

    try {
        const userId = req.session.user._id;
        const productId = req.params.id;

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            const product = await Product.findById(productId);
            cart.totalPrice -= cart.items[itemIndex].quantity * product.price;

            cart.items.splice(itemIndex, 1);

            if (cart.totalPrice < 0) {
                cart.totalPrice = 0;
            }

            await cart.save();

            return res.status(200).json({ success: true, message: 'Product removed from cart' });
        } else {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }
    } catch (error) {
        console.error('Error removing product from cart:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const updateCartQuantity = async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please log in to update your cart.' });
    }

    try {
        const { productId } = req.params;
        const { size, quantity } = req.body;
        const userId = req.session.user._id;

        const parsedQuantity = parseInt(quantity, 10);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ success: false, message: "Invalid quantity" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const variant = product.variants.find(v => v.size === size);
        if (!variant) {
            return res.status(400).json({ success: false, message: "Variant not found" });
        }

        if (variant.stock < parsedQuantity) {
            return res.status(400).json({ success: false, message: `Only ${variant.stock} units available in the selected size.` });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const existingCartItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size === size
        );

        if (existingCartItemIndex !== -1) {
            const cartItem = cart.items[existingCartItemIndex];
            cart.totalPrice -= cartItem.quantity * product.price; // Remove the old amount
            cartItem.quantity = parsedQuantity;
            cart.totalPrice += cartItem.quantity * product.price; // Add the new amount
        } else {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        await cart.save();

        res.json({ success: true, message: "Cart updated" });

    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



const getProductVariant = async (req, res) => {
    try {
        const { productId, size } = req.params;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const variant = product.variants.find(v => v.size === size);
        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        res.json({ success: true, stock: variant.stock });
    } catch (error) {
        console.error('Error fetching product variant:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



module.exports = {
    getHomePage,
    getLoginPage,
    getSignupPage,
    newUserRegistration,
    resendOtp,
    getOtpPage,
    verifyOtp,
    loginUser,
    logoutUser,
    pageNotFound,
    profile,
    orders,
    wallet,
    updateProfile,
    checkCart,
    addToCart,
    getCart,
    removeFromCart,
    updateCartQuantity,
    getProductVariant,
    getForgotPasswordPage,
    handleForgotPassword,
    handleResetPasswordPageAndRequest,
}