const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

function changeView() {
    var minimalistView = document.querySelector(".minimalist-view");
    var detailedView = document.querySelector(".Detailed-view");
    
    if (document.getElementById("MinimalistView").checked) {
        minimalistView.style.display = "flex";
        detailedView.style.display = "none";
    } else {
        minimalistView.style.display = "none";
        detailedView.style.display = "flex";
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


const { addFavorite, removeFavorite } = require('../modules/mongoDB/db-user');