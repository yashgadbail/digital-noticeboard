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

    // Update Celestial Indicator to signify time of day
    const skyTrack = document.getElementById('sky-track');
    if (skyTrack) {
        const secondsSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const percentOfDay = (secondsSinceMidnight / 86400);
        // 0% (Midnight) -> 180deg (Moon top), 50% (Noon) -> 0deg (Sun top), 100% -> -180deg
        const angle = 180 - (percentOfDay * 360);
        skyTrack.style.transform = `rotate(${angle}deg)`;
    }
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. Data Fetching and Screen Cycling Logic
// ==========================================
let screens = [];
let currentScreenIndex = 0;
const screenDuration = 10; // seconds per screen
let isFirstLoad = true;

async function fetchAndPopulate(isBackgroundRefresh = false) {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();

        populateNotices(data.notices);
        populateEvents(data.events);
        populateBirthdays(data.birthdays);
        populateCctv(data.cctv);

        // Read config or default all to true
        const config = data.config || { showNotices: true, showEvents: true, showBirthdays: true, showCctv: true };

        // Update active screens list without breaking the current cycle
        const allScreens = Array.from(document.querySelectorAll('.screen'));
        let activeScreens = allScreens.filter(s => {
            // Apply Admin Panel visibility toggles
            if (s.id === 'screen-notices' && config.showNotices === false) return false;
            if (s.id === 'screen-events' && config.showEvents === false) return false;
            if (s.id === 'screen-cctv' && config.showCctv === false) return false;

            // Hide birthday screen if toggled off OR no birthdays today
            if (s.id === 'screen-birthdays') {
                if (config.showBirthdays === false) return false;

                const hasBirthdays = data.birthdays && data.birthdays.some(b => {
                    const today = new Date();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    return b.date === `${mm}-${dd}`;
                });
                return !!hasBirthdays;
            }
            return true;
        });

        // Safety fallback: if user disables EVERYTHING, force Notices to display
        if (activeScreens.length === 0) {
            activeScreens = [document.getElementById('screen-notices')];
        }

        // Set screens globally
        screens = activeScreens;

        if (isFirstLoad) {
            isFirstLoad = false;
            // Initially hide all but first
            allScreens.forEach(s => s.classList.add('hidden'));
            if (screens.length > 0) {
                screens[0].classList.remove('hidden');
                gsap.set(screens[0], { opacity: 1, x: 0, scale: 1 });
            }
        }

        // Only schedule the primary loop if this isn't a background refresh
        if (!isBackgroundRefresh) {
            setTimeout(() => {
                let delay = screenDuration;
                let activeScreen = screens[currentScreenIndex];
                if (activeScreen && activeScreen.id === 'screen-notices') {
                    const noticesContainer = document.getElementById('notices-container');
                    if (noticesContainer && noticesContainer.marqueeDuration) {
                        delay = noticesContainer.marqueeDuration;
                    }
                }
                gsap.delayedCall(delay, cycleScreens);
            }, 150);
        }

    } catch (err) {
        console.error("Failed to fetch noticeboard data:", err);
        // Retry later if error
        if (isFirstLoad || !isBackgroundRefresh) {
            gsap.delayedCall(5, fetchAndPopulate);
        }
    }
}

