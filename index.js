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
// mongoSchema
// const bookid=require("./modules/mongoDB/db-book");
const users = require("./modules/mongoDB/db-user");
const myBooks = require("./modules/mongoDB/db-myBook");
const activity = require("./modules/mongoDB/db-activity");
const { stringify } = require("querystring");

//set up Express app
const app = express();
const port = process.env.PORT || 1008;

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

app.use(async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  // console.log(sessionId);
  if (sessionId) {
    const user = await users.getOneBySessionID(sessionId);
    if (user) {
      req.session = { user: { username: user.username, role: user.role } };
      app.locals.userSession = req.session.user;
    } else {
      app.locals.userSession = null;
    }
  } else {
    app.locals.userSession = null;
  }
  next();
});

app.get("/login", async (req, res) => {
  const error = req.flash("error");
  let userList = await users.getUsers();
  // console.log(userList);
  if (!userList.length) {
    await users.initializeUsers();
    userList = await users.getUsers();
  }
  res.render("login/login", { title: "Login", messages: { error } });
});

app.post("/login/submit", async (req, res) => {
  const { email, password } = req.body;
  console.log(password);
  let userResult = await users.findOneByemail(email);
  console.log(userResult);
  if (userResult) {
    const verifyValue = await users.verifyPassword(
      password,
      userResult.password
    );
    if (verifyValue) {
      // npm install uuid
      const sessionId = uuidv4();
      userResult.sessionId = sessionId;
      await userResult.save();
      res.cookie("sessionId", sessionId, { maxAge: oneDay, httpOnly: true });
      console.log(req.cookies);
      req.session.user = {
        username: userResult.username,
        role: userResult.role,
        email: userResult.email,
      };
      console.log("Session data after login:", userResult);
      if (userResult.role === "admin") {
        // console.log("Redirecting to admin library");
        return res.redirect("/admin/library");
      } else {
        return res.redirect("/");
      }
    } else {
      req.flash("error", "Password incorrect");
      // req.flash('title', 'Login');
      return res.redirect("/login");
    }
  } else {
    req.flash("error", "No user with that email");
    // req.flash('title', 'Login');
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
app.get("/books", async (req, res) => {
  let input = req.query.search;
  // console.log(input);
  let result = await book.getSearch(input, 40);
  // console.log(result);
  result.items.forEach((book) => {
    const imageLinks = book.volumeInfo.imageLinks || {};
    book.volumeInfo.imageUrl =
      imageLinks.smallThumbnail ||
      imageLinks.thumbnail ||
      "img/cover-placeholder.svg";
  });
  res.render("books", {
    userSearch: input,
    userBook: result.items,
    userSession: req.session.user || null,
  });
});

// SEARCH RESULT: simple and detailed mode
app.get("/:category/books", async (req, res) => {
  let myCategory = req.params.category;
  let getBooks = await book.getBooksByCat(myCategory);
  let myColor = getBooks?.color || "#f8f9fa";
  myColor = await colorConverted.hexToRGB(myColor);
  const booksData = getBooks?.data?.items || getBooks?.items || [];
  for (let book of booksData) {
    const imageLinks = book.volumeInfo.imageLinks || {};
    book.volumeInfo.imageUrl =
      imageLinks.smallThumbnail ||
      imageLinks.thumbnail ||
      "img/cover-placeholder.svg";

    let rating = book.volumeInfo?.averageRating || 0;
    let identifiers = book.volumeInfo?.industryIdentifiers || [];
    let isbn13 = null;
    let isbn10 = null;
    if (identifiers) {
      isbn13 = identifiers.find((id) => id.type === "ISBN_13")?.identifier;
      isbn10 = identifiers.find((id) => id.type === "ISBN_10")?.identifier;
    }
    // console.log("rating:",rating);
    // console.log("isbn13:",isbn13);
    // console.log("isbn10:",isbn10);
    if (rating === 0) {
      let tempRate = await openLibrary.getRating(isbn13);
      rating = tempRate.summary.average;
      // console.log("tempRate",tempRate);
      // console.log("rating1:",rating);
    }
    if (rating === 0) {
      let tempRate = await openLibrary.getRating(isbn10);
      rating = tempRate.summary.average;
      // console.log("tempRate",tempRate);
      // console.log("rating2:",rating);
    }
    book.volumeInfo.rating = rating;
  }
  res.render("category-books", {
    cat: myCategory,
    catColor: myColor.rgb,
    catBook: booksData,
    userSession: req.session.user || null,
  });
});

// BOOK LIST BY CATEGORY
app.get("/category", async (req, res) => {
  let bookListByCategory = await book.getInitialBooks(14);
  // console.log(JSON.stringify(bookListByCategory));
  for (const category in bookListByCategory) {
    const books = bookListByCategory[category].data.items || [];
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
  let bookDetail = await book.getBookDetail(req.params.id);
  // console.log(bookDetail);
  res.render("book-detail", {
    book: bookDetail,
    userSession: req.session.user || null,
  });
});

app.get("/new_arrival", async (req, res) => {
  let newBookList = await book.getNewArrivals();
  // let newsList = await news.getNewsByEverything();
  // console.log(newsList);
  res.render("new", {
    pageTitle: "New Arrival",
    newBooks: newBookList,
    // news: newsList.articles
  });
});

app.get("/technical_tools", async (req, res) => {
  // you can change the period here to be daily , weekly , monthly , yearly , all
  let input = req.query.AI;
  let imgUrl = await openAIData.generateBookMark(input);
  res.render("tools", {
    bookMarkTitle: "Generate a Bookmark",
    audioBookTitle: "Listen To an Audio Book",
    img: imgUrl,
    userSession: req.session.user || null,
  });
});

app.get("/search", async (req, res) => {
  // add advanced search
  res.render("search", {
    Title: "Find Your Book",
    userSession: req.session.user || null,
  });
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
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
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
      googleBook: googleBook,
      isbn10: isbn10,
      isbn13: isbn13,
    });
  }
  res.render("admin/book-list", {
    title: "Book List in Library",
    bookDetails: details,
    userSession: req.session.user,
  });
});

app.get("/admin/book/googlebooks/add", async (req, res) => {
  let bookList = await book.getNewArrivals();
  bookList.items.forEach((b) => {
    const imageLinks = b.volumeInfo.imageLinks || {};
    b.volumeInfo.imageUrl =
      imageLinks.smallThumbnail ||
      imageLinks.thumbnail ||
      "/img/cover-placeholder.svg";
  });
  res.render("admin/book-gb-add", {
    title: "Add Books from Google Books",
    books: bookList.items,
    userSession: req.session.user,
  });
});

app.post("/admin/book/googlebooks/add/submit", async (req, res) => {
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

//set up server listening
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
