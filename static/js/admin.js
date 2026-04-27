
const hallNames = {
    101: "First Floor Conference",
    102: "First Floor Conference Small",
    201: "Second Floor Conference",
    301: "Third Floor Conference",
    401: "Fourth Floor Conference"
};
async function loadAdminBookings(){

    document.getElementById("dashboardPanel").style.display="none";
    document.getElementById("availabilityPanel").style.display="none";
    document.getElementById("myBookingsPanel").style.display="none";
    document.getElementById("adminBookingsPanel").style.display="block";

    const date = document.getElementById("adminBookingDate").value;

    let url = "/all_bookings";
    if(date){
        url += "?date=" + date;
    }

    const res = await fetch(url);
    const bookings = await res.json();

    const box = document.getElementById("adminBookingsList");
    box.innerHTML = "";

    if(bookings.length === 0){
        box.innerHTML = "<p>No bookings found</p>";
        return;
    }

    bookings.forEach(b => {

        let statusText = b.status;

        // ✅ Status override
        if(b.status !== "Cancelled"){
            if(b.reassign == 1){
                statusText = "Reassigned";
            }
            else if(b.rescheduled == 1){
                statusText = "Rescheduled";
            }
        }

        const today = new Date().toISOString().split('T')[0];

        // 🔥 ACTION MENU
        let actionMenu = "";
        if(b.date >= today && b.status !== "Cancelled"){
            actionMenu = `
            <div class="menu-container">
                <button class="menu-btn" onclick="toggleMenu(this, event)">⋯</button>
                <div class="menu-popup hidden">
                    <button onclick="openReassign(${b.id}, '${b.date}', '${b.start}', '${b.end}', event)">
                        Reassign Hall
                    </button>
                    <button class="cancel-btn" onclick="openCancel(${b.id}, event)">
                        Cancel
                    </button>
                </div>
            </div>`;
        }

        // ===============================
        // ✅ MAIN FIX IS HERE 👇
        // ===============================

        let infoBlock = "";

        // 🟢 ALWAYS show PURPOSE FIRST
        let purposeLine = `
            <br>
            <small>
                Purpose of Booking: ${b.purpose && b.purpose.trim() !== "" ? b.purpose : "Not specified"}
            </small>
        `;

        // 🔴 CANCELLED
        if(b.status === "Cancelled"){
            infoBlock = `
                ${purposeLine}
                <br>
                <small style="color:red; font-weight:600;">
                    Cancelled by: ${b.admin_name ? b.admin_name : "ADMIN"} (ADMIN)
                </small>
                <br>
                <small style="color:#555;">
                    Cancellation Reason: ${
                        b.admin_remarks && b.admin_remarks.trim() !== "" 
                        ? b.admin_remarks 
                        : "Not specified"
                    }
                </small>
            `;
        }

        // 🟢 REASSIGNED
        else if(b.reassign == 1){
            infoBlock = `
                ${purposeLine}
                <br>
                <small style="color:green; font-weight:600;">
                    Reassigned by: ${b.admin_name ? b.admin_name : "ADMIN"} (ADMIN)
                </small>
                <br>
                <small style="color:#555;">
                    Reassign Reason: ${
                        b.reassign_reason && b.reassign_reason.trim() !== "" 
                        ? b.reassign_reason 
                        : "Not specified"
                    }
                </small>
            `;
        }

        // 🔵 RESCHEDULED
        else if(b.rescheduled == 1){
            infoBlock = `
                ${purposeLine}
                <br>
                <small style="color:blue; font-weight:600;">
                    Reschedule Reason: ${
                        b.resch_reason && b.resch_reason.trim() !== "" 
                        ? b.resch_reason 
                        : "Not specified"
                    }
                </small>
            `;
        }

        // 🟢 BOOKED
        else{
            infoBlock = purposeLine;
        }

        // ===============================
        // END FIX
        // ===============================

        // 🟢 DEPARTMENT INFO
        let deptText = "";
        if(b.role === "admin"){
            deptText = `
                <small>User Department: ${b.user_dept}</small><br>
                <small>Booked for: ${b.department}</small> (DEPARTMENT)<br>
                <small>Booked by: ${b.user} (ADMIN)</small>
            `;
        } else {
            deptText = `
                <small>User Department: ${b.department}</small><br>
                <small>Booked by: ${b.user}</small>
            `;
        }

        // 🟢 HALL DISPLAY
        let hallDisplay = `<b>${hallNames[b.old_hall] || b.old_hall}</b>`;

        if(b.reassign == 1){
            hallDisplay = `
                <b>${hallNames[b.old_hall] || b.old_hall}</b> → 
                <b>${hallNames[b.new_hall] || b.new_hall}</b>
            `;
        }

        // ✅ FINAL UI
        box.innerHTML += `
        <div class="booking-card">

            <div class="booking-left">
                ${hallDisplay}<br>

                ${deptText}

                ${infoBlock}
            </div>

            <div class="booking-middle">
                Date: ${b.date}<br>
                Time: ${b.start} - ${b.end}
            </div>

            <div class="booking-status ${statusText.toLowerCase()}">
                ${statusText}
            </div>

            <div class="booking-actions">
                ${actionMenu}
            </div>

        </div>`;
    });     
}

