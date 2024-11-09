const mongoose = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");
const bcrypt = require('bcrypt');
const Books = require("./db-myBook");
// const Activity = require("./db-activity");
const dbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_ATLAS}`;

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    role:{
        type: String,
        enum: ["admin", "reader"],
        default: "reader"
      },
    email:{ type: String, required: true },
    password:{ type: String, required: true },
    activity:[{ type: mongoose.Schema.Types.ObjectId, ref: "activity" }],
    favorite:[{ type: mongoose.Schema.Types.ObjectId, ref: "books" }],
    createdDate: { type: Date, default: Date.now },
    sessionId: String
},
  {
    collection:"users"
});
  const Users = mongoose.model("users", UserSchema);

async function connect() {
  await mongoose.connect(dbUrl); 
}


async function hashPassword(password) {
    const saltRounds = 10; 
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

async function verifyPassword(password, hashedPassword) {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
}

async function initializeUsers() {
    await connect();
    const hashedPass = await hashPassword("flora.123");
    const userList = [
        {
            username: "Flora",
            role:"admin",
            email: "flora@123.com",
            password: hashedPass,
            activity: [],
            favorite:[],
            createdDate:new Date('2024-11-01'),
            sessionId:"bvcdcegoier"
        }
    ];
    await Users.insertMany(userList);
}

  async function addUser(pUsername,pEmail,pPassword){
    const hashedPass = await hashPassword(pPassword);
    await connect();
    let newUser =new Users({
        username: pUsername,
        email: pEmail,
        password:hashedPass,
        createdDate:Date.now()
    });
    await Users.create(newUser);
  }

  async function getUsers() {
    await connect();
    return await Users.find({}).sort({createdDate:-1}); //return array for find all
  }

  async function getOneUser(id) {
    await connect();
    return await Users.findById(id).exec(); 
}

async function getSessionID(inputEmail, storeSessionId) {
    await connect();
return await Users.updateOne({ email: inputEmail }, { sessionId: storeSessionId});
}

async function getOneBySessionID(inputID) {
    await connect();
    return await Users.findOne({ sessionID: inputID}).exec(); 
}

async function findOneByemail(inputEmail) {
    await connect();
    return await Users.findOne({ email: inputEmail }).exec(); 
}

async function updateUser(filter,updatedUser) {
    await connect();
    const hashedPass = await hashPassword(updatedUser.password);
    let updUser = {
        "username": updatedUser.username,
        "password":hashedPass,
        "email":updatedUser.email,
        "role":updatedUser.role,
    };
    return await Users.updateOne(filter,{ $set: updUser }); 
}

async function deleteUser(id) {
    await connect();
    let filter = { _id: new ObjectId(id) };
    await Users.deleteOne(filter);
}

async function reset() {
    await connect();
    await Users.deleteMany({});
}

async function addFavorite(userId, bookId) {
    await connect();
    const user = await Users.findById(userId);
    const book = await Books.findById(bookId);
    if (user && book) {
        user.favorite.push(bookId);
        book.favouriteCount += 1;
        await user.save();
        await book.save();
    }
}

async function removeFavorite(userId, bookId) {
    await connect();
    const user = await Users.findById(userId);
    const book = await Books.findById(bookId);
    if (user && book) {
        const index = user.favorite.indexOf(bookId);
        if (index >= 0) {
            user.favorite.splice(index, 1);
            book.favouriteCount -= 1;
            await user.save();
            await book.save();
        }
    }
}


module.exports={
    initializeUsers,
    addUser,
    getOneUser,
    getUsers,
    deleteUser,
    reset,
    Users,
    addFavorite,
    removeFavorite,
    findOneByemail,
    hashPassword,
    verifyPassword,
    getSessionID,
    getOneBySessionID,
    updateUser
}