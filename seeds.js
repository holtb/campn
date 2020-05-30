const mongoose = require("mongoose");
const Campground = require("./models/campground");
const Comment   = require("./models/comment");
const User = require("./models/user");

const beanerPassword = "asdf";
const beanerUsername = "beaner";
const beanerEmail = "campn-test@holtmail.org";

var seeds = [
    {
        name: "Cloud's Rest", 
        price: "9.50",
        image: "https://farm4.staticflickr.com/3795/10131087094_c1c0a1c859.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum",
        author:{
            id : "588c2e092403d111454fff76",
            username: "Homer"
        }
    },
    {
        name: "Desert Mesa", 
        price: "10.00",
        image: "https://farm6.staticflickr.com/5487/11519019346_f66401b6c1.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum",
        author:{
            id : "5ec8a0366750280a35547add",
            username: "Potato"
        }
    },
    {
        name: "Canyon Floor", 
        price: "25.00",
        image: "https://farm1.staticflickr.com/189/493046463_841a18169e.jpg",
        description: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum",
        author:{
            id : "5ec843728bb34406f3c6a990",
            username: beanerUsername
        }
    }
];

async function seedDB(){
    try {
        await Campground.deleteMany({});
        console.log('Campgrounds deleted');
        await Comment.deleteMany({});
        console.log('Comments deleted');
        await User.deleteOne({username:beanerUsername});
        console.log(`User ${beanerUsername} deleted`)
        let beanerUser = await User.register(new User({email: beanerEmail,username: beanerUsername}), beanerPassword);
        seeds[2].author.id = beanerUser._id;
        seeds[2].author.username = beanerUser.username;
        console.log(`User ${beanerUsername} registered`);

        for(const seed of seeds) {
            let campground = await Campground.create(seed);
            console.log('Campground created');
            let comment = await Comment.create(
                {
                    text: 'This place is great, but I wish there was internet',
                    author:{
                        id : "588c2e092403d111454fff76",
                        username: "Homer"
                    }
                            }
            );
            console.log('Comment created');
            campground.comments.push(comment);
            comment = await Comment.create(
                {
                    text: "But I won't cry for yesterday. There's an ordinary world. Somehow I have to find.",
                    author:{
                        id : "5ec843728bb34406f3c6a991",
                        username: "Duran"
                    }
                }
            );
            console.log('Comment 2 created');
            campground.comments.push(comment);
            comment = await Comment.create(
                {
                    text: "Watch out for the porcupines.  They are smart.",
                    author: { id: beanerUser._id,
                        username: beanerUser.username
                    }
                }
            );
            console.log('Comment 3 created');
            campground.comments.push(comment);
            campground.save();
            console.log('Comments added to campground');
        }
        console.log(`${beanerUsername}'s ID: ${beanerUser._id}`);
    } catch(err) {
        console.log(err);
    }
    console.log(`${beanerUsername}'s password is ${beanerPassword}`);
}

module.exports = seedDB;