/* convert to 24hrs   */
function convertTo24Hour(time) {
    let [t, modifier] = time.split(" ");
    let [hours, minutes] = t.split(":");

    if (modifier === "PM" && hours !== "12") hours = +hours + 12;
    if (modifier === "AM" && hours === "12") hours = "00";

    return `${hours}:${minutes}`;
}



async function confirmCancel(){

    if(!cancelBookingId){
        showPopup("Error","No booking selected");
        return;
    }

    const reason = document.getElementById("cancelReason").value.trim();

    if(!reason){
        showPopup("Error","Please enter cancellation reason");
        return;
    }

    const fd = new FormData();
    fd.append("reason", reason);

    const res = await fetch(`/cancel/${cancelBookingId}`, {
        method: "POST",
        body: fd
    });

    const data = await res.json();

    showPopup("Cancelled", data.message);

    closeCancel();
    loadAdminBookings();
}
let cancelBookingId = null;

function openCancel(id){
    
    console.log("Received ID:", id);   // ✅ correct debug
    cancelBookingId = id; 
    
    let reasonField = document.getElementById("cancelReason");

    
    if(reasonField) reasonField.value = "";

    document.getElementById("cancelModal").style.display = "flex";
}

function closeCancel(){
    document.getElementById("cancelModal").style.display = "none";
}

function closeCancel(){
    document.getElementById("cancelModal").style.display = "none";
    cancelBookingId = null;  // reset
}

/*
async function addHall(){
    const name = document.getElementById("newHallName").value;
    if(!name) return alert("Enter hall name");

    const fd = new FormData();
    fd.append("name", name);

    await fetch("/add_hall", { method:"POST", body:fd });

    loadHalls();
}

async function deleteHall(name){
    const fd = new FormData();
    fd.append("name", name);

    await fetch("/delete_hall", { method:"POST", body:fd });

    loadHalls();
}

/* SETTINGS PANEL */
/*function openSettings(){
closeAllModals();
    document.getElementById("settingsModal").style.display = "flex";
}

function closeSettings(){
closeAllModals();
    document.getElementById("settingsModal").style.display = "none";
}


function openExport(){
    closeAllModals();
    document.getElementById("exportModal").style.display = "flex";
}

function closeExport(){
    closeAllModals();
    document.getElementById("exportModal").style.display = "none";
}
*/

/* EXPORTBOOKINGS  */
/*async function exportReport(){
    closeAllModals();
    const start = document.getElementById("exportStart").value;
    const end = document.getElementById("exportEnd").value;

    if(!start || !end){
        showPopup("Error", "Please select both dates");
        return;
    }

    const fd = new FormData();
    fd.append("start_date", start);
    fd.append("end_date", end);

    const res = await fetch("/export_excel", {
        method: "POST",
        body: fd
    });

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bookings.xlsx";
    a.click();

    closeExport();
}


function openRenameModal(){
    document.getElementById("renameModal").style.display = "flex";
    loadHalls();
}

function closeRenameModal(){
    document.getElementById("renameModal").style.display = "none";
} */

async function loadHalls(){

    const res = await fetch("/hall_stats");
    const halls = await res.json();

    const list = document.getElementById("hallList");
    list.innerHTML = "";

    Object.keys(halls).forEach(hall => {

        list.innerHTML += `
        <div class="hall-row">
            <span class="hall-name">${hall}</span>
            <button class="delete-btn" onclick="deleteHall('${hall}')">
                Delete
            </button>
        </div>`;
    });

}

async function submitReassign(){

    const hall = document.getElementById("reHall").value;
    const reason = document.getElementById("reassignReason").value;

    const res = await fetch("/reassign", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            booking_id: selectedBookingId,
            hall_id: hall,
            date: selectedDate,
            start: selectedStart,
            end: selectedEnd,
            reason: reason
        })
    });

    const data = await res.json();

    if(data.status === "error"){
        showPopup("Conflict", data.message);
        return;
    }

    showPopup("Success", data.message);
    // 🔥 CLOSE REASSIGN MODAL
    document.getElementById("reassignModal").style.display = "none";

    // 🔥 OPTIONAL: clear text
    document.getElementById("reassignReason").value = "";

    // 🔥 RELOAD DATA
    
    closeReassign();
    loadAdminBookings();
}
function showPopup(title, message){
    document.getElementById("popupTitle").innerText = title;
    document.getElementById("popupMessage").innerText = message;
    document.getElementById("popupOverlay").style.display = "flex";
}

