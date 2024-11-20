//- to be continued

const mongoose = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");
const Books = require("./db-myBook");
const Users = require("./db-user");
const dbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_ATLAS}`;

const ActivitySchema = new mongoose.Schema(
    {
      createdDate: { type: Date, default: Date.now },
      bookID: { type: mongoose.Schema.Types.ObjectId, ref: "books" },
      userID: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      endDate: {
        type: Date,
        default: function () {
          return new Date(this.createdDate.getTime() + 20 * 24 * 60 * 60 * 1000);
        }
      },
      status: {
        type: String,
        enum: ["borrowed", "returned"],
        default: "borrowed"
      }
    },
    { collection: "activity" }
  );
  
  const Activity = mongoose.model("activity", ActivitySchema);


async function connect() {
  await mongoose.connect(dbUrl); 
}

async function initializeActivity() {
    await connect();
    let getBook = await Books.findOne({ bookID: "lSMGAAAAQAAJ" });
    let getUser= await Users.findOne({ email: "flora@123.com" });
    const activityList = [
    {
        createdDate: new Date('2024-11-01'),
        bookID: getBook._id,
        userID: getUser._id,
        status: "borrowed",       
}];
    await Activity.insertMany(activityList);
    // Model.insertMany()
}


async function addActivity(newActivity) {
    await connect();

    const getBook = await Books.findById(newActivity.bookID).exec();
    const getUser = await Users.findById(newActivity.userID).exec();

    let activityData = {
        createdDate: newActivity.createdDate,
        bookID: getBook ? getBook._id : null,
        userID: getUser ? getUser._id : null,
        endDate: newActivity.endDate || new Date(newActivity.createdDate.getTime() + 20 * 24 * 60 * 60 * 1000),
        status: newActivity.status,
    };

    const newActivityData = await Activity.create(activityData);
    if (getBook) {
        getBook.activity.push(newActivityData._id);
        await getBook.save();
    }
    if (getUser) {
        getUser.activity.push(newActivityData._id);
        await getUser.save();
    }
}

async function getActivities() { 
    await connect();
    return await Activity.find({}).populate("userID").populate("bookID").sort({ createdDate: -1 });
}

async function getActivitiesByUser(userId) { 
    await connect();
    return await Activity.find({ userID: userId }).populate("bookID").sort({ createdDate: -1 });
}

async function getActivitiesByBook(bookId) { 
    await connect();
    return await Activity.find({ bookID: bookId }).populate("userID").sort({ createdDate: -1 });
}

module.exports={
    getActivities,
    getActivitiesByUser,
    getActivitiesByBook,
    addActivity,
    initializeActivity,
    Activity
}