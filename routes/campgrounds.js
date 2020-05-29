const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const Comment = require("../models/comment");
const middleware = require("../middleware");

router.get("/", async (req,res)=>{
    try{
        let campgrounds = await Campground.find({});
        if(!campgrounds){
            throw "Campground Not in DB";
        }
        res.render("campgrounds/index",{campgrounds:campgrounds});
    }
    catch (err){
        console.log("/campgrounds failed DB find");
        console.log(err);
        flash.error("Database Not Ready - Please Try Again");
        res.redirect("/");
    }
    console.log("GET Campgrounds");
});

router.post("/", middleware.isLoggedIn, async (req,res) =>{
    try{
        const name=req.body.name;
        const price=req.body.price;
        const image=req.body.image;
        const desc=req.body.description;
        const author= {
            id: req.user._id,
            username: req.user.username
        };
        const newCamp = {name: name, price: price, image: image, description: desc, author: author};
        let camp = await Campground.create(newCamp);
        console.log(`/campgrounds POST added ${camp.name}`);
        req.flash("success", `Campground ${camp.name} Added.  Thank you.`);
        res.redirect("/campgrounds");
    }
    catch (err){
        console.log("/campgrounds POST ERROR in Saving Campground");
        console.log(err);
        req.flash("error","There was a problem saving your campground.");
        res.redirect("/campgrounds");
    }
});


//This must be declared first!
router.get("/new", middleware.isLoggedIn, (req,res)=>{
    res.render("campgrounds/new");
});

router.get("/:id", async (req,res) => {
    try{
        let id=req.params.id;
        let camp = await Campground.findById(id).populate("comments");
        if(!camp){
            throw "Cannot find this campground ID to display";
        }
        res.render("campgrounds/show",{camp:camp});
        console.log(`GET /campgrounds/${id} of ${camp.name}`);    
    }
    catch (err){
        console.log(`GET /campgrounds/${req.params.id} failed`);
        req.flash("error", "I can't find that campground ID to show you. Please try again.")
        res.redirect("/campgrounds");
    }
});

//EDIT ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, async (req,res)=>{
    try{
        let camp= await Campground.findById(req.params.id);
        res.render("campgrounds/edit", {camp:camp});   
    }
    catch (err){
        console.log(err);
        req.flash("error", "I can't find that campground ID for you to edit. Please try again.")
        res.redirect(`/campgrounds/${req.params.id}`);
    }
});

//UPDATE ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, async (req,res)=>{
    try{
        await Campground.findByIdAndUpdate(req.params.id, req.body.camp);
        req.flash("success",`Campground ${req.body.camp.name} Updated`);
        res.redirect(`/campgrounds/${req.params.id}`);
    }
    catch (err){
        console.log(err);
        req.flash("error", "There was a problem saving your edits. Please try again");
        res.redirect("/campgrounds");
    }
});

// DESTROY ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, async (req,res) => {
    try{
        let camp = await Campground.findById(req.params.id);
        for(const comment of camp.comments){
            //no need to await result
            console.log(comment);
            await Comment.findByIdAndRemove(comment._id);
        }
        await Campground.findByIdAndRemove(req.params.id);
        req.flash("success","Campground Deleted")
        res.redirect("/campgrounds");
    }
    catch (err){
        req.flash("error","There was a problem deleting the Campground");
        res.redirect("/campgrounds");
        console.log(err);
    }
});



module.exports = router;
