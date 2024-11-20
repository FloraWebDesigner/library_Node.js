document.addEventListener("DOMContentLoaded", function() {
    console.log("add active native format");
    const currentPage = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const hrefValue = link.getAttribute('href');
      if (currentPage.includes(hrefValue) && hrefValue !== '/') {
        link.classList.add('active');
      }
    });
  });