function populateNotices(notices) {
    const container = document.getElementById('notices-container');
    const tpl = document.getElementById('tpl-notice');

    // Clear existing animation if any
    if (container.marqueeTween) {
        container.marqueeTween.kill();
        container.marqueeTween = null;
    }
    gsap.set(container, { y: 0 });

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

    // Check for overflow and apply marquee scrolling if needed
    setTimeout(() => {
        const wrapper = container.parentElement;
        if (wrapper && container.scrollHeight > wrapper.clientHeight) {
            const overflow = container.scrollHeight - wrapper.clientHeight;
            // Get height of one row (child height + gap)
            const firstChild = container.children[0];
            const rowHeight = firstChild ? firstChild.offsetHeight + 16 : 296; // 16px is 1rem gap

            // Calculate number of complete row scrolls needed
            const maxScrollY = container.scrollHeight - wrapper.clientHeight;
            const numScrolls = Math.ceil(maxScrollY / rowHeight);

            // Create a timeline for step-by-step scrolling
            const tl = gsap.timeline({ repeat: -1 });

            // Wait 6 seconds at the top before starting
            tl.to({}, { duration: 6 });

            for (let i = 1; i <= numScrolls; i++) {
                // Determine the next scroll position, capped at maxScrollY
                const nextY = -Math.min(i * rowHeight, maxScrollY);

                // Scroll to the next row
                tl.to(container, {
                    y: nextY,
                    duration: 0.8,
                    ease: "power2.inOut"
                });

                // Wait 6 seconds on this row
                tl.to({}, { duration: 6 });
            }

            // Quickly fade out and reset to top to loop seamlessly
            tl.to(container, {
                opacity: 0,
                duration: 0.3
            }).set(container, {
                y: 0
            }).to(container, {
                opacity: 1,
                duration: 0.5
            });

            container.marqueeTween = tl;
            container.marqueeDuration = tl.duration(); // store duration directly
        }
    }, 100);
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
    if (!container || !tpl) return;

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

function populateCctv(cctvData) {
    const container = document.querySelector('.cctv-grid');
    if (!container || !Array.isArray(cctvData)) return;

    const feedElements = container.querySelectorAll('.cctv-feed');

    // 1. Reset all 4 grids to "CURRENT SCREEN" static mode first
    feedElements.forEach((feedEl, i) => {
        let streamContainer = feedEl.querySelector('.cctv-stream-container');
        if (!streamContainer) {
            streamContainer = document.createElement('div');
            streamContainer.className = 'cctv-stream-container';
            feedEl.insertBefore(streamContainer, feedEl.firstChild);
        }

        const labelEl = feedEl.querySelector('.cctv-label');
        if (labelEl) labelEl.textContent = `CAM 0${i + 1} // CURRENT SCREEN`;
        streamContainer.innerHTML = '';
        feedEl.querySelector('.cctv-static').style.display = 'block';
    });

    // 2. Project custom configurations into requested grids
    cctvData.forEach((feed) => {
        const gridIndex = parseInt(feed.grid, 10) - 1; // "1" -> 0, "4" -> 3
        if (gridIndex >= 0 && gridIndex < 4 && feedElements[gridIndex]) {
            const feedEl = feedElements[gridIndex];
            const labelEl = feedEl.querySelector('.cctv-label');
            const streamContainer = feedEl.querySelector('.cctv-stream-container');

            if (feed.stream && feed.stream.trim() !== "") {
                if (labelEl) labelEl.textContent = feed.label || `CAM 0${gridIndex + 1}`;

                // Clean up any accidentally duplicated HTTP urls
                let safeUrl = feed.stream;
                if (safeUrl.indexOf('http', 4) !== -1) {
                    safeUrl = safeUrl.substring(0, safeUrl.indexOf('http', 4));
                }

                // Mount stream
                if (safeUrl.includes('youtube.com') || safeUrl.includes('youtu.be') || safeUrl.includes('vimeo.com')) {
                    streamContainer.innerHTML = `<iframe src="${safeUrl}?autoplay=1&mute=1&controls=0" frameborder="0" allow="autoplay; encrypted-media" style="width:100%; height:100%; border:none;"></iframe>`;
                } else if (safeUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
                    streamContainer.innerHTML = `<video src="${safeUrl}" autoplay loop muted style="width:100%; height:100%; object-fit:cover;"></video>`;
                } else {
                    // Default to image (works for .jpg, .png, and .cgi MJPEG streams)
                    streamContainer.innerHTML = `<img src="${safeUrl}" style="width:100%; height:100%; object-fit:cover;" />`;
                }
                feedEl.querySelector('.cctv-static').style.display = 'none';
            } else if (feed.label && feed.label.trim() !== "") {
                // Label provided but no stream
                if (labelEl) labelEl.textContent = feed.label;
            }
        }
    });
}

function cycleScreens() {
    if (screens.length <= 1) {
        // Only one screen, refetch data occasionally but stay on screen
        if (screens.length === 1) {
            fetchAndPopulate(false); // keep the fetchAndPopulate loop
        }
        return;
    }

    const currentScreen = screens[currentScreenIndex];
    currentScreenIndex = (currentScreenIndex + 1) % screens.length;
    const nextScreen = screens[currentScreenIndex];

    if (currentScreen === nextScreen) {
        // Only one screen to show, just delay and fetch again maybe
        fetchAndPopulate(false);
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

    // Determine how long to wait before the next screen switch
    let delay = screenDuration;
    if (nextScreen.id === 'screen-notices') {
        const noticesContainer = document.getElementById('notices-container');
        if (noticesContainer && noticesContainer.marqueeDuration) {
            // Wait for one full cycle of the marquee animation
            delay = noticesContainer.marqueeDuration;
        }
    }

    // Continue the screen cycle using the calculated delay
    gsap.delayedCall(delay, cycleScreens);
}

// Start sequence
fetchAndPopulate();

// Continuously poll for live data & config updates every 30 seconds
setInterval(() => {
    fetchAndPopulate(true);
}, 30000);

// ==========================================
// ==========================================
// 3. Three.js Vibrant Glassmorphism Background
// ==========================================
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();

// Vibrant dark gradient-like background
scene.background = new THREE.Color(0x0a0a1a);
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);

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
cssRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(cssRenderer.domElement);

// Convert HTML #app to a 3D Object
const appElement = document.getElementById('app');
const cssObject = new CSS3DObject(appElement);
cssObject.scale.set(0.018, 0.018, 0.018);
cssObject.position.set(0, 0, 0);
scene.add(cssObject);

// --- Background: Tech/Mathematical Particle Network ---
const particleCount = 150;
const maxDistance = 4.0; // Max distance for drawing lines

// Geometry for Points
const particlesGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleVelocities = [];

for (let i = 0; i < particleCount; i++) {
    // Random position across the visible frustum
    particlePositions[i * 3] = (Math.random() - 0.5) * 40;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;

    // Movement velocity vector
    particleVelocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
    });
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

