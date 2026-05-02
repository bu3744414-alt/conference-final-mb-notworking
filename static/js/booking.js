


function closeModal(){
    document.getElementById("bookingModal").style.display = "none";
    document.getElementById("hallSelect").disabled = false;
}
function reserveHall(hall){

    console.log("Clicked hall:", hall);

    openModal();

    setTimeout(() => {

        const select = document.getElementById("hallSelect");

        console.log([...select.options].map(o => o.value));
        // 🔥 FORCE MATCH (not relying on value only)
        let found = false;

        for(let i = 0; i < select.options.length; i++){
            if(select.options[i].value == hall){
                select.selectedIndex = i;
                found = true;
                break;
            }
        }

        console.log("Selected index:", select.selectedIndex);

        if(!found){
            console.error("Hall NOT FOUND in dropdown!", hall);
        }

        // 🔥 freeze dropdown
        select.disabled = true;

    }, 300); // 🔥 important: give DOM time
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
if(new Date("1970-01-01T" + end) <= new Date("1970-01-01T" + start)){
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
                onclick="console.log('RAW:', '${b.start}', '${b.end}'); 
                openReschedule(${b.id}, convertTo12Hour('${b.start}'), convertTo12Hour('${b.end}'))">
                Reschedule
                </button>` : ``}
            </div>

        </div>`;
    });
}
function convertTo24Hour(time){

    if(!time) return "";

    let [t, modifier] = time.split(" ");
    let [hours, minutes] = t.split(":");

    hours = parseInt(hours);

    if(modifier === "PM" && hours !== 12) hours += 12;
    if(modifier === "AM" && hours === 12) hours = 0;

    // 🔥 FIX: ensure 2-digit format
    hours = hours.toString().padStart(2, "0");

    return `${hours}:${minutes}`;
}
/* Open RESHUDULE  */
let resStartPicker, resEndPicker;
async function openReschedule(id, start, end){

    console.log("START:", start, "END:", end); // DEBUG

    resBookingId = id;

    document.getElementById("rescheduleModal").style.display = "flex";

    if(resStartPicker) resStartPicker.destroy();
    if(resEndPicker) resEndPicker.destroy();

    // 🔥 Convert string → Date object
    function toDateObj(timeStr){

    if(!timeStr){
        console.error("Empty time");
        return new Date();
    }

    // 🔥 case 1: "09:00" (24-hour)
    if(!timeStr.includes(" ")){
        let [hours, minutes] = timeStr.split(":");

        let d = new Date();
        d.setHours(parseInt(hours));
        d.setMinutes(parseInt(minutes));

        return d;
    }

    // 🔥 case 2: "9:00 AM"
    let [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":");

    hours = parseInt(hours);
    minutes = parseInt(minutes);

    if(modifier === "PM" && hours !== 12) hours += 12;
    if(modifier === "AM" && hours === 12) hours = 0;

    let d = new Date();
    d.setHours(hours);
    d.setMinutes(minutes);

    return d;
}

    resStartPicker = flatpickr("#resStart", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        defaultDate: toDateObj(start)   // 🔥 FIX HERE
    });

    resEndPicker = flatpickr("#resEnd", {
        enableTime: true,
        noCalendar: true,
        dateFormat: "h:i K",
        defaultDate: toDateObj("20:00")     // 🔥 FIX HERE
    });
}


async function submitReschedule(){

    const date = document.getElementById("resDate").value;

    let start = convertTo24Hour(document.getElementById("resStart").value);
    let end = convertTo24Hour(document.getElementById("resEnd").value);

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

    fetch(`/reschedule/${resBookingId}`,{
        method:"POST",
        body:fd
    })
    .then(res=>res.json())
    .then(data=>{
        showPopup("Updated",data.message);
        closeReschedule();
        loadMyBookings();
    });
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
    // DO NOT force enable here
    if(!select.hasAttribute("data-locked")){
        select.disabled = false;
    };

    // 🔥 destroy old instances safely
    if(startPicker){
        startPicker.destroy();
        startPicker = null;
    }

    if(endPicker){
        endPicker.destroy();
        endPicker = null;
    }

    startPicker = flatpickr("#startTime", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "h:i K",
    time_24hr: false,
    minuteIncrement: 30,
    enableSeconds: false,
    allowInput: false,
    clickOpens: true,
    allowInput: false,
    appendTo: document.body,
    defaultDate: "09:00",

    // 🔥 ADD THIS
    onChange: function(selectedDates){
        if(selectedDates.length){

            let start = new Date(selectedDates[0]);

            // add 1 hour
            let newEnd = new Date(start);
            newEnd.setHours(start.getHours() + 1);

            endPicker.setDate(newEnd);
        }
    }
});

