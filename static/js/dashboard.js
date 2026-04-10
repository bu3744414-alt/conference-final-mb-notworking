

document.addEventListener("DOMContentLoaded", () => {

    const today = new Date().toISOString().split('T')[0];

    const myDate = document.getElementById("myBookingDate");
    const adminDate = document.getElementById("adminBookingDate");

    if(myDate) myDate.value = today;
    if(adminDate) adminDate.value = today;

});


function showDashboard(){

    document.getElementById("dashboardPanel").style.display="block";

    document.getElementById("availabilityPanel").style.display="none";
    document.getElementById("myBookingsPanel").style.display="none";
    document.getElementById("adminBookingsPanel").style.display="none";
}


function toggleUserMenu(){
    const menu = document.getElementById("userMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function showPopup(title, message){
    document.getElementById("popupTitle").innerText = title;
    document.getElementById("popupMessage").innerText = message;
    document.getElementById("popupOverlay").style.display = "flex";
}

function closePopup(){
    document.getElementById("popupOverlay").style.display = "none";
}

document.addEventListener("DOMContentLoaded", function () {

    const today = new Date().toISOString().split('T')[0];

    const bookingDate = document.getElementById("bookingDate");
    const myBookingDate = document.getElementById("myBookingDate");
    const adminBookingDate = document.getElementById("adminBookingDate");
    const resDate = document.getElementById("resDate");
    const exportStart = document.getElementById("exportStart");
    const exportEnd = document.getElementById("exportEnd");

    const startTime = document.getElementById("startTime");
    const endTime = document.getElementById("endTime");

    if (bookingDate) {
        bookingDate.value = today;
        bookingDate.min = today;
    }

    if (myBookingDate) myBookingDate.value = today;
    if (adminBookingDate) adminBookingDate.value = today;

    if (resDate) {
        resDate.value = today;
        resDate.min = today;
    }

    if (exportStart) exportStart.value = today;
    if (exportEnd) exportEnd.value = today;

    if (startTime) startTime.value = "09:00";
    if (endTime) endTime.value = "18:00";

});

document.addEventListener("DOMContentLoaded", function () {

    const today = new Date().toISOString().split('T')[0];

    const dateInput = document.getElementById("bookingDate");
    const startInput = document.getElementById("startTime");
    const endInput = document.getElementById("endTime");

    const resDate = document.getElementById("resDate");

    if(resDate){
        resDate.value = today;
        resDate.min = today;
    }

    if (dateInput) {
        dateInput.value = today;
        dateInput.min = today;
    }

    if (startInput) startInput.value = "09:00";
    if (endInput) endInput.value = "18:00";

});


function showDashboard(){

    document.getElementById("dashboardPanel").style.display="block";

    document.getElementById("availabilityPanel").style.display="none";
    document.getElementById("myBookingsPanel").style.display="none";
    document.getElementById("adminBookingsPanel").style.display="none";
}

function toggleUserMenu(){
    const menu = document.getElementById("userMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

/* POPUP */
function showPopup(title, message){
    document.getElementById("popupTitle").innerText = title;
    document.getElementById("popupMessage").innerText = message;
    document.getElementById("popupOverlay").style.display = "flex";
}

function closePopup(){
    document.getElementById("popupOverlay").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("myBookingDate").value =
        new Date().toISOString().split('T')[0];
});

document.addEventListener("DOMContentLoaded", () => {

    const today = new Date().toISOString().split('T')[0];

    const start = document.getElementById("exportStart");
    const end = document.getElementById("exportEnd");

    if(start) start.value = today;
    if(end) end.value = today;

});
/* MONTHLY BOOKINGS */
/* MONTHLY BOOKINGS */
function openMonthlyBookings(){

    document.getElementById("dashboardPanel").style.display="none";
    document.getElementById("availabilityPanel").style.display="none";
    document.getElementById("myBookingsPanel").style.display="none";
    document.getElementById("adminBookingsPanel").style.display="none";

    document.getElementById("monthlyBookingsPanel").style.display="block";

    // ⭐ auto select current month
    const monthInput = document.getElementById("monthYear");

    if(monthInput && !monthInput.value){
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2,'0');

        monthInput.value = `${year}-${month}`;
    }

    // ⭐ auto load bookings
    loadMonthlyBookings();
}

// MONTLY DATA TO LOAD DIRECTLY FROM THE MONTH AND YEAR PICKER JAVASCRIPT CODE 
/*async function loadMonthlyBookings(){

    const monthYear = document.getElementById("monthYear").value;

    if(!monthYear){
        alert("Select month");
        return;
    }

    const format = monthYear; // 2026-03

    const res = await fetch("/monthly_bookings?month=" + format);
    const data = await res.json();

    const list = document.getElementById("monthlyTableBody");
    list.innerHTML = "";

    if(data.length === 0){
        list.innerHTML = "<tr><td colspan='6'>No bookings found</td></tr>";
        return;
    }
    const today = new Date().toISOString().split("T")[0];
    data.forEach(b => {

        list.innerHTML += `
        <tr>
            <td>${b.trn_date.split(" ")[0]}</td>
            <td>${b.hall}</td>
            <td>${b.start_time.substring(0,5)}</td>
            <td>${b.end_time.substring(0,5)}</td>
            <td>${b.purpose}</td>
            <td>${b.status}</td>
        </tr>
        `;
        console.log("Monthly bookings loading...");
    });

}*/



async function loadMonthlyBookings(month){

    if(!month){
        const date = document.getElementById("myBookingDate").value;
        month = date.substring(0,7);
    }

    const res = await fetch("/monthly_bookings?month=" + month);
    const data = await res.json();

    const list = document.getElementById("monthlyTableBody");
    list.innerHTML = "";

    if(data.length === 0){
        list.innerHTML = "<tr><td colspan='6'>No bookings found</td></tr>";
        return;
    }

    data.forEach(b => {

        const d = b.trn_date.split(" ")[0].split("-");
        const formattedDate = `${d[2]}-${d[1]}-${d[0]}`;
        list.innerHTML += `
        <tr>
            <td>${formattedDate}</td>
            <td>${b.hall}</td>
            <td>${b.start_time.substring(0,5)}</td>
            <td>${b.end_time.substring(0,5)}</td>
            <td>${b.purpose}</td>
            <td>${b.status}</td>
        </tr>
        `;

    });

}



function loadFromDate(){

    const date = document.getElementById("myBookingDate").value;
    if(!date) return;

    const month = date.substring(0,7);

    loadMyBookings();                     // daily bookings
    
    loadMonthlyBookings();                // monthly bookings
}
document.getElementById("myBookingDate")
.addEventListener("change", loadFromDate);

window.addEventListener("DOMContentLoaded", () => {

    const today = new Date().toISOString().split("T")[0];
    document.getElementById("myBookingDate").value = today;

    loadFromDate();

});

function openRescheduleModal(booking) {
    closeAllModals();   // 🔥 ADD THIS
    // Set date
    document.getElementById("rescheduleDate").value = booking.date;

    // ✅ Set default times
    document.getElementById("rescheduleStartTime").value = booking.start;
    document.getElementById("rescheduleEndTime").value = booking.end;

    // Clear reason (optional)
    document.getElementById("rescheduleReason").value = "";

    // Show modal
    document.getElementById("rescheduleModal").style.display = "block";
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(m => {
        m.style.display = 'none';
    });
}