// Material for Points
const pointMaterial = new THREE.PointsMaterial({
    color: 0x88bbff, // Cool tech blue
    size: 0.15,
    transparent: true,
    opacity: 0.6
});
const particlesMesh = new THREE.Points(particlesGeometry, pointMaterial);
scene.add(particlesMesh);

// Geometry and Material for Connecting Lines
const linesGeometry = new THREE.BufferGeometry();
const maxLines = particleCount * particleCount;
const linePositions = new Float32Array(maxLines * 3);
linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x88bbff,
    transparent: true,
    opacity: 0.15
});
const linesMesh = new THREE.LineSegments(linesGeometry, lineMaterial);
scene.add(linesMesh);

// Add ambient light for better blending
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Animation Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // 1. Move Particles
    const positions = particlesMesh.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleVelocities[i].x;
        positions[i * 3 + 1] += particleVelocities[i].y;
        positions[i * 3 + 2] += particleVelocities[i].z;

        // Bounce off invisible bounds
        if (Math.abs(positions[i * 3]) > 25) particleVelocities[i].x *= -1;
        if (Math.abs(positions[i * 3 + 1]) > 15) particleVelocities[i].y *= -1;
        if (positions[i * 3 + 2] > 0 || positions[i * 3 + 2] < -15) particleVelocities[i].z *= -1;
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;

    // 2. Draw Lines between neighbors
    let lineIdx = 0;
    for (let i = 0; i < particleCount; i++) {
        const x1 = positions[i * 3];
        const y1 = positions[i * 3 + 1];
        const z1 = positions[i * 3 + 2];

        for (let j = i + 1; j < particleCount; j++) {
            const x2 = positions[j * 3];
            const y2 = positions[j * 3 + 1];
            const z2 = positions[j * 3 + 2];

            const distSq = (x1 - x2) ** 2 + (y1 - y2) ** 2 + (z1 - z2) ** 2;

            if (distSq < maxDistance * maxDistance) {
                linePositions[lineIdx++] = x1;
                linePositions[lineIdx++] = y1;
                linePositions[lineIdx++] = z1;

                linePositions[lineIdx++] = x2;
                linePositions[lineIdx++] = y2;
                linePositions[lineIdx++] = z2;
            }
        }
    }

    // Update Draw Range
    linesMesh.geometry.setDrawRange(0, lineIdx / 3);
    linesMesh.geometry.attributes.position.needsUpdate = true;

    // Static 3D tilt for the HTML Panel
    if (typeof cssObject !== 'undefined') {
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

// ==========================================
// 4. Theme Toggle Logic
// ==========================================
const themeBtn = document.getElementById('theme-toggle-btn');
const rootElement = document.documentElement;

// Load preferred theme
let savedTheme = localStorage.getItem('theme') || 'dark';
const hasOverride = localStorage.getItem('themeOverride') === 'true';

// Auto-Time Based Theme function
function autoThemeCheck() {
    // If user manually clicked the button, ignore auto-switching
    if (localStorage.getItem('themeOverride') === 'true') return;

    const hour = new Date().getHours();
    // Day = 7:00 AM to 5:59 PM (Light Mode)
    const isDay = hour >= 7 && hour < 18;
    const targetTheme = isDay ? 'light' : 'dark';

    const currentTheme = rootElement.getAttribute('data-theme');
    if (currentTheme !== targetTheme) {
        setTheme(targetTheme);
    }
}

function setTheme(newTheme) {
    rootElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    if (themeBtn) {
        themeBtn.textContent = newTheme === 'light' ? '🌙' : '☀️';
    }

    updateThreeJsTheme(newTheme);
}

// Initial setup
rootElement.setAttribute('data-theme', savedTheme);
updateThreeJsTheme(savedTheme);

// Check time immediately if no manual override
if (!hasOverride) {
    autoThemeCheck();
}
// Run check every minute to auto-switch at dawn/dusk boundaries
setInterval(autoThemeCheck, 60000);

// Manual Toggle Listener
if (themeBtn) {
    themeBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';

    themeBtn.addEventListener('click', () => {
        const currentTheme = rootElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        // User took manual control, disable auto-time switching
        localStorage.setItem('themeOverride', 'true');

        setTheme(newTheme);
    });
}

function updateThreeJsTheme(theme) {
    if (!scene) return;

    if (theme === 'light') {
        scene.background = new THREE.Color(0xfdfbf7);
        scene.fog = new THREE.FogExp2(0xfdfbf7, 0.02);
    } else {
        scene.background = new THREE.Color(0x0a0a1a);
        scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);
    }
}