function closePopup(){
    document.getElementById("popupOverlay").style.display = "none";
}
function toggleMenu(btn, event){

    event.stopPropagation(); // 🔥 prevent document click

    document.querySelectorAll(".menu-popup").forEach(m => {
        m.style.display = "none";
    });

    const popup = btn.nextElementSibling;

    popup.style.display = (popup.style.display === "block") ? "none" : "block";
}
let selectedBookingId = null;
let selectedDate = null;
let selectedStart = null;
let selectedEnd = null;
// it will close all the popup features 
function closeAllMenus(){
    document.querySelectorAll(".menu-popup").forEach(m => {
        m.style.display = "none";
    });
}

function openReassign(id, date, start, end, event){

    event.stopPropagation(); // 🔥 VERY IMPORTANT

    console.log("Reassign clicked:", id);

    selectedBookingId = id;
    selectedDate = date;
    selectedStart = start;
    selectedEnd = end;

    closeAllMenus(); // ✅ close menu properly

    document.getElementById("reassignModal").style.display = "flex";
}
document.addEventListener("click", function(event){

    // 🔥 if click is inside menu OR button → do nothing
    if (event.target.closest(".menu-container") || event.target.closest(".menu-popup")) {
        return;
    }

    // 🔥 otherwise close menus
    document.querySelectorAll(".menu-popup").forEach(m => {
        m.style.display = "none";
    });
});
function showSection(sectionId){

    document.getElementById("hallsSection").style.display = "none";
    document.getElementById("bookingsSection").style.display = "none";
    document.getElementById("monthlySection").style.display = "none";

    document.getElementById(sectionId).style.display = "block";
}
function toggleReportMenu(){
    let menu = document.getElementById("reportMenu");

    menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

// CLOSE WHEN CLICK OUTSIDE
document.addEventListener("click", function(e){
    let menu = document.getElementById("reportMenu");

    if(!e.target.closest(".icon-btn")){
        menu.style.display = "none";
    }
});
function downloadPDF(){
    window.open('/export-pdf', '_blank');
}

function downloadExcel(){
    window.open('/export-excel', '_blank');
}

function printTable(){
    let content = document.getElementById("monthlyTable").outerHTML;

    let win = window.open('', '', 'width=900,height=700');
    win.document.write('<html><body>');
    win.document.write('<h2>Monthly Bookings</h2>');
    win.document.write(content);
    win.document.write('</body></html>');
    win.print();
}

function printAdminBookings() {

    let content = document.getElementById("adminBookingsList").innerHTML;

    let win = window.open('', '', 'width=900,height=700');

    // ✅ get ALL styles (important fix)
    let styles = '';
    document.querySelectorAll("link[rel='stylesheet'], style").forEach(el => {
        styles += el.outerHTML;
    });

    win.document.write(`
        <html>
        <head>
            <title>Print Bookings</title>
            ${styles}

            <style>
                body {
                    padding: 20px;
                }

                h2 {
                    text-align: center;
                    margin-bottom: 20px;
                }

                @media print {
                    body {
                        margin: 0;
                    }
                }
            </style>

        </head>

        <body>
            <h2>All Department Bookings</h2>
            ${content}
        </body>
        </html>
    `);

    win.document.close();

    // ✅ wait for styles to load (important)
    win.onload = function () {
        win.print();
    };
}
function downloadAdminPDF() {
    let element = document.getElementById("adminBookingsList");

    let opt = {
        margin: 0.5,
        filename: 'Today-bookings.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

function downloadAdminExcel() {
    let data = [];
    let bookings = document.querySelectorAll("#adminBookingsList .booking-card");

    bookings.forEach((card, index) => {
        data.push({
            "Booking #": index + 1,
            "Details": card.innerText
        });
    });

    let worksheet = XLSX.utils.json_to_sheet(data);
    let workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

    XLSX.writeFile(workbook, "Today-bookings.xlsx");
}
document.addEventListener("click", function(event) {

    let isButton = event.target.closest('.icon-btn');
    let isMenu = event.target.closest('#adminMenu');

    // if clicking outside button + menu → close
    if (!isButton && !isMenu) {
        document.getElementById("adminMenu").style.display = "none";
    }
});

function toggleAdminMenu() {
    let menu = document.getElementById("adminMenu");

    // toggle show/hide
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}



// Too open the dashboard when opened or window reloaded.
document.addEventListener("DOMContentLoaded", function () {
    showDashboard();
});