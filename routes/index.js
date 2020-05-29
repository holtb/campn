var express = require("express");
var router = express.Router();
var passport = require("passport");
var User = require("../models/user");
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
        var newUser = new User({username: req.body.username});
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

module.exports = router;
