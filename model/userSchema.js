const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    firstname: {
        type: String,
        required: [true, 'First name is required'],
    },
    lastname: {
        type: String,
        required: [false, 'Last name is required'],
    },
    mobile: {
        type: String,
        required: false,
       
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
    },
    password: {
        type: String,
        required: false,
    },
    googleId: {
        type: String,
        required: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true,
});

userSchema.virtual('fullName').get(function() {
    return `${this.firstname} ${this.lastname}`;
});

module.exports = mongoose.model('User', userSchema);
