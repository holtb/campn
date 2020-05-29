// All the middleware goes here
const Campground = require("../models/campground");
const Comment = require("../models/comment");

const middlewareObj = {};

middlewareObj.checkCampgroundOwnership = async function(req, res, next){
    try{
        if(req.isAuthenticated()){
            let camp= await Campground.findById(req.params.id);
            if(!camp){
                throw "Cannot find this campground ID to display";
            }
            if(camp.author.id.equals(req.user._id)){
                return next();   
            }
            else{
                //send message that not the author
                req.flash("error", "You cannot edit a campground that is not your own.");
            }
        } else{
            //send message that need to log in
            req.flash("error","You have to be logged in to do that");
        }     
    } catch(err) {
        req.flash("I encountered an error. The comment may not exist any more.")
        console.log(err);
    }
    //Whether error, not logged in, or not authorized, go back
    res.redirect("back");
}

middlewareObj.checkCommentOwnership = async function(req, res, next){
    try{
        if(req.isAuthenticated()){
            let comment= await Comment.findById(req.params.comment_id);
            if(!comment){
                throw "Cannot find this comment ID to display";
            }
            if(comment.author.id.equals(req.user._id)){
                return next();   
            }
            else{
                req.flash("error", "You cannot edit a comment that is not your own.");
            }
        } else{
            //send message that need to log in
            req.flash("error","You have to be logged in to do that");
        }     
    } catch(err) {
        console.log(err);
        req.flash("I encountered an error. The comment may not exist any more.")
    }
    //Whether error, not logged in, or not authorized, go back
    res.redirect("back");
}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error","You Need to be Logged In to Do That.");
    res.redirect("/login");
}




module.exports =middlewareObj;