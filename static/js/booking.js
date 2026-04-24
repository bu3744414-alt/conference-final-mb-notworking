


function closeModal(){
    document.getElementById("bookingModal").style.display = "none";
    document.getElementById("hallSelect").disabled = false;
}

function reserveHall(hall){

    openModal();

    const select = document.getElementById("hallSelect");

    // set selected hall
    select.value = hall;

    // 🔥 delay to ensure DOM is ready before disabling
    setTimeout(() => {
        select.disabled = true;
    }, 50);
}


/* AJAX POPUP */
async function submitBooking(){

    const hall = document.getElementById("hallSelect").value;
    const date = document.getElementById("bookingDate").value;
    let start = convertTo24Hour(document.getElementById("startTime").value);
    let end = convertTo24Hour(document.getElementById("endTime").value);
    const purpose = document.getElementById("purpose").value.trim();
    
    if(!purpose){
    showPopup("Error","Purpose is mandatory");
    return;
    }

    

    const fd = new FormData();
    fd.append("hall", hall);
    fd.append("date", date);
    fd.append("start_time", start);
    fd.append("end_time", end);
    fd.append("purpose", purpose);
    
    // company working hours
const officeStart = "09:00";
const officeEnd = "20:00";

// basic validation
if(!start || !end){
    showPopup("Error","Please select time");
    return;
}

// prevent reverse time
if(end <= start){
    showPopup("Error","End time must be after start time");
    return;
}

// prevent outside office hours
if(start < officeStart || end > officeEnd){
    showPopup("Error","Booking allowed only between 9:00 AM and 8:00 PM");
    return;
}

    

    // ⭐ ADD THIS
    const deptSelect = document.getElementById("deptSelect");
    if(deptSelect){
        fd.append("department", deptSelect.value);
    }

    try{
        const res = await fetch("/book", {
            method: "POST",
            body: fd
        });

        const data = await res.json();

        showPopup(
            data.status === "success" ? "Success" : "Slot Unavailable",
            data.message
        );

        if(data.status === "success"){
            closeModal();
            setTimeout(() => location.reload(), 1500);
        }

    }catch(err){
        showPopup("Error", "Booking failed. Try again.");
        console.error(err);
    }
}

/* LoadBooking Main */
async function loadMyBookings(){

    document.getElementById("dashboardPanel").style.display="none";
    document.getElementById("availabilityPanel").style.display="none";
    document.getElementById("adminBookingsPanel").style.display="none";
    document.getElementById("myBookingsPanel").style.display="block";
    
    let date = document.getElementById("myBookingDate").value;

    let url = "/my_bookings";

    // ⭐ If no date selected, use today's date
    if(!date){
        date = new Date().toISOString().split('T')[0];
    }

    url += "?date=" + date;

    const res = await fetch(url);
    const bookings = await res.json();

    const box = document.getElementById("myBookingsList");
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

        const reasonText = b.rescheduled == 1 ? "Reschedule Reason" : "Purpose";

        // 🔴 CANCEL BLOCK
        let cancelReasonText = "";
        if(b.status === "Cancelled"){
            cancelReasonText = `
                <br>
                <small style="color:red;">
                    Cancelled by: ${b.admin_name} (ADMIN)
                </small>
                <br>
                <small style="color:#555;">
                    Reason: ${b.admin_remarks && b.admin_remarks.trim() !== "" ? b.admin_remarks : "Not specified"}
                </small>
            `;
        }

        // 🟢 HALL DISPLAY
        let hallDisplay = `<b>${b.old_hall || "N/A"}</b>`;

        if(b.reassign == 1){
            hallDisplay = `
                <b>${b.old_hall}</b> → <b>${b.new_hall}</b>
                <br>
                <small style="color:green;">
                    Reassigned by: ${b.admin_name} (ADMIN)
                </small>
                <br>
                <small style="color:#555;">
                    Reason: ${b.reassign_reason && b.reassign_reason.trim() !== "" ? b.reassign_reason : "Not specified"}
                </small>
            `;
        }

        box.innerHTML += `
        <div class="booking-card">

            <div class="booking-left">
                ${hallDisplay}<br>

                <small>Booked for: ${b.department}</small><br>
                <small>${reasonText}: ${b.purpose}</small>

                ${cancelReasonText}
            </div>

            <div class="booking-middle">
                Date: ${b.date}<br>
                Time: ${b.start} - ${b.end}
            </div>

            <div class="booking-status ${statusText.toLowerCase()}">
                ${statusText}
            </div>

            <div class="booking-actions">
                ${(b.status === "Booked" && b.date >= new Date().toISOString().split('T')[0]) ? `
                <button class="reschedule-btn"
                onclick="openReschedule(${b.id})">
                Reschedule
                </button>` : ``}
            </div>

        </div>`;
    });
}



