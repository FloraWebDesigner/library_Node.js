//import required modules
const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
// npm install express-session cookie-parser
const cookieParser = require("cookie-parser");
const sessions = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const { ObjectId } = require("mongodb");

const book = require("./modules/googleBook/api");
const weather = require("./modules/weather-card");
const background = require("./modules/background");
const news = require("./modules/news");
const openAIData = require("./modules/openAI");
const colorConverted = require("./modules/color");
const openLibrary = require("./modules/open-library");
const quote = require("./modules/quote");
const imgCreator = require("./modules/pollination");
// mongoSchema
// const bookid=require("./modules/mongoDB/db-book");
const users = require("./modules/mongoDB/db-user");
const myBooks = require("./modules/mongoDB/db-myBook");
const activity = require("./modules/mongoDB/db-activity");
const cors = require('cors');

//set up Express app
const app = express();
const port = process.env.PORT || 1122;
app.use(cors());

//define important folders
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

//setup public folder
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());

const oneDay = 1000 * 60 * 60 * 24;
app.use(cookieParser());
app.use(
  sessions({
    secret: `${process.env.SESSION_SECRET}`,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: oneDay },
    resave: false,
  })
);
app.use((req, res, next) => {
  app.locals.userSession = req.session.user || null; 
  console.log("Current user session: ", req.session.user); 
  next();
});

app.get("/login", async (req, res) => {
  try {
    const error = req.flash("error");
    let userList = await users.getUsers();
    // console.log(userList);
    if (!userList.length) {
      await users.initializeUsers();
      userList = await users.getUsers();
    }

    res.render("login/login", { title: "Login", messages: { error } });
  } catch (err) {
    console.error("Error fetching users:", err);
    req.flash("error", "An error occurred while fetching users.");
    res.redirect("/login");
  }
});

