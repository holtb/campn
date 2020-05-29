const mongoose = require("mongoose");
 
const commentSchema = new mongoose.Schema({
    text: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectID,
            ref: "User"
        },
        username: String
    }
});

const Comment = mongoose.model("Comment", commentSchema);
 
module.exports = Comment;