// TODO: Refactor async waterfall to async/await; make general variables to take process.env variables at top

const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
//const middleware = require("../middleware");

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
    });
    await User.register(newUser, req.body.password);
    passport.authenticate("local")(req, res, () => {
      req.flash(
        "success",
        `Successfully Signed Up. Welcome to CampN, ${newUser.username}`
      );
      res.redirect("/campgrounds");
    });
  } catch (err) {
    console.log(err);
    req.flash("error", err.message);
    return res.redirect("/register");
  }
});

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
router.get("/reset/:token", async (req, res) => {
  let user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired.");
    return res.redirect("/forgot");
  }
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

module.exports = router;