app.post("/login/submit", async (req, res) => {
  const { email, password } = req.body;
  let userResult = await users.findOneByemail(email);
  console.log("login submit");
  if (userResult) {
    const verifyValue = await users.verifyPassword(password, userResult.password);
    if (verifyValue) {
      const sessionId = uuidv4();
      userResult.sessionId = sessionId;
      await userResult.save();
      res.cookie("sessionId", sessionId, { maxAge: oneDay, httpOnly: true });
      req.session.user = {
        userId: userResult._id, 
        username: userResult.username,
        role: userResult.role,
        email: userResult.email,
      };
      let returnTo = req.session.returnTo || `/profile/${req.session.user.userId}`;
      // console.log("Session after login: ", req.session.user); 
      if(req.session.user.role==='admin')
      {returnTo = '/admin/library';}
      // console.log(returnTo);
      delete req.session.returnTo; 
      return res.redirect(returnTo);
    } else {
      req.flash("error", "Password incorrect");
      return res.redirect("/login");
    }
  } else {
    req.flash("error", "No user with that email");
    return res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.get("/register", async (req, res) => {
  const error = req.session.error || null;
  req.session.error = null;
  res.render("login/register", {
    title: "Create a New Account",
    messages: { error },
  });
});

app.post("/register", async (req, res) => {
  const error = req.session.error || null;
  req.session.error = null;
  const { name, email, password } = req.body;
  let userResult = await users.findOneByemail(email);
  if (userResult) {
    return res.render("login/register", {
      title: "Create a New Account",
      messages: { error: "Email already in use. Please sign in." },
    });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render("login/register", {
      title: "Create a New Account",
      messages: { error: "Email invalid." },
    });
  }
  await users.addUser(name, email, password);
  res.redirect("/login");
});

// HOME: weather card, nasa background, search function
app.get("/", async (req, res) => {
  let nasaImage = await background.getNasaImage();
  let nasaBg = nasaImage.hdurl;

  let randomQuote=await quote.getQuote();
  // console.log(randomQuote[0]);
  // weather card
  let address = await weather.getIP();
  let lat, lon, myCountry;
  let location = await weather.getLocationA(address.ip);
  if (
    location.error.info ===
    "Your monthly usage limit has been reached. Please upgrade your Subscription Plan."
  ) {
    location = await weather.getLocationB(address.ip);
    if (location === "cannot get locationB") {
      // get Humber location
      // console.log("locationB is wrong");
      lat = "43.728822";
      lon = "-79.609511";
      myCountry = "CA";
    } else {
      let loc = location.loc;
      // console.log(loc);
      [lat, lon] = loc.split(",").map(Number);
      myCountry = location.country;
    }
  } else {
    lat = location.latitude;
    lon = location.longitude;
    myCountry = location.country_code;
  }
  // console.log(lat,lon);
  let flag = `https://flagsapi.com/${myCountry}/flat/64.png`;
  // console.log(flag);
  let weatherSection = await weather.getWeather(lat, lon);
  // console.log(weatherSection);
  let kelvin = await weatherSection.main.temp;
  let celsius = (kelvin - 273.15).toFixed(1);
  // console.log(celsius);
  let date = new Date();
  let shortDate = date.toLocaleDateString("en-US");
  res.render("index", {
    quote: randomQuote[0],
    weather: weatherSection,
    position: location,
    temp: celsius,
    date: shortDate,
    flag: flag,
    homeBg: nasaBg,
    userSession: req.session.user || null,
  });
});

// SEARCH RESULT: simple and detailed mode
app.get("/newarrival", async (req, res) => {
  console.log("run new arrival");
  let result = await book.getNewArrivals(20);
  // console.log(result);
  const booksData = result?.items || [];
  // console.log(booksData);
  const userSession = req.session.user || null;
  const userID = userSession ? userSession.userId : null;
  let resultData=await book.formattingBooks(booksData,userID);
  let myColor = await colorConverted.hexToRGB("#f8f9fa");
  let newsList = await news.getNewsByEverything("new books",15) || null;
  res.render("user-books", {
    search: "new books",
    color: myColor.rgb,
    books: resultData,
    userSession: req.session.user || null,
    news: newsList.articles || null,
  });

});

app.get("/searches", async (req, res) => {
  let search = req.query.search;
  console.log("run search",search);
  let result = await book.getSearch(search, 10);
  // console.log(result);
  const booksData = result?.items || [];
  // console.log(booksData);
  const userSession = req.session.user || null;
  const userID = userSession ? userSession.userId : null;
  let resultData=await book.formattingBooks(booksData,userID);
  // console.log(resultData);
  let myColor = await colorConverted.hexToRGB("#f8f9fa");
  let newsList = await news.getNewsByEverything(search,15) || null;
  res.render("user-books", {
    search: search,
    color: myColor.rgb,
    books: resultData,
    userSession: req.session.user || null,
    news: newsList.articles || null,
  });
});

// SEARCH RESULT: simple and detailed mode
app.get("/:category/books", async (req, res) => {
  // catogory
  let myCategory = req.params.category||req.query.filter||req.query.search;
  let getBooks={};
  console.log("run caregory/books");
  console.log(myCategory);
  if(myCategory==="new books"||myCategory==="newarrival"){
    getBooks=await book.getNewArrivals(14);
  }
  else if(book.subject.includes(myCategory)){
    getBooks = await book.getBooksByCat(myCategory,14);
  }
  else{
    getBooks = await book.getSearch(myCategory,14);
  }
  // console.log(getBooks);
  let myColor = getBooks?.color || "#f8f9fa";
  myColor = await colorConverted.hexToRGB(myColor);
  const booksData = getBooks?.data?.items || getBooks?.items || [];
  // console.log(booksData);
  const userSession = req.session.user || null;
  const userID = userSession ? userSession.userId : null;
  let resultData = await book.formattingBooks(booksData,userID);
  // console.log(resultData);
  // isFavorite = resultData.isUserFavorite;
  // console.log("isFavorite: ",isFavorite);
  console.log("user: ",userSession);

  let newsFilter = myCategory;
  if(myCategory.length > 20){
  newsFilter="literary";
  }
  console.log(newsFilter);
  let newsListOnCat = await news.getNewsByEverything(newsFilter,15) || null;
  console.log(newsListOnCat);
  res.render("user-books", {
    search: myCategory,
    color: myColor.rgb,
    books: resultData,
    news: newsListOnCat.articles || null,
    userSession: userSession,
  });
});

// BOOK LIST BY CATEGORY
app.get("/category", async (req, res) => { 
  let bookListByCategory = await book.getInitialBooks(20);
  // 14
  console.log(JSON.stringify(bookListByCategory)); 
  for (const category in bookListByCategory) {
    const books = bookListByCategory[category].data.items || [];
    // console.log(bookListByCategory[category]);
    // console.log(bookListByCategory[category].data.items);
    // console.log(books);
    books.forEach((book) => {
      const imageLinks = book.volumeInfo.imageLinks || {};
      book.volumeInfo.imageUrl =
        imageLinks.smallThumbnail ||
        imageLinks.thumbnail ||
        "/img/cover-placeholder.svg";
    });
  }
  const categoryData = Object.keys(bookListByCategory).map((category) => {
    return {
      category,
      color: bookListByCategory[category].color,
      books: bookListByCategory[category].data.items || [],
    };
  });
  res.render("category", {
    title: "Book Overview By Category",
    categoryData: categoryData,
    userSession: req.session.user || null,
  });
});

app.get("/bookdetail/:id", async (req, res) => {
  console.log("Session user data:", req.session.user);
  const userSession = req.session.user || null;
  const userID = userSession ? userSession.userId : null;
  const bookID = req.params.id;
  console.log("my detailed id: ",bookID);
  let bookDetail = await book.getBookDetail(req.params.id);
  let existingBook = await myBooks.checkBookExists(bookID);
  // console.log(existingBook);
  let isFavorite = false;
  if (req.session.user) {
    const userID = req.session.user.userId;
  isFavorite = await users.isBookInFavorites(userID,bookID);
  };

  let resultData=await book.formattingOneBook(bookDetail);
  // console.log(resultData);
  let author = resultData.volumeInfo.authors[0];
  // console.log(author);
  let authorBooks = await book.getBooksByAuthor(author);
  // console.log(authorBooks);
  let booksData = authorBooks?.items || [];
  
  let resultAuthorBooks = await book.formattingBooks(booksData,userID);
  // console.log(resultAuthorBooks);
  res.render("book-detail", {
    book: resultData,
    authorBooks:resultAuthorBooks,
    userSession: userSession,
    isFavorite:isFavorite,
  });
});


app.get("/tool", async (req, res) => {
  res.render("tools", {
    bookMarkTitle: "Generate a Bookmark",
    audioTextTitle: "Listen To Your Text",
    previewTitle:"Free eBook Preview",
  });
});

app.get("/createbookmark", async (req, res) => {
    const user = req.session.user.username;
    const id = req.session.user.userId;
    let userDetail = await users.getOneUser(id);
    for (let i = 0; i < userDetail.favorite.length; i++) {
      let fKey = userDetail.favorite[i].bookID;
      let favoriteBook = await book.getBookDetail(fKey);
      userDetail.favorite[i].image = favoriteBook.volumeInfo.imageLinks.thumbnail;
      userDetail.favorite[i].title = favoriteBook.volumeInfo.title;
      userDetail.favorite[i].link = favoriteBook.id;
    }
    let bookList = userDetail.favorite.map(fav => fav.title);
    console.log(bookList);
    // let imgUrl = await openAIData.generateBookMark(user,bookList);
    let booksToShow = bookList.slice(0, 3);
    let prompt = "Create a colorful fairy tale style image for me. My name is " + user + ", I love reading books, my book collection includes " + 
        booksToShow.map(book => `"${book}"`).join(", ") + ".";
    console.log(prompt);
    let imgUrl=await imgCreator.getImage(prompt);
// console.log("my book list: ",bookList);  
  res.render("bookmark", {
    title: "Generate a Bookmark",
    myImg: imgUrl,
    user:userDetail,
    bookList:bookList, 
  });
});

app.get("/createbookmark/:id", async (req, res) => {
  const user = req.session.user.username;
  const bookData=await book.getBookDetail(req.params.id);
  const title = bookData.volumeInfo.title;
  let prompt = `Generate a colorful and creative book cover (fairy tale style) for the book '${title}', and add my name '${user}' onto the corner of the page`;
  console.log(prompt);
  let imgUrlForBook=await imgCreator.getImage(prompt);
  res.json({ imgUrl: imgUrlForBook });
});



app.get("/audioplayground", async (req, res) => {
  res.render("audio-input", {
    title: "Audio Play"
  });
});

app.post("/text/submit", async (req, res) => {
  let myText=req.body.text;
  res.render("audio-play", {
    title: "Audio Play",
    audioText: myText,
  });
});

app.get("/search", async (req, res) => {

  res.render("search", { title:"Advanced Search"});
});


app.get("/search/submit", async (req, res) => {
if(!req.session.user) {   
  req.session.returnTo = `/search`;
  console.log("Redirecting to login, returnTo:", req.session.returnTo);
  return res.redirect("/login");
}  
if(req.session.returnTo){
  delete req.session.returnTo; 
} 
res.redirect(`/search`);
});

app.get('/advancedsearch', async (req, res) => {
const { author, title, category, isbn, publisher, ebook, 'print-type': printType, 'ebook-option': ebookOption, download, sort } = req.query;
console.log("Advanced Search Parameters:", {
  author, title, publisher, category, isbn, ebook, printType, ebookOption, download, sort
});
const searchCriteria = [];
if (title) {
  searchCriteria.push("title");  
}
if (author) {
  searchCriteria.push(`inauthor:${author}`);
}
if (publisher) {
  searchCriteria.push(`inpublisher:${publisher}`);
}
if (category) {
  searchCriteria.push(`subject:${category}`);
}
if (isbn) {
  searchCriteria.push(`isbn:${isbn}`);
}
if (ebook) {
  if (ebookOption === "free-ebooks" || ebookOption === "paid-ebooks") {
    searchCriteria.push(`filter=${ebookOption}`);
  }
  if (ebookOption === "all-ebooks") {
    searchCriteria.push(`printType=ebooks`);
  } else {
    searchCriteria.push(`printType=books`);
  }
}
if (download) {
  searchCriteria.push("download=epub");
}
if (sort) {
  searchCriteria.push(`orderBy=${sort}`);
}
const queryString = searchCriteria.length > 0 ? `${searchCriteria.join('&')}` : "";
console.log(queryString);
let searchTerm = "";
if (title) {
  searchTerm = title;  
} else if (author) {
  searchTerm = author;  
} else if (category) {
  searchTerm = category;  
} else if (publisher) {
  searchTerm = publisher;  
}else{
  searchTerm ="new";
}
console.log(searchTerm);
// add search wrong, null
let getBooks = await book.getSearch(queryString,20);
  // console.log(getBooks);
let myColor = getBooks?.color || "#f8f9fa";
  myColor = await colorConverted.hexToRGB(myColor);
  const booksData = getBooks?.items || [];
    // console.log(booksData);
  const userSession = req.session.user || null;
  const userID = userSession ? userSession.userId : null;
let resultData = await book.formattingBooks(booksData,userID);
let newsList = await news.getNewsByEverything(searchTerm,15) || null;
console.log(resultData);
console.log("user: ",userSession);
  res.render("user-books", {
    search: searchTerm,
    query:queryString,
    color: myColor.rgb,
    books: resultData,
    news: newsList.articles || null,
    userSession: userSession,
  });
});

// app.get("/publishdate", async (req, res) => {
//   const year=req.query.year;
//   const myFilter = req.query.filter;
//   res.redirect(`/${myFilter}/books?year=${year}`);
// });


app.get("/ebooks", async (req, res) => { 
  let result = await book.eBookNewArrivals(20);
  const booksData = result?.items || [];
  const userSession = req.session.user || null;
  const userID = userSession ? userSession.userId : null;
  let resultData = await book.formattingBooks(booksData,userID);
  console.log(resultData);
  res.render("ebooks", {
    title:"eBooks Library",
    books: resultData,
    userSession: req.session.user || null,
  });
});

app.get("/ebook/:id", async (req, res) => {
  let bookId = req.params.id;
  // let ISBN="9781524761356";
  // add book title
  console.log(bookId);
  res.render("ebooks-preview", {
    title: "eBook Preview",bookId:bookId
  });
});


app.post("/ebook/favorite/add/submit", async (req, res) => {
  const bookID = req.body.favorite_id;
  console.log("my id: ",bookID);
  let existingBook = await myBooks.checkBookExists(bookID);
  console.log(existingBook);

  if(!existingBook){
    console.log("Book does not exist, adding it to database...");
    await myBooks.addBook(bookID,0);
  }
  if(!req.session.user) {   
    req.session.returnTo = "/ebooks";
    console.log("Redirecting to login, returnTo:", req.session.returnTo);
    return res.redirect("/login");
  }  
  let userID = req.session.user.userId;
  await users.addFavorite(userID,bookID);
  if(req.session.returnTo){
    delete req.session.returnTo; 
  } 
  res.redirect("/ebooks");
});

app.get("/ebook/favorite/delete/submit", async (req, res) => {
  const bookID = req.query.favorite_id;
  console.log(bookID);
  let userID = req.session.user.userId;
  console.log(userID);
  let isFavorite = await users.isBookInFavorites(userID,bookID);
  if(isFavorite){
    await users.removeFavorite(userID, bookID);
  }
  res.redirect("/ebooks");
});


app.get("/profile/:userID", async (req, res) => {
  let id = req.params.userID;
  let userDetail = await users.getOneUser(id);
  let days = Math.floor((new Date() - userDetail.createdDate) / (1000 * 60 * 60 * 24));
  for (let i = 0; i < userDetail.favorite.length; i++) {
    let fKey = userDetail.favorite[i].bookID;
    let favoriteBook = await book.getBookDetail(fKey);
    userDetail.favorite[i].image = favoriteBook.volumeInfo.imageLinks.thumbnail;
    userDetail.favorite[i].link = favoriteBook.id;
    userDetail.favorite[i].title = favoriteBook.volumeInfo.title;
  }
    // weather card
    let address = await weather.getIP();
    let lat, lon, myCountry;
    let location = await weather.getLocationA(address.ip);
    if (
      location.error.info ===
      "Your monthly usage limit has been reached. Please upgrade your Subscription Plan."
    ) {
      location = await weather.getLocationB(address.ip);
      if (location === "cannot get locationB") {
        // get Humber location
        // console.log("locationB is wrong");
        lat = "43.728822";
        lon = "-79.609511";
        myCountry = "CA";
      } else {
        let loc = location.loc;
        // console.log(loc);
        [lat, lon] = loc.split(",").map(Number);
        myCountry = location.country;
      }
    } else {
      lat = location.latitude;
      lon = location.longitude;
      myCountry = location.country_code;
    }
    // console.log(lat,lon);
    let flag = `https://flagsapi.com/${myCountry}/flat/64.png`;
    // console.log(flag);
    let weatherSection = await weather.getWeather(lat, lon);
    // console.log(weatherSection);
    let kelvin = await weatherSection.main.temp;
    let celsius = (kelvin - 273.15).toFixed(1);
    // console.log(celsius);
    let date = new Date();
    let shortDate = date.toLocaleDateString("en-US");
  res.render("users/profile", {
    Title: "My Favorite", 
    user:userDetail, 
    userID:id, 
    days:days,      
    weather: weatherSection,
    position: location,
    temp: celsius,
    date: shortDate,
    flag: flag, });
});

app.post("/userbooks/favorite/add/submit", async (req, res) => {
  const bookID = req.body.favorite_id;
  const myFilter = req.body.filter;
  console.log("my id: ",bookID,myFilter);
  let existingBook = await myBooks.checkBookExists(bookID);
  console.log(existingBook);

  if(!existingBook){
    console.log("Book does not exist, adding it to database...");
    await myBooks.addBook(bookID,0);
  }
  if(!req.session.user) {   
    req.session.returnTo = `/${myFilter}/books`;
    console.log("Redirecting to login, returnTo:", req.session.returnTo);
    return res.redirect("/login");
  }  
  let userID = req.session.user.userId;
  await users.addFavorite(userID,bookID);
  if(req.session.returnTo){
    delete req.session.returnTo; 
  } 
  res.redirect(`/${myFilter}/books`);
});

app.get("/userbooks/favorite/delete/submit", async (req, res) => {
  const bookID = req.query.favorite_id;
  console.log(bookID);
  const myFilter = req.query.filter;
  console.log("my filter:",myFilter);
  let userID = req.session.user.userId;
  console.log(userID);
  let isFavorite = await users.isBookInFavorites(userID,bookID);
  if(isFavorite){
    await users.removeFavorite(userID, bookID);
  }
  res.redirect(`/${myFilter}/books`);
});



app.post("/bookdetail/favorite/add/submit", async (req, res) => {
  const bookID = req.body.favorite_id;
  console.log("my id: ",bookID);
  let existingBook = await myBooks.checkBookExists(bookID);
  console.log(existingBook);

  if(!existingBook){
    console.log("Book does not exist, adding it to database...");
    await myBooks.addBook(bookID,0);
  }
  if(!req.session.user) {   
    req.session.returnTo = `/bookdetail/${bookID}`;
    console.log("Redirecting to login, returnTo:", req.session.returnTo);
    return res.redirect("/login");
  }  
  let userID = req.session.user.userId;
  await users.addFavorite(userID,bookID);
  if(req.session.returnTo){
    delete req.session.returnTo; 
  } 
  const returnTo = `/bookdetail/${bookID}`;
  res.redirect(returnTo);
});

app.get("/bookdetail/favorite/delete/submit", async (req, res) => {
  const bookID = req.query.favorite_id;
  let userID = req.session.user.userId;
  let isFavorite = await users.isBookInFavorites(userID,bookID);
  if(isFavorite){
    await users.removeFavorite(userID, bookID);
  }
  res.redirect(`/bookdetail/${bookID}`);
});
 

// ADMIN SYSTEM - TBD: Add different admin name
app.get("/admin/library", async (req, res) => {
  // console.log('Current session:', req.session);
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }
  res.render("admin/library-admin", { userSession: req.session.user });
});

// ADMIN - USER-LIST
app.get("/admin/users", async (req, res) => {
  let userList = await users.getUsers();
  if (!userList.length) {
    await users.initializeUsers();
    userList = await users.getUsers();
  }
  const formatUserList = userList.map((user) => {
    user.createdDateFormatted = new Date(user.createdDate)
      .toISOString()
      .split("T")[0];
    return user;
  });
  res.render("admin/user-list", {
    title: "User List",
    userList: formatUserList,
    userSession: req.session.user,
  });
});

app.get("/admin/user/add", async (req, res) => {
  const error = req.session.error || null;
  req.session.error = null;
  let userList = await users.getUsers();
  res.render("admin/user-add", {
    title: "Add A User",
    users: userList,
    messages: { error },
    userSession: req.session.user,
  });
});

app.post("/admin/user/add/submit", async (req, res) => {
  let newUsername = req.body.username;
  let newEmail = req.body.email;
  let newPassword = req.body.password;

  let userResult = await users.findOneByemail(newEmail);
  if (userResult) {
    return res.render("admin/user-add", {
      title: "Add A User",
      messages: {
        error: "Email already in use. Cannot add existing account.",
        userSession: req.session.user,
      },
    });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.render("admin/user-add", {
      title: "Add A User",
      messages: { error: "Email invalid." },
      userSession: req.session.user,
    });
  }
  await users.addUser(newUsername, newEmail, newPassword);
  res.redirect("/admin/users");
});

app.get("/admin/user/delete", async (req, res) => {
  let id = req.query.userId;
  await users.deleteUser(id);
  res.redirect("/admin/users");
});

app.get("/admin/user/edit", async (req, res) => {
  const error = req.session.error || null;
  req.session.error = null;
  if (req.query.userId) {
    let userToEdit = await users.getOneUser(req.query.userId);
    let userList = await users.getUsers();
    res.render("admin/user-edit", {
      title: "Edit User Information",
      users: userList,
      editUser: userToEdit,
      messages: { error },
      userSession: req.session.user,
    });
  } else {
    res.redirect("/admin/users");
  }
});

app.post("/admin/user/edit/submit", async (req, res) => {
  let id = req.body.userId;
  let idFilter = { _id: new ObjectId(id) };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(req.body.email)) {
    let userToEdit = await users.getOneUser(id);
    let userList = await users.getUsers();
    return res.render("admin/user-edit", {
      title: "Edit User Information",
      users: userList,
      editUser: userToEdit,
      messages: { error: "Email invalid." },
      userSession: req.session.user,
    });
  }
  let updatedUser = {
    username: req.body.username || currentUser.username,
    email: req.body.email || currentUser.email,
    password: req.body.password, 
    role: req.body.role || currentUser.role,
  };
  console.log(updatedUser);
  let test = await users.updateUser(idFilter, updatedUser);
  console.log(test);
  res.redirect("/admin/users");
});

// ADMIN - BOOK-LIST  TBC: add different views
app.get("/admin/booklist", async (req, res) => {
  let bookList = await myBooks.getBooks();
  if (!bookList.length) {
    await myBooks.initializeBooks();
    bookList = await myBooks.getBooks();
  }
  const details = [];
  for (let b of bookList) {
    const createdDateFormatted = new Date(b.createdDate)
      .toISOString()
      .split("T")[0];
    let googleBook = await book.getBookDetail(b.bookID);
    const imageLinks = googleBook.volumeInfo.imageLinks || {};
    googleBook.volumeInfo.imageUrl =
      imageLinks.smallThumbnail ||
      imageLinks.thumbnail ||
      "/img/cover-placeholder.svg";
    const industryIdentifiers = googleBook.volumeInfo.industryIdentifiers || [];
    const isbn10 =
      industryIdentifiers.find((id) => id.type === "ISBN_10")?.identifier ||
      "N/A";
    const isbn13 =
      industryIdentifiers.find((id) => id.type === "ISBN_13")?.identifier ||
      "N/A";
    details.push({
      _id: b._id,
      stock:b.stock,
      createdAt:createdDateFormatted,
      googleBook: googleBook,
      isbn10: isbn10,
      isbn13: isbn13,
    });
  }
  res.render("admin/book-list", {
    title: "Book List in the Library",
    bookDetails: details,
    userSession: req.session.user,
  });
});

app.get("/admin/book/googlebooks/add", async (req, res) => {
  const userSession = req.session.user || null;
  const userID = userSession ? userSession.userId : null;
  let result = await book.getNewArrivals(20);
  let bookList = result?.items || [];
  let resultData = await book.formattingBooks(bookList,userID);
  let newResults = await Promise.all(resultData.map(async (book) => {
    let isExists = await myBooks.checkBookExists(book.id);  
    return { ...book, isExists }; 
  }));
  console.log(newResults);
  res.render("admin/book-gb-add", {
    title: "Add Books from Google Books",
    books: newResults,
    userSession: req.session.user,
  });
});

app.post("/admin/googlebooks/add/submit", async (req, res) => {
  let selectedBookID = req.body.pickGb;
  console.log(selectedBookID);
  await myBooks.addBookIdArray(selectedBookID);
  res.redirect("/admin/booklist");
});

app.get("/admin/book/delete", async (req, res) => {
  let id = req.query.bookId;
  await myBooks.deleteBook(id);
  res.redirect("/admin/booklist");
});

app.get("/admin/book/edit", async (req, res) => {
  const error = req.session.error || null;
  req.session.error = null;
  if (req.query.bookId) {
    let bookToEdit = await myBooks.getOneBookByID(req.query.bookId);
    let googleBookID = bookToEdit.bookID;
    let bookDetail = await book.getBookDetail(googleBookID);
    let bookData = await book.formattingOneBook(bookDetail);
    // let bookList = await myBooks.getBooks();
    res.render("admin/book-edit", {
      title: "Edit Book Stock",
      // books: bookList,
      editBook: bookToEdit,
      book:bookData,
      messages: { error },
      userSession: req.session.user,
    });
  } else {
    res.redirect("/admin/booklist");
  }
});

app.post("/admin/book/edit/submit", async (req, res) => {
  let id = req.body.bookId;
  let idFilter = { _id: new ObjectId(id) };
  // let bookToEdit = await myBooks.getOneBookByID(id);   
  let updatedBook = {
    stock: req.body.stock,
  };
  let test = await myBooks.updateBook(idFilter, updatedBook);
  // console.log(test);
  res.redirect("/admin/booklist");
});



//set up server listening
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
