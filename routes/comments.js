const express = require("express");
const router = express.Router({mergeParams:true});
const Campground = require("../models/campground");
const Comment = require("../models/comment");
const middleware = require("../middleware");

// **************
// COMMENTS ROUTES
// **************

router.get("/new", middleware.isLoggedIn,async (req, res) => {
    try{
        let camp = await Campground.findById(req.params.id);
        res.render("comments/new",{camp: camp});
    }
    catch (err){
        console.log(`New Comment Form Show on ${req.params.id} failed`);
    }
});

router.post("/", middleware.isLoggedIn, async (req,res) => {
    try{
        let camp = await Campground.findById(req.params.id);
        let comment = await Comment.create(req.body.comment);
        comment.author.id = req.user._id;
        comment.author.username = req.user.username;
        comment.save();
        camp.comments.push(comment);
        await camp.save();
        console.log(comment);
        req.flash("success","Comment Updated");
        res.redirect(`/campgrounds/${camp._id}`);
    }
    catch (err){
        req.flash("error","There was a problem adding your comment");
        res.redirect("/campgrounds");
        console.log(`New Comment Form POST on ${req.params.id} failed`);
    }
});

//EDIT ROUTE
router.get("/:comment_id/edit", middleware.checkCommentOwnership, async(req, res) => {
    try{
        let comment = await Comment.findById(req.params.comment_id);
        if(!comment) throw "No Comment with that ID found";
        res.render("comments/edit",{camp_id: req.params.id, comment: comment});
    } catch (err){
        console.log(err);
        req.flash("error","There was a problem looking up your comment");
        res.redirect(`/campgrounds/${req.params.id}`);
    }
});

//UPDATE ROUTE
router.put("/:comment_id", middleware.checkCommentOwnership, async (req,res) =>{
    try{
        await Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment);
        req.flash("success", "Comment Updated");        
        res.redirect(`/campgrounds/${req.params.id}`);
    } catch (err){
        console.log(err);
        req.flash("There was a problem updating your comment");
        res.redirect("back");
    }
});

//DELETE Comment Route
router.delete("/:comment_id", middleware.checkCommentOwnership, async (req,res) =>{
    try{
        await Comment.findByIdAndRemove(req.params.comment_id);
        req.flash("success", "Comment Deleted");
        res.redirect(`/campgrounds/${req.params.id}`);
    } catch (err){
        console.log(err);
        req.flash("error","There was a problem deleting the comment");
        res.redirect(`/campgrounds/${req.params.id}`);
    }
});


module.exports = router;