const mongoose = require("mongoose");
const ObjectId=require("mongodb");
const dbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_ATLAS}`;
// const dbUrl=process.env.CONNECT;
const BookIdSchema = new mongoose.Schema({
    bookID: String,
    createdDate: { type: Date, default: Date.now }
  },
  {
    collection:"bookId"
});
  const BookID = mongoose.model("bookId", BookIdSchema);

async function connect() {
  await mongoose.connect(dbUrl); 
}

async function initializeBookId(){
    await connect();
    const bookList=[
      {
        // War and Peace
        bookID: "9nxfsPujsYoC",
        createdDate: new Date('2024-11-01')
      },
      {
        // Jane Eyre
        bookID: "lSMGAAAAQAAJ",
        createdDate: new Date('2024-11-01')
      }
    ];
  await BookID.insertMany(bookList);
  // Model.insertMany()
  }

  async function addManyBookId(array){
    await connect();
    const existingBooks = await BookID.find({ bookID: { $in: array } }).lean();
    const existingIds = existingBooks.map(book => book.bookID);
    const newBookIds = array.filter(id => !existingIds.includes(id));

    if (newBookIds.length > 0) {
        let bookList = newBookIds.map(id => ({
            BookID: id,
            createdDate: new Date(),
        }));
  await BookID.insertMany(bookList);
  // Model.insertMany()
  }
}

  async function addBookId(pID,pDate){
    await connect();
    let newBookID =new BookID({
        bookID:pID,
        createdDate:pDate
    });
    await BookID.create(newBookID);
  }

  async function getBookId() {
    await connect();
    return await BookID.find({}).sort({createdDate:-1}); //return array for find all
  }

  async function getOneBookId(id) {
    await connect();
    return await BookID.findById(id).exec(); 
}

async function deleteBookId(id) {
    await connect();
    let filter = { _id: new ObjectId(id) };
    await BookID.deleteOne(filter);
}

async function reset() {
    await connect();
    await BookID.deleteMany({});
}

module.exports={
    initializeBookId,
    addBookId,
    getOneBookId,
    getBookId,
    deleteBookId,
    reset,
    BookID,
    addManyBookId
}