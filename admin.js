// Global State
let adminData = {
    notices: [],
    events: [],
    birthdays: []
};

// DOM Elements
const noticesList = document.getElementById('notices-list');
const eventsList = document.getElementById('events-list');
const birthdaysList = document.getElementById('birthdays-list');
const saveBtn = document.getElementById('save-btn');
const statusMsg = document.getElementById('save-status');

// Templates
const noticeTpl = document.getElementById('notice-template');
const eventTpl = document.getElementById('event-template');
const birthdayTpl = document.getElementById('birthday-template');

// Initialize
async function init() {
    try {
        const response = await fetch('/api/data');
        adminData = await response.json();
        renderAll();
    } catch (err) {
        showStatus('Error fetching data from server.', true);
        console.error(err);
    }
}

// Render Functions
function renderAll() {
    noticesList.innerHTML = '';
    eventsList.innerHTML = '';
    birthdaysList.innerHTML = '';

    adminData.notices.forEach(n => appendNotice(n));
    adminData.events.forEach(e => appendEvent(e));
    adminData.birthdays.forEach(b => appendBirthday(b));
}

function appendNotice(data = {}) {
    const clone = noticeTpl.content.cloneNode(true);
    const div = clone.querySelector('.data-item');

    div.querySelector('.input-title').value = data.title || '';
    div.querySelector('.input-content').value = data.content || '';
    div.querySelector('.input-date').value = data.date || '';
    div.querySelector('.input-urgent').checked = data.urgent || false;

    noticesList.appendChild(clone);
}

function appendEvent(data = {}) {
    const clone = eventTpl.content.cloneNode(true);
    const div = clone.querySelector('.data-item');

    div.querySelector('.input-title').value = data.title || '';
    div.querySelector('.input-desc').value = data.description || '';
    div.querySelector('.input-date-string').value = data.date || '';

    eventsList.appendChild(clone);
}

function appendBirthday(data = {}) {
    const clone = birthdayTpl.content.cloneNode(true);
    const div = clone.querySelector('.data-item');

    div.querySelector('.input-name').value = data.name || '';
    div.querySelector('.input-dept').value = data.department || '';
    div.querySelector('.input-bdate').value = data.date || '';

    birthdaysList.appendChild(clone);
}

// Actions (Bound to window so inline onclick works)
window.addNotice = () => appendNotice();
window.addEvent = () => appendEvent();
window.addBirthday = () => appendBirthday();

window.removeItem = (btn) => {
    if (confirm('Remove this item?')) {
        btn.closest('.data-item').remove();
    }
};

// Save Logic
saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    showStatus('Saving...', false);

    // Reconstruct data from DOM
    const newData = {
        notices: [],
        events: [],
        birthdays: []
    };

    // Parse Notices
    noticesList.querySelectorAll('.data-item').forEach((item, idx) => {
        newData.notices.push({
            id: String(idx + 1),
            title: item.querySelector('.input-title').value,
            content: item.querySelector('.input-content').value,
            date: item.querySelector('.input-date').value,
            urgent: item.querySelector('.input-urgent').checked
        });
    });

    // Parse Events
    eventsList.querySelectorAll('.data-item').forEach((item, idx) => {
        newData.events.push({
            id: String(idx + 1),
            title: item.querySelector('.input-title').value,
            description: item.querySelector('.input-desc').value,
            date: item.querySelector('.input-date-string').value
        });
    });

    // Parse Birthdays
    birthdaysList.querySelectorAll('.data-item').forEach((item, idx) => {
        newData.birthdays.push({
            id: String(idx + 1),
            name: item.querySelector('.input-name').value,
            department: item.querySelector('.input-dept').value,
            date: item.querySelector('.input-bdate').value
        });
    });

    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });

        if (response.ok) {
            showStatus('Changes Saved!', false);
        } else {
            showStatus('Failed to save.', true);
        }
    } catch (err) {
        showStatus('Network Error.', true);
        console.error(err);
    } finally {
        saveBtn.disabled = false;
        setTimeout(() => { statusMsg.textContent = ''; }, 3000);
    }
});

function showStatus(msg, isError) {
    statusMsg.textContent = msg;
    statusMsg.className = 'status-msg ' + (isError ? 'error' : 'success');
}

// Start
init();
