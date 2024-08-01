const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { productUpload, categoryUpload } = require('../helpers/multer');
const categoryController = require('../controllers/categoryCtrl');

const productController = require('../controllers/productCtrl');


// Admin routes
router.get(['/', '/login'], adminController.getLoginPage);
router.post('/auth/login', adminController.loginUser);


router.get('/dashboard', adminController.getHomePage);
router.get('/auths/logout', adminController.logoutUser);
router.get('/userm', adminController.getAllUsers);
router.post('/block-user/:id', adminController.blockUser);
router.post('/unblock-user/:id', adminController.unblockUser);



// Category Routes
router.get('/categories', categoryController.getCategories);
router.get('/categories/add', categoryController.getAddCategoryPage);
router.post('/categories/add', categoryUpload.single('image'), categoryController.addCategory);
router.get('/categories/edit/:id', categoryController.getEditCategoryPage);
router.post('/categories/edit/:id', categoryUpload.single('image'), categoryController.updateCategory);
router.post('/categories/toggle/:id', categoryController.toggleCategoryStatus); 


// Product Management Routes

router.get('/products', productController.getProducts);
router.get('/products/add', productController.getAddProductPage);
router.post('/products/add', productUpload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImages', maxCount: 3 }
]), productController.addProduct);
router.get('/products/edit/:id', productController.getEditProductPage);
router.post('/products/edit/:id', productUpload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'subImages', maxCount: 3 }
]), productController.updateProduct);
router.delete('/products/delete/:id', productController.deleteProduct); // Change to DELETE method
router.post('/products/toggle-status/:id', productController.toggleProductStatus)
router.get('/products/manage-stock/:id', productController.getManageStockPage);
router.post('/products/update-stock/:id', productController.updateStock);

// Orders Management
router.get('/orders', productController.getOrderList);
router.put('/order/status/:id', productController.updateOrderStatus);

module.exports = router;
