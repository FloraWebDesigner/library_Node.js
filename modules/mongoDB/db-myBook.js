const mongoose = require("mongoose");
const { Types: { ObjectId } } = require("mongoose");
// const Activity = require("./db-activity");
const dbUrl = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_ATLAS}`;
const BookSchema = new mongoose.Schema({
    bookID: { type: String, required: true },
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
            stock: 1,
            activity: [],
            favouriteCount:0,
            createdDate:new Date('2024-11-01')
        }
    ];
    await Books.insertMany(bookList);
}

async function addBook(pID,pStock,pDate){
await connect();
let newBook =new Books({
    bookID:pID,
    stock:pStock,
    createdDate:pDate
});
await newBook.save();
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


  async function getBooks() {
    await connect();
    return await Books.find({}).sort({createdDate:-1}); //return array for find all
  }

  async function getOneBook(id) {
    await connect();
    return await Books.findById(id).exec(); 
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
    getOneBook,
    getBooks,
    deleteBook,
    reset,
    Books,
    addBookIdArray
}