endPicker = flatpickr("#endTime", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "h:i K",
    time_24hr: false,
    minuteIncrement: 30,
    enableSeconds: false,
    allowInput: false,
    clickOpens: true,
    allowInput: false,
    appendTo: document.body,
    defaultDate: "18:00",

    // 🔥 prevent selecting before start
    onOpen: function(){
        let start = startPicker.selectedDates[0];
        if(start){
            this.set("minDate", start);
        }
    }
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
    
  const form = document.getElementById("bookingForm");

  if(form){
    form.addEventListener("submit", function(e){
        e.preventDefault();
        submitBooking();
    });
  }

});


/* CONVERTING TO MAKE THE RESCHDULE WORK IT ONLY UNDERSTAND THE 12 HRS  */
function convertTo12Hour(time){

    if(!time) return "";

    let [hours, minutes] = time.split(":");
    hours = parseInt(hours);

    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${hours}:${minutes} ${ampm}`;
}
// 🎨 Dynamic color generator
function generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        let hue = Math.floor((360 / count) * i);
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    return colors;
}

async function loadCharts(){

    const todayChart = document.getElementById("todayChart").getContext("2d");
    const monthlyChart = document.getElementById("monthlyChart").getContext("2d");
    const deptChart = document.getElementById("deptChart").getContext("2d");

    // 🔥 Destroy old charts (prevents overlap bugs)
    if(window.todayChartInstance) window.todayChartInstance.destroy();
    if(window.deptChartInstance) window.deptChartInstance.destroy();
    if(window.monthlyChartInstance) window.monthlyChartInstance.destroy();

    // 🎨 Dynamic Color Generator
    function generateColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            let hue = Math.floor((360 / count) * i);
            colors.push(`hsl(${hue}, 70%, 50%)`);
        }
        return colors;
    }

    // =========================
    // 🔹 TODAY CHART
    // =========================
    let today = await (await fetch("/chart/today-halls")).json();
    const todayColors = generateColors(today.length);

    window.todayChartInstance = new Chart(todayChart, {
        type: "bar",
        data: {
            labels: today.map(x => x.hall),
            datasets: [{
                label: "Today's Usage",
                data: today.map(x => x.count),
                backgroundColor: todayColors,
                barPercentage: 0.3,
                categoryPercentage: 0.4,
                borderRadius: 8
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top" },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    offset: 10,
                    color: 'black',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: (val) => val
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grace: '20%'
                }
            }
        }
    });

    // =========================
    // 🔹 DEPARTMENT CHART
    // =========================
    let dept = await (await fetch("/chart/departments")).json();
    const deptColors = generateColors(dept.length);

    window.deptChartInstance = new Chart(deptChart, {
        type: "pie",
        data: {
            labels: dept.map(x => x.dept),
            datasets: [{
                data: dept.map(x => x.count),
                backgroundColor: deptColors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });

    // 🔹 Custom Legend (with count)
    let html = "";
    dept.forEach((d, i) => {
        html += `
        <div style="display:flex;align-items:center;margin-bottom:6px;">
            <div style="width:12px;height:12px;background:${deptColors[i]};margin-right:8px;"></div>
            <span style="flex:1;">${d.dept}</span>
            <b>${d.count}</b>
        </div>`;
    });
    deptLegend.innerHTML = html;

    // =========================
    // 🔹 MONTHLY CHART (FIXED ✅)
    // =========================
    let monthly = await (await fetch("/chart/monthly-halls")).json();
    const monthlyColors = generateColors(monthly.length);

    window.monthlyChartInstance = new Chart(monthlyChart, {
        type: "bar",
        data: {
            labels: monthly.map(x => x.hall),
            datasets: [{
                label: "Monthly Usage",
                data: monthly.map(x => x.count),
                backgroundColor: monthlyColors,
                barPercentage: 0.3,          // ✅ same as today
                categoryPercentage: 0.4,     // ✅ same as today
                borderRadius: 8              // ✅ modern UI
            }]
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "top" },
                datalabels: {
                    anchor: 'end',
                    align: 'end',            // ✅ fixed alignment
                    offset: 10,
                    color: 'black',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: (val) => val
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grace: '20%'            // ✅ spacing fix
                }
            }
        }
    });
}