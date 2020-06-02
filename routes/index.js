// TODO: make general variables to take process.env variables at top

const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const middleware = require("../middleware");

//Settings
const fiveMinutes = 300000;

router.get("/", (req, res) => {
  res.render("landing");
  console.log("GET /");
});

// **************
// AUTH ROUTES
// **************

router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", async (req, res) => {
  try {
    var newUser = new User({
      email: req.body.email,
      username: req.body.username,
      emailVerified: false,
      verifyExpires: Date.now() + 43200000, // Make sure first email goes through
      lastVerifyTime: Date.now() - 2 * fiveMinutes, //Make sure first email goes out
    });
    newUser = await User.register(newUser, req.body.password);
    //passport.authenticate("local")(req, res, () => {});
    //console.log(newUser);
    req.logIn(newUser, () => {});
    req.flash(
      "success",
      `Successfully Signed Up. Please check your email and click on the link in the email to verify your email address, ${newUser.username}`
    );
    if (sendVerifyEmail(req, res, req.user)) {
      //if success, we handle it, otherwise error handling in function
      res.redirect("/campgrounds");
    }
  } catch (err) {
    console.log(err);
    req.flash("error", err.message);
    return res.redirect("/register");
  }
});

//Route for email authentications
//router.get("/verify/:id")
// passport.authenticate("local")(req, res, () => {
//   req.flash(
//     "success",
//     `Successfully Signed Up. Please check your email and click on the link to verify, ${newUser.username}`
//   );
router.get("/verify", middleware.isLoggedIn, (req, res) => {
  //console.log("verify only route.");
  let user = req.user;
  if (user.emailVerified) {
    req.flash("success", "You have alread verified your email.");
    res.redirect("/campgrounds");
    return;
  }
  if (Date.now() - user.lastVerifyTime < fiveMinutes) {
    req.flash(
      "error",
      "Please wait 5 minutes before requesting a new verification email link."
    );
    res.redirect("/campgrounds");
    return false;
  }
  res.render("verify.ejs", { user: user });
});

router.post("/verify", middleware.isLoggedIn, (req, res) => {
  //res.send("verify POST route");
  let user = req.user;
  if (req.body.email != user.email) {
    user.email = req.body.email;
  }
  if (sendVerifyEmail(req, res, user)) {
    req.flash(
      "success",
      "Email verification sent. Please check your inbox/spam."
    );
    res.redirect("/campgrounds");
    return;
  }
});

router.get("/verify/:token", async (req, res) => {
  let user = await User.findOne({
    verifyToken: req.params.token,
    verifyExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash(
      "error",
      "Verify email token is invalid or expired. Or you have a browser extension that causes you to visit this link twice."
    );
    res.redirect("/campgrounds");
    return;
  }
  //set the verify information for a verified user
  user.emailVerified = true;
  user.verifyToken = undefined;
  user.verifyExpires = undefined;
  user.lastVerifyTime = undefined;
  await user.save();
  if (!req.isAuthenticated()) {
    req.flash(
      "success",
      "Email verified. Thank you! Please Login for full features."
    );
  } else {
    req.flash("success", "Email verified. Thank you!");
  }
  res.redirect("/campgrounds");
});

//Login Routes
router.get("/login", (req, res) => {
  res.render("login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/campgrounds",
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {}
);

router.get("/logout", (req, res) => {
  req.logOut();
  req.flash("success", "Logged You Out");
  res.redirect("/campgrounds");
});

router.get("/forgot", (req, res) => {
  res.render("forgot");
});

//User filled out forgot password form and now email a time-limited reset token to them
router.post("/forgot", async (req, res, next) => {
  try {
    let token = await crypto.randomBytes(20).toString("hex");
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      req.flash("error", "No account with that email address exists.");
      return res.redirect("/forgot");
    }
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();
    await sendResetMail(token, user, req);

    console.log("mail sent");
    req.flash(
      "success",
      "An e-mail has been sent to " + user.email + " with further instructions."
    );
    return res.redirect("/campgrounds");
  } catch (err) {
    console.log(err);
    req.flash(
      "error",
      "There was a problem resetting your password.  Please try again."
    );
    return res.redirect("/forgot");
  }
});

//Check if token is valid and is not expired; if all good, then render a page to allow them to change their password
//Note: By its nature, a password reset verifies email
router.get("/reset/:token", async (req, res) => {
  let user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/forgot");
  }
  //set the verify information for a verified user
  user.emailVerified = true;
  user.verifyToken = undefined;
  user.verifyExpires = undefined;
  user.lastVerifyTime = undefined;
  user.save();
  res.render("reset", { token: req.params.token });
});

router.post("/reset/:token", async (req, res) => {
  try {
    let user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("back");
    }
    if (req.body.password === req.body.confirm) {
      await user.setPassword(req.body.password);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();
      await req.logIn(user, (err) => {
        console.error("Problem in logging in user ", err);
      });
    } else {
      req.flash("error", "Passwords do not match.");
      return res.redirect("back");
    }
    req.flash("success", "Success! Your password has been changed.");
    sendConfEmail(user);
    res.redirect("/campgrounds");
    return;
  } catch (err) {
    req.flash("error", "Something went wrong when changing your password.");
    console.error("Error changing password", err);
    res.redirect("/forgot");
  }
});

