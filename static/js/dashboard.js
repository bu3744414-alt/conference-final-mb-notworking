// my secound code which is acutaully running and causing the problem 

document.addEventListener("DOMContentLoaded", () => {

    const today = new Date().toISOString().split('T')[0];

    const myDate = document.getElementById("myBookingDate");
    const adminDate = document.getElementById("adminBookingDate");

    if(myDate) myDate.value = today;
    if(adminDate) adminDate.value = today;

});





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


// 🔥 ADD THIS AT TOP
let chartsLoaded = false;


function showDashboard(){

    document.getElementById("dashboardPanel").style.display="block";

    document.getElementById("availabilityPanel").style.display="none";
    document.getElementById("myBookingsPanel").style.display="none";
    document.getElementById("adminBookingsPanel").style.display="none";

    // 🔥 ADD THIS
    // 🔥 LOAD ONLY ONCE
    if(!chartsLoaded){
        loadCharts();
        chartsLoaded = true;
    }
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


async function loadFromDate(){

    let dateInput = document.getElementById("myBookingDate");

    // ✅ FORCE DEFAULT DATE FIRST
    if(!dateInput.value){
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
    }

    const date = dateInput.value;

    console.log("DATE USED 👉", date);

    await loadMyBookings();

    // ✅ NOW month will NEVER be empty
    await loadMonthlyBookings();
}


function openMyBookings(){

    console.log("OPEN MY BOOKINGS CLICKED");

    const dashboard = document.getElementById("dashboardPanel");
    const availability = document.getElementById("availabilityPanel");
    const admin = document.getElementById("adminBookingsPanel");
    const myPanel = document.getElementById("myBookingsPanel");

    // ✅ SAFE HIDING
    if(dashboard) dashboard.style.display = "none";
    if(availability) availability.style.display = "none";
    if(admin) admin.style.display = "none";

    // ✅ SAFE SHOW
    if(myPanel) myPanel.style.display = "block";
    else {
        console.error("❌ myBookingsPanel not found");
        return;
    }

    // ✅ DATE SET
    const dateInput = document.getElementById("myBookingDate");

    if(dateInput && !dateInput.value){
        dateInput.value = new Date().toISOString().split("T")[0];
    }

    console.log("DATE SET 👉", dateInput ? dateInput.value : "NOT FOUND");

    // ✅ LOAD DATA
    loadFromDate();
}

async function loadMonthlyBookings(){

    const dateInput = document.getElementById("myBookingDate");

    let date = dateInput.value;

    // ✅ EXTRA SAFETY
    if(!date){
        date = new Date().toISOString().split("T")[0];
        dateInput.value = date;
    }

    const month = date.substring(0,7);

    console.log("MONTH SENT 👉", month);

    const res = await fetch("/monthly_bookings?month=" + month);
    const data = await res.json();

    console.log("DATA RECEIVED 👉", data);

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


const dateInput = document.getElementById("myBookingDate");

if(dateInput){
    dateInput.addEventListener("change", loadFromDate);
}

window.addEventListener("DOMContentLoaded", () => {

    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("myBookingDate");

    if(dateInput){
        dateInput.value = today;  // ✅ THIS IS CRITICAL
        dateInput.addEventListener("change", loadFromDate);
    }

    showDashboard();
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
