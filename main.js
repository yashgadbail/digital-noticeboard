import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import gsap from 'gsap';

// ==========================================
// 1. Clock Logic
// ==========================================
function updateClock() {
    const now = new Date();

    const timeString = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
    });

    const dateString = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    }).toUpperCase();

    document.getElementById('clock').textContent = timeString;
    document.getElementById('date').textContent = dateString;
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. Data Fetching and Screen Cycling Logic
// ==========================================
let screens = [];
let currentScreenIndex = 0;
const screenDuration = 10; // seconds per screen

async function fetchAndPopulate() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();

        populateNotices(data.notices);
        populateEvents(data.events);
        populateBirthdays(data.birthdays);

        // Filter and assign active screens
        screens = Array.from(document.querySelectorAll('.screen')).filter(s => {
            // Hide birthday screen if no birthdays today
            if (s.id === 'screen-birthdays') {
                const hasBirthdays = data.birthdays.some(b => {
                    // Check if birthday date (MM-DD) matches today (MM-DD)
                    const today = new Date();
                    const bMonthDay = b.date;
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    return bMonthDay === `${mm}-${dd}`;
                });
                if (!hasBirthdays) return false;
            }
            return true;
        });

        // Initially hide all
        screens.forEach((s, i) => {
            if (i !== 0) s.classList.add('hidden');
            else s.classList.remove('hidden');
        });

        // Start cycle
        gsap.delayedCall(screenDuration, cycleScreens);

    } catch (err) {
        console.error("Failed to fetch noticeboard data:", err);
    }
}

function populateNotices(notices) {
    const container = document.getElementById('notices-container');
    const tpl = document.getElementById('tpl-notice');
    container.innerHTML = '';
    notices.forEach(n => {
        const clone = tpl.content.cloneNode(true);
        const article = clone.querySelector('article');
        const header = clone.querySelector('.widget-header');
        const content = clone.querySelector('.widget-content');
        const footerUrgent = clone.querySelector('.blink');
        const footerDate = clone.querySelector('.date-footer');

        header.textContent = n.title;
        content.textContent = n.content;
        footerDate.textContent = n.date ? `Date: ${n.date}` : '';

        if (n.urgent) {
            article.classList.add('highlight');
        } else {
            footerUrgent.style.display = 'none';
        }
        container.appendChild(clone);
    });
}

function populateEvents(events) {
    const container = document.getElementById('events-container');
    const tpl = document.getElementById('tpl-event');
    container.innerHTML = '';
    events.forEach(e => {
        const clone = tpl.content.cloneNode(true);
        clone.querySelector('.event-date').textContent = e.date;
        clone.querySelector('h3').textContent = e.title;
        clone.querySelector('p').textContent = e.description;
        container.appendChild(clone);
    });
}

function populateBirthdays(birthdays) {
    const container = document.getElementById('birthdays-container');
    const tpl = document.getElementById('tpl-birthday');
    container.innerHTML = '';
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    birthdays.forEach(b => {
        if (b.date === `${mm}-${dd}`) {
            const clone = tpl.content.cloneNode(true);
            clone.querySelector('h3').textContent = `Happy Birthday ${b.name}!`;
            clone.querySelector('p').textContent = `Department: ${b.department}`;
            container.appendChild(clone);
        }
    });
}

function cycleScreens() {
    if (screens.length === 0) return;

    const currentScreen = screens[currentScreenIndex];
    currentScreenIndex = (currentScreenIndex + 1) % screens.length;
    const nextScreen = screens[currentScreenIndex];

    if (currentScreen === nextScreen) {
        // Only one screen to show, just delay and fetch again maybe
        gsap.delayedCall(screenDuration, fetchAndPopulate);
        return;
    }

    const tl = gsap.timeline();

    tl.to(currentScreen, {
        opacity: 0,
        x: -50,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => {
            currentScreen.classList.add('hidden');
        }
    });

    tl.fromTo(nextScreen,
        { opacity: 0, x: 50, scale: 0.95 },
        {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.8,
            ease: "back.out(1.7)",
            onStart: () => {
                nextScreen.classList.remove('hidden');
            }
        },
        "-=0.2"
    );

    // Instead of simple loop, we could re-fetch data every loop to keep it fresh
    if (currentScreenIndex === screens.length - 1) {
        // We've shown all screens, refetch data before starting next cycle
        gsap.delayedCall(screenDuration, fetchAndPopulate);
    } else {
        gsap.delayedCall(screenDuration, cycleScreens);
    }
}

// Start sequence
fetchAndPopulate();

// ==========================================
// ==========================================
// 3. Three.js Retro Grid Background & Logo
// ==========================================
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();

// We want a very dark background with fog to fade the grid
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.FogExp2(0x020202, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Position camera looking down slightly over the grid
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Setup CSS3D Renderer for the HTML Panel
const cssRenderer = new CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.style.position = 'absolute';
cssRenderer.domElement.style.top = '0';
cssRenderer.domElement.style.pointerEvents = 'none'; // let clicks pass through to UI if needed, or handle in CSS
document.body.appendChild(cssRenderer.domElement);

// Convert HTML #app to a 3D Object
const appElement = document.getElementById('app');
const cssObject = new CSS3DObject(appElement);
// Scale down HTML dimensions to WebGL scale
// Increased scale to make it bigger on screen
cssObject.scale.set(0.02, 0.02, 0.02);
cssObject.position.set(0, 0, 0);
scene.add(cssObject);

// Create a large grid helper
const gridSize = 100;
const gridDivisions = 50;
const colorCenterLine = 0x33ff33; // Neon Green
const colorGrid = 0x003300;       // Dark Green

const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, colorCenterLine, colorGrid);
scene.add(gridHelper);

// Mouse interaction removed as per user request to freeze camera

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Move grid towards camera continuously to simulate forward movement
    gridHelper.position.z = (elapsedTime * 2) % (gridSize / gridDivisions);

    // Camera tilt removed as per freeze request

    // Static 3D tilt for the HTML Panel (Frozen)
    if (typeof cssObject !== 'undefined') {
        // Align perfectly parallel to the camera view plane to eliminate perspective distortion
        cssObject.quaternion.copy(camera.quaternion);
    }

    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);
}

animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
});
