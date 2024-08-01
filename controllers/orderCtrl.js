
const Cart = require('../model/cartSchema');
const User = require('../model/userSchema');
const Address = require('../model/addressSchema');


const checkout = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const userId = req.session.user._id;
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        const addresses = await Address.find({ userId: userId });
        

        if (!cart) {
            return res.redirect('/cart'); // Redirect to cart if it's empty
        }

        let totalPrice = cart.totalPrice;
        

    
        
        const user = await User.findById(userId);
        

        
        res.render('user/checkout', {
            title: "Checkout",
            cart,
            addresses,
            totalPrice: totalPrice.toFixed(2),
            user
            
        });
    } catch (error) {
        console.error('Error rendering checkout page:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {checkout};
