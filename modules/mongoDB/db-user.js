const mongoose = require("mongoose");
const {
  Types: { ObjectId },
} = require("mongoose");
const bcrypt = require("bcrypt");
const Books = require("./db-myBook");
// const Activity = require("./db-activity");
const dbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_ATLAS}`;

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "reader"],
      default: "reader",
    },
    email: { type: String, required: true },
    password: { type: String, required: true },
    activity: [{ type: mongoose.Schema.Types.ObjectId, ref: "activity" }],
    favorite:[{
        bookID: String,
        _id: mongoose.Schema.Types.ObjectId,
      }],
    createdDate: { type: Date, default: Date.now },
    sessionId: String,
  },
  {
    collection: "users",
  }
);
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
      role: "admin",
      email: "flora@123.com",
      password: hashedPass,
      activity: [],
      favorite: [],
      createdDate: new Date("2024-11-01"),
      sessionId: "bvcdcegoier",
    },
  ];
  await Users.insertMany(userList);
}

async function addUser(pUsername, pEmail, pPassword) {
  const hashedPass = await hashPassword(pPassword);
  await connect();
  let newUser = new Users({
    username: pUsername,
    email: pEmail,
    password: hashedPass,
    createdDate: Date.now(),
  });
  await Users.create(newUser);
}

async function getUsers() {
  await connect();
  return await Users.find({}).populate("favorite").sort({ createdDate: -1 }); //return array for find all
}

async function getOneUser(id) {
  await connect();
  return await Users.findById(id).populate("favorite").exec();
}

async function getSessionID(inputEmail, storeSessionId) {
  await connect();
  return await Users.updateOne(
    { email: inputEmail },
    { sessionId: storeSessionId }
  );
}

async function getOneBySessionID(inputID) {
  await connect();
  return await Users.findOne({ sessionID: inputID }).exec();
}

async function findOneByemail(inputEmail) {
  await connect();
  return await Users.findOne({ email: inputEmail }).exec();
}

async function updateUser(filter, updatedUser) {
  await connect();

  let updUser = {
    username: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.role,
  };

  if (updatedUser.password) {
    const hashedPass = await hashPassword(updatedUser.password);
    updUser.password = hashedPass;  
  }

  return await Users.updateOne(filter, { $set: updUser });
}

async function deleteUser(id) {
  await connect();
  let filter = { _id: new ObjectId(id) };
  return await Users.deleteOne(filter);
}

async function reset() {
  await connect();
  return await Users.deleteMany({});
}

async function getFavorites(userId) {
    await connect();
    const user = await Users.findById(userId);

    if (!user) {
        console.error("User not found");
        return null;
    }

    const favoriteList = user.favorite.length > 0 
        ? user.favorite.map(fav => fav.bookID)
        : [];

    return favoriteList;
}

  async function isBookInFavorites(userId, bookId) {
    await connect();
    const user = await Users.findById(userId);
    if (!user) {
        console.error("User not found");
        return false;
    }

    const exists = user.favorite.some(fav => fav.bookID === bookId);
    return exists;
}

async function addFavorite(userId, bookId) {
    await connect();
    const user = await Users.findById(userId);
    if (!user) {
        console.error("User not found");
        return;
    }
    
    const book = await Books.getOneBookByKey(bookId);
    if (!book) {
        console.error("Book not found");
        return;
    }

    const isFavorite = await isBookInFavorites(userId, book.bookID);
    if (!isFavorite) {
        const favoriteEntry = {
            bookID: book.bookID, 
            _id: book._id, 
        };
        user.favorite.push(favoriteEntry);
        await user.save();
        book.favouriteCount += 1;
        await book.save();
    } else {
        console.log("This book is already in the user's favorites.");
    }
}


async function removeFavorite(userId, bookId) {
    await connect(); 
    const book = await Books.getOneBookByKey(bookId);
    if (!book) {
        console.error("Book not found");
        return;
    }

    const user = await Users.findById(userId);
    if (!user) {
        console.error("User not found");
        return;
    }

    const index = user.favorite.findIndex(fav => fav.bookID === book.bookID);
    if (index !== -1) {
        user.favorite.splice(index, 1); 
        await user.save();
    } else {
        console.log("Book is not in user's favorites.");
        return;
    }

    book.favouriteCount = Math.max(0, book.favouriteCount - 1); 
    await book.save();
}

module.exports = {
  initializeUsers,
  addUser,
  getOneUser,
  getUsers,
  deleteUser,
  reset,
  Users,
  getFavorites,
  addFavorite,
  removeFavorite,
  findOneByemail,
  hashPassword,
  verifyPassword,
  getSessionID,
  getOneBySessionID,
  updateUser,
  isBookInFavorites,
};
