const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  emailVerified: Boolean,
  verifyToken: String,
  verifyExpires: Date,
  lastVerifyTime: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // password: String
});

UserSchema.plugin(passportLocalMongoose);

User = mongoose.model("User", UserSchema);

module.exports = User;
