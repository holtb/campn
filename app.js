//Declare functionality
const express       = require('express');
const app           = express();
const bodyParser    = require('body-parser');
const mongoose      = require('mongoose');
const flash         = require('connect-flash');
const passport      = require('passport');
const LocalStrategy = require('passport-local');
const methodOverride= require('method-override');
const Campground    = require('./models/campground');
const Comment       = require('./models/comment');
const User          = require("./models/user");
const seedDB        = require('./seeds');
const sslexpress    = require('ssl-express-www');
//assume production unless otherwise told differently, used in seeding DB decision
const environment   = process.env.NODE_ENV || "production"; 

//REQUIRING ROUTES
const commentRoutes     = require("./routes/comments");
const campgroundRoutes  = require("./routes/campgrounds");
const indexRoutes       = require("./routes/index");

console.log(`Using DB: ${process.env.CAMPSDB}`);
mongoose.connect(process.env.CAMPSDB,{ useNewUrlParser: true, useUnifiedTopology: true })
    .then(() =>{
        console.log("DB Successfully Connected");
    })
    .catch((err) => {
        console.log(`DB Connection Fail: ${err}`);
    });

//initial setup
port = process.env.PORT || 3000;
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
app.use(flash());
mongoose.set('useFindAndModify', false);
app.use(sslexpress);

//RESET DB if in development mode
if(environment.toLowerCase() == 'development'){
    console.log("Development Environment Detected. Seeding database. If this is incorrect, please set NODE_ENV to 'production'");
    seedDB();
} else{
    console.log("Production Environment Detected. Not seeding database. If this is incorrect, please set NODE_ENV to 'development'");
}

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: process.env.AUTHSECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

app.use("/",indexRoutes);
app.use("/campgrounds",campgroundRoutes);
app.use("/campgrounds/:id/comments",commentRoutes);

app.listen(port,()=>{
    console.log("CampN App Started - Express listening on port " + port);
});