// TODO: Refactor async waterfall to async/await; make general variables to take process.env variables at top

const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
//const middleware = require("../middleware");

router.get("/", (req,res) =>{
    res.render("landing");
    console.log("GET /");
});

// **************
// AUTH ROUTES
// **************

router.get("/register", (req,res) =>{
    res.render("register");
});

router.post("/register", async (req,res) =>{
    try{
        var newUser = new User({email: req.body.email, username: req.body.username});
        await User.register(newUser, req.body.password);
        passport.authenticate("local")(req,res, () => {
            req.flash("success", `Successfully Signed Up. Welcome to CampN, ${newUser.username}`);
            res.redirect("/campgrounds");
        });
    }
    catch(err){
        console.log(err);
        req.flash("error",err.message);
        return res.redirect("/register");
    }
});

router.get("/login", (req,res)=>{
    res.render("login");
});

router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login"
    }), (req,res)=>{
});

router.get("/logout", (req,res) =>{
    req.logOut();
    req.flash("success", "Logged You Out");
    res.redirect("/campgrounds");
});

router.get("/forgot", (req, res) =>{
    res.render("forgot");
});

router.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: process.env.CAMPEMAILUSER,
            pass: process.env.CAMPMAILPWD
          }
        });
        var mailOptions = {
          to: user.email,
          from: process.env.CAMPEMAILUSER,
          subject: 'CampN Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });
  
  router.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  router.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user: process.env.CAMPEMAILUSER,
            pass: process.env.CAMPMAILPWD
          }
        });
        var mailOptions = {
          to: user.email,
          from: process.env.CAMPEMAILUSER,
          subject: 'Your CampN password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the CampN password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/campgrounds');
    });
  });

module.exports = router;
