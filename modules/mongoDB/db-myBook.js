const mongoose = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");
// const Activity = require("./db-activity");
const dbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_ATLAS}`;

const BookSchema = new mongoose.Schema({
    bookID: { type: String, required: true, unique: true },
    stock:{ type: Number, default: 0 },
    activity:[{ type: mongoose.Schema.Types.ObjectId, ref: "activity" }],
    favouriteCount:{ type: Number, default: 0 },
    createdDate: { type: Date, default: Date.now },
},
  {
    collection:"books"
});
  const Books = mongoose.model("books", BookSchema);

async function connect() {
  await mongoose.connect(dbUrl); 
}

async function initializeBooks() {
    await connect();
    const bookList = [
        {
            bookID: "OCdJEAAAQBAJ",
            stock: 0,
            activity: [],
            favouriteCount:0,
            createdDate:new Date('2024-11-01')
        }
    ];
    await Books.insertMany(bookList);
}

async function addBook(pID,pStock){
await connect();
console.log(`Adding book with ID: ${pID}`);
await Books.create({
    bookID: pID,
    stock: pStock,
    createdDate: new Date(),
});
}

async function addBookIdArray(array){
    await connect();
    const existingBooks = await Books.find({ bookID: { $in: array } }).lean();
    const existingIds = existingBooks.map(book => book.bookID);
    const newBooks = array.filter(id => !existingIds.includes(id));
    if (newBooks.length > 0) {
        let bookList = newBooks.map(id => ({
            bookID: id,
            createdDate: new Date(),
        }));
  await Books.insertMany(bookList);
}
}

async function checkBookExists(bookID) {
  await connect();
  const existingBook = await Books.findOne({ bookID: bookID}).lean();
  console.log(`Existing book:`, existingBook);
  return !!existingBook; 
}

  async function getBooks() {
    await connect();
    return await Books.find({}).sort({createdDate:-1}); //return array for find all
  }

  async function getOneBookByKey(key) {
    await connect();
    return await Books.findOne({ bookID: key });
}

async function getOneBookByID(id) {
  await connect();
  return await Books.findById(id).exec();
}

async function updateBook(filter, updatedBook) {
  await connect();
  let updBook={
    stock:updatedBook.stock,
  }
  // activity - status
  return await Books.updateOne(filter, { $set: updBook });
}


async function deleteBook(id) {
    await connect();
    let filter = { _id: new ObjectId(id) };
    await Books.deleteOne(filter);
}

async function reset() {
    await connect();
    await Books.deleteMany({});
}

module.exports={
    initializeBooks,
    addBook,
    getBooks,
    deleteBook,
    reset,
    Books,
    addBookIdArray,
    getOneBookByKey,
    getOneBookByID,
    checkBookExists,
    updateBook,
}