/* Open RESHUDULE  */
let resStartPicker, resEndPicker;

function openReschedule(id){

    closeAllModals();

    resBookingId = id;

    document.getElementById("rescheduleModal").style.display = "flex";

    // destroy old
    if(resStartPicker) resStartPicker.destroy();
    if(resEndPicker) resEndPicker.destroy();

    // init
    resStartPicker = flatpickr("#resStart", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        time_24hr: false
    });

    resEndPicker = flatpickr("#resEnd", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        time_24hr: false
    });
}


async function submitReschedule(){

    const date = document.getElementById("resDate").value;
    const start = document.getElementById("resStart").value;
    const end = document.getElementById("resEnd").value;
    const reason = document.getElementById("resReason").value;

    if(!date || !start || !end){
        showPopup("Error","Please select date and time");
        return;
    }

    const fd = new FormData();

    fd.append("date",date);
    fd.append("start_time",start);
    fd.append("end_time",end);
    fd.append("reason",reason);

    const res = await fetch(`/reschedule/${resBookingId}`,{
        method:"POST",
        body:fd
    });

    const data = await res.json();

    showPopup("Updated",data.message);

    closeReschedule();

    loadMyBookings();
}

let resBookingId = null;

document.getElementById("hallSelect")?.addEventListener("change", function() {
    console.log("Selected hall:", this.value);
});

document.addEventListener("DOMContentLoaded", function(){

    const hallSelect = document.getElementById("hallSelect");

    if(hallSelect){
        hallSelect.addEventListener("change", function(){
            console.log("Selected hall:", this.value);
        });
    }

});
/* OPEN BOOK HALL POPUP */
let startPicker, endPicker;

function openModal(){

    closeAllModals();

    const modal = document.getElementById("bookingModal");
    const select = document.getElementById("hallSelect");

    // show modal first
    modal.style.display = "flex";

    // always enable by default (reserveHall will disable later if needed)
    select.disabled = false;

    // 🔥 destroy old instances safely
    if(startPicker){
        startPicker.destroy();
        startPicker = null;
    }

    if(endPicker){
        endPicker.destroy();
        endPicker = null;
    }

    // 🔥 initialize AFTER modal is visible
    startPicker = flatpickr("#startTime", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        time_24hr: false,
        minuteIncrement: 30,
        clickOpens: true,
        allowInput: false,

        // ✅ FIX: prevents broken/cut UI
        appendTo: document.body
    });

    endPicker = flatpickr("#endTime", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        time_24hr: false,
        minuteIncrement: 30,
        clickOpens: true,
        allowInput: false,

        // ✅ FIX: prevents broken/cut UI
        appendTo: document.body
    });
}





/* CLOSE POPUP */
function closeModal(){
    document.getElementById("bookingModal").style.display = "none";
    document.getElementById("hallSelect").disabled = false;
}




function closeReschedule(){
    document.getElementById("rescheduleModal").style.display = "none";
}

function closeReassign() {
    document.getElementById("reassignModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    showDashboard();
});

document.addEventListener("DOMContentLoaded", () => {
    
  const form = document.getElementById("bookingForm");

  if(form){
    form.addEventListener("submit", function(e){
        e.preventDefault();
        submitBooking();
    });
  }

});