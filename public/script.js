const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

function changeView() {
    var largeView = document.querySelector(".large-view");
    var smallView = document.querySelector(".small-view");
    var thumbnailView = document.querySelector(".thumbnail-view");
    
    if (document.getElementById("largeView").checked) {
      largeView.style.display = "flex";
      smallView.style.display = "none";
      thumbnailView.style.display = "none";
    } else if (document.getElementById("smallView").checked) {
      smallView.style.display = "flex";
      largeView.style.display = "none";
      thumbnailView.style.display = "none";
    }
    else{
      smallView.style.display = "none";
      largeView.style.display = "none";
      thumbnailView.style.display = "flex";
    }
}


function changeBookView() {

  var imgView = document.querySelector(".img-view");
  var tabView = document.querySelector(".tab-view");

  if (document.getElementById("imgView").checked) {
    imgView.style.display = "flex"; 
    tabView.style.display = "none";  
  } else if (document.getElementById("tabView").checked) {
    imgView.style.display = "none";  
    tabView.style.display = "block";  
  }
}


function myFunction() {
    var x = document.getElementById("myPassword");
    if (x.type === "password") {
      x.type = "text";
    } else {
      x.type = "password";
    }
  }


function confirmDeleteUser(id,name) {
    let confirm = window.confirm("Are you are you want to delete "+name+"? The action cannot be undo.");
    if(confirm)
    {window.location.href=`/admin/user/delete?userId=${id}`;
}
else{ return false;}
}

function confirmDeleteBook(id,name) {
    let confirm = window.confirm("Are you are you want to delete "+name+"? The action cannot be undo.");
    if(confirm)
    {window.location.href=`/admin/book/delete?bookId=${id}`;
}
else{ return false;}
}

function copyToClipboard(isbnId) {
  var isbnText = document.getElementById(isbnId).innerText;
  navigator.clipboard.writeText(isbnText).then(function() {
      alert('ISBN copied to clipboard!');
  }).catch(function(err) {
      alert('Failed to copy: ' + err);
  });
}

function toggleMoreOption() {
  let eBookOption = document.getElementById("eBookOption");
  let eBookCheckbox = document.getElementById("ebook");

  // Toggle display based on checkbox status
  if (eBookCheckbox.checked) {
    eBookOption.style.display = "flex"; 
  } else {
    eBookOption.style.display = "none"; 
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var collapseElements = document.querySelectorAll('.collapse');
  collapseElements.forEach(function (collapseElement) {
    new bootstrap.Collapse(collapseElement, {
      toggle: false
    });
  });
});

function showBookMarkforUser() {
  const bookmarkforuser = document.getElementById("bookMarkforUser");
  let showBookMarkforUserBtn = document.getElementById("showBookMarkforUserBtn");
  let bookMarkWrapper=document.getElementById("bookMarkWrapper");

  if (bookmarkforuser.style.display === "none") {
    bookmarkforuser.style.display = "flex";
    showBookMarkforUserBtn.innerText = "Hide the Book Mark";
  } else {
    bookmarkforuser.style.display = "none";
    showBookMarkforUserBtn.innerText = "I want to bookmark my favorites";
  }
  if (bookMarkWrapper.innerHTML !== "") {
    bookmarkforuser.style.display = "none";
    showBookMarkforUserBtn.innerText = "I want to bookmark my favorites";
  }
}

async function createBookmark(id) {
  try {  
  let response = await fetch(`/createbookmark/${id}`);
  let data = await response.json();
  let imgUrl = data.imgUrl;

  const wrapper = document.getElementById("bookMarkWrapper");
    wrapper.innerHTML = '';

    let imgElement = document.createElement('img');
    imgElement.src = imgUrl;
    imgElement.alt = `Generated Bookmark for book ID ${id}`;
    imgElement.classList.add('mx-auto', 'mt-2');

    wrapper.appendChild(imgElement); 

  } catch (error) {
    console.error("Error generating image:", error);
  }
}



function changePreviewView() {

  var largeView = document.querySelector(".large-view");
  var thumbnailView = document.querySelector(".thumbnail-view");

  if (document.getElementById("largeView").checked) {
    largeView.style.display = "flex"; 
    thumbnailView.style.display = "none";  
  } else if (document.getElementById("thumbnailView").checked) {
    thumbnailView.style.display = "flex";  
    largeView.style.display = "none";  
  }
}