//reset email function
async function sendResetMail(token, user, req) {
  try {
    let smtpTransport = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.CAMPEMAILUSER,
        pass: process.env.CAMPMAILPWD,
      },
    });
    var mailOptions = {
      to: user.email,
      from: process.env.CAMPEMAILUSER,
      subject: "CampN Password Reset",
      text:
        "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
        "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
        "http://" +
        req.headers.host +
        "/reset/" +
        token +
        "\n\n" +
        "If you did not request this, please ignore this email and your password will remain unchanged.\n",
    };
    await smtpTransport.sendMail(mailOptions);
  } catch (err) {
    console.log("Error in password reset email");
    console.log(err);
    throw "Could not send email" + err;
  }
}

function sendConfEmail(user) {
  var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.CAMPEMAILUSER,
      pass: process.env.CAMPMAILPWD,
    },
  });
  var mailOptions = {
    to: user.email,
    from: process.env.CAMPEMAILUSER,
    subject: "Your CampN password has been changed",
    text:
      "Hello,\n\n" +
      "This is a confirmation that the CampN password for your account " +
      user.email +
      " has just been changed.\n",
  };
  smtpTransport.sendMail(mailOptions, function (err) {
    req.flash("success", "Success! Your password has been changed.");
    done(err);
  });
}

async function sendVerifyEmail(req, res, user) {
  //let user = await User.findOne({ email: req.body.email });
  if (!user) {
    req.flash("error", "No account with that email address exists.");
    res.redirect("/campgrounds");
    return false;
  }
  if (!user.verifyExpires) {
    req.flash(
      "error",
      "Your reset link is expired or invalid. Please request another email resend"
    );
    user.verifyExpires = undefined;
    user.verifyToken = undefined;
    user.lastVerifyTime = undefined;
    await user.save();
    res.redirect("/campgrounds");
    return false;
  }
  if (Date.now() - user.lastVerifyTime < fiveMinutes) {
    req.flash(
      "error",
      "Please wait 5 minutes before requesting a new verification email link."
    );
    res.redirect("/campgrounds");
    return false;
  }
  let token = await crypto.randomBytes(20).toString("hex");
  user.verifyToken = token;
  user.verifyExpires = Date.now() + 43200000; // 12 hours
  user.lastVerifyTime = Date.now();
  await user.save();
  try {
    let smtpTransport = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.CAMPEMAILUSER,
        pass: process.env.CAMPMAILPWD,
      },
    });
    var mailOptions = {
      to: user.email,
      from: process.env.CAMPEMAILUSER,
      subject: "CampN Email Confirmation for New Users",
      text:
        "You are receiving this because you (or someone else) have requested a new CampN account.\n\n" +
        "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
        "http://" +
        req.headers.host +
        "/verify/" +
        token +
        "\n\n" +
        "If you did not request this, please ignore this email and the account will not activate.\n",
    };
    await smtpTransport.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error("Error in seding password confirmation email");
    console.error(err);
    return false;
  }
}

module.exports = router;
