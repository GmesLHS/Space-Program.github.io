<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mini Space Program</title>
    <style>
        body {
            margin: 0;
            background-color: #0b0e14;
            color: #fff;
            font-family: 'Courier New', Courier, monospace;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow: hidden;
        }
        h1 {
            margin: 5px 0;
            font-size: 1.5rem;
            color: #4af626;
            text-shadow: 0 0 5px rgba(74,246,38,0.5);
        }
        #gameContainer {
            position: relative;
            border: 2px solid #333;
            box-shadow: 0 0 20px rgba(0,0,0,0.8);
        }
        canvas {
            background: radial-gradient(circle at center, #1a1c29 0%, #050508 100%);
            display: block;
        }
        .ui-panel {
            position: absolute;
            background: rgba(10, 15, 25, 0.85);
            border: 1px solid #4af626;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            pointer-events: none;
            box-shadow: 0 0 10px rgba(74,246,38,0.2);
        }
        #telemetry {
            top: 10px;
            left: 10px;
            width: 220px;
        }
        #controls {
            bottom: 10px;
            left: 10px;
            width: 220px;
        }
        #instructions {
            top: 10px;
            right: 10px;
            width: 240px;
        }
        .stat-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        .label { color: #8ab4f8; }
        .value { color: #4af626; font-weight: bold; }
        .alert { color: #ff5555; animation: blink 1s infinite; }
        @keyframes blink { 50% { opacity: 0.3; } }
        #instructions ul { margin: 5px 0; padding-left: 15px; }
        #instructions li { margin-bottom: 3px; }
    </style>
</head>
<body>

    <h1>🚀 MINI SPACE PROGRAM 🚀</h1>
    
    <div id="gameContainer">
        <div id="telemetry" class="ui-panel">
            <div style="font-weight:bold; border-bottom:1px solid #4af626; margin-bottom:5px; padding-bottom:2px; text-align:center;">FLIGHT TELEMETRY</div>
            <div class="stat-line"><span class="label">Mission Status:</span><span id="status-val" class="value">Pre-Launch</span></div>
            <div class="stat-line"><span class="label">Altitude:</span><span id="alt-val" class="value">0 m</span></div>
            <div class="stat-line"><span class="label">Apoapsis (Max Alt):</span><span id="ap-val" class="value">0 m</span></div>
            <div class="stat-line"><span class="label">Velocity:</span><span id="vel-val" class="value">0 m/s</span></div>
            <div class="stat-line"><span class="label">Heading:</span><span id="hdg-val" class="value">90° (Up)</span></div>
            <div class="stat-line"><span class="label">Fuel Remaining:</span><span id="fuel-val" class="value">100%</span></div>
            <div style="margin-top: 8px; height: 8px; background: #222; border-radius: 4px; overflow: hidden;">
                <div id="fuel-bar" style="width: 100%; height: 100%; background: #4af626;"></div>
            </div>
        </div>

        <div id="instructions" class="ui-panel">
            <div style="font-weight:bold; border-bottom:1px solid #4af626; margin-bottom:5px; padding-bottom:2px; text-align:center;">MISSION BRIEFING</div>
            <p style="margin: 4px 0;">Escape Earth's gravity pull and establish a stable orbit!</p>
            <strong>Controls:</strong>
            <ul>
                <li><b style="color:#ffaa00">UP ARROW</b>: Fire Rocket Engine</li>
                <li><b style="color:#ffaa00">LEFT ARROW</b>: Rotate Counter-Clockwise</li>
                <li><b style="color:#ffaa00">RIGHT ARROW</b>: Rotate Clockwise</li>
                <li><b style="color:#ffaa00">R KEY</b>: Restart Mission</li>
            </ul>
            <strong>Goal:</strong> Get altitude > 100km to clear atmosphere and fly sideways fast enough to achieve a stable circular orbit. Don't fall back down!
        </div>

        <div id="controls" class="ui-panel">
            <div style="font-weight:bold; border-bottom:1px solid #4af626; margin-bottom:5px; padding-bottom:2px; text-align:center;">NAV-BALL GUIDE</div>
            <div style="font-size: 11px; color: #aaa; line-height: 1.3;">
                • Pitch over to 0° (Right) gradually as you ascend to gain horizontal orbital velocity.<br>
                • Keep your speed high to avoid dropping back into the atmosphere!
            </div>
        </div>

        <canvas id="spaceCanvas" width="900" height="650"></canvas>
    </div>

    <script>
        const canvas = document.getElementById('spaceCanvas');
        const ctx = canvas.getContext('2d');

        // Physics constants (scaled for gameplay fun)
        const G = 0.15;            // Gravitational constant
        const EARTH_MASS = 120000; // Mass of Earth
        const EARTH_RADIUS = 160;  // Radius of the planet
        const ATMOSPHERE_HEIGHT = 100; // Extra height where drag applies
        
        // Planet position (Center of screen view)
        const planetX = canvas.width / 2;
        const planetY = canvas.height / 2;

        // Game State Variables
        let rocket = {
            x: planetX,
            y: planetY - EARTH_RADIUS - 5,
            vx: 0,
            vy: 0,
            angle: -Math.PI / 2, // Facing straight up initially
            fuel: 1000,
            maxFuel: 1000,
            thrust: 0.08,
            mass: 1,
            alive: true,
            isOrbiting: false,
            highestAlt: 0
        };

        let keys = {};
        let stars = [];
        let flightPath = [];

        // Generate starfield
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5
            });
        }

        // Event Listeners
        window.addEventListener('keydown', e => {
            keys[e.key] = true;
            if (e.key.toLowerCase() === 'r') resetGame();
        });
        window.addEventListener('keyup', e => { keys[e.key] = false; });

        function resetGame() {
            rocket = {
                x: planetX,
                y: planetY - EARTH_RADIUS - 5,
                vx: 0,
                vy: 0,
                angle: -Math.PI / 2,
                fuel: 1000,
                maxFuel: 1000,
                thrust: 0.08,
                mass: 1,
                alive: true,
                isOrbiting: false,
                highestAlt: 0
            };
            flightPath = [];
        }

        function updatePhysics() {
            if (!rocket.alive) return;

            // Calculate distance vector to planet center
            let dx = planetX - rocket.x;
            let dy = planetY - rocket.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            // Check Collision / Landing
            if (distance <= EARTH_RADIUS + 2) {
                let speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
                if (speed > 1.5) {
                    rocket.alive = false; // Crashed!
                } else {
                    // Safe touchdown/landing reset speed
                    rocket.vx = 0;
                    rocket.vy = 0;
                    rocket.x = planetX + (dx / distance) * -EARTH_RADIUS;
                    rocket.y = planetY + (dy / distance) * -EARTH_RADIUS;
                }
                return;
            }

            // Gravity Calculation: F = G * M / r^2
            let gravityForce = (G * EARTH_MASS) / (distance * distance);
            let ax = (dx / distance) * gravityForce;
            let ay = (dy / distance) * gravityForce;

            // Atmospheric Drag
            let altitude = distance - EARTH_RADIUS;
            if (altitude < ATMOSPHERE_HEIGHT) {
                let dragFactor = 0.002 * (1 - altitude / ATMOSPHERE_HEIGHT);
                rocket.vx *= (1 - dragFactor);
                rocket.vy *= (1 - dragFactor);
            }

            // Engine Thrust
            if (keys['ArrowUp'] && rocket.fuel > 0) {
                rocket.vx += Math.cos(rocket.angle) * rocket.thrust;
                rocket.vy += Math.sin(rocket.angle) * rocket.thrust;
                rocket.fuel -= 1.5;
            }

            // Steering / Rotation
            if (keys['ArrowLeft']) rocket.angle -= 0.04;
            if (keys['ArrowRight']) rocket.angle += 0.04;

            // Apply Accelerations
            rocket.vx += ax;
            rocket.vy += ay;

            // Update Position
            rocket.x += rocket.vx;
            rocket.y += rocket.vy;

            // Record path tracking
            if (Math.random() < 0.3) {
                flightPath.push({x: rocket.x, y: rocket.y});
                if (flightPath.length > 300) flightPath.shift();
            }

            // Track Orbit status criteria
            let velocity = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
            let perfectOrbitVelocity = Math.sqrt((G * EARTH_MASS) / distance);
            
            if (altitude > ATMOSPHERE_HEIGHT && Math.abs(velocity - perfectOrbitVelocity) < 0.6) {
                rocket.isOrbiting = true;
            } else if (altitude < ATMOSPHERE_HEIGHT) {
                rocket.isOrbiting = false;
            }

            if (altitude > rocket.highestAlt) {
                rocket.highestAlt = altitude;
            }
        }

        function updateUI() {
            let dx = planetX - rocket.x;
            let dy = planetY - rocket.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let altitude = Math.max(0, distance - EARTH_RADIUS);
            let velocity = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
            
            let degrees = Math.round((rocket.angle * 180 / Math.PI) + 90);
            while (degrees < 0) degrees += 360;
            degrees = degrees % 360;

            document.getElementById('alt-val').innerText = (altitude * 1000).toLocaleString('en-US', {maximumFractionDigits: 0}) + " m";
            document.getElementById('ap-val').innerText = (rocket.highestAlt * 1000).toLocaleString('en-US', {maximumFractionDigits: 0}) + " m";
            document.getElementById('vel-val').innerText = (velocity * 1000).toLocaleString('en-US', {maximumFractionDigits: 0}) + " m/s";
            document.getElementById('hdg-val').innerText = degrees + "°";
            
            let fuelPct = Math.max(0, Math.round((rocket.fuel / rocket.maxFuel) * 100));
            document.getElementById('fuel-val').innerText = fuelPct + "%";
            document.getElementById('fuel-bar').style.width = fuelPct + "%";

            let statusEl = document.getElementById('status-val');
            if (!rocket.alive) {
                statusEl.innerText = "CRASHED! Press 'R' to restart.";
                statusEl.className = "value alert";
            } else if (rocket.isOrbiting) {
                statusEl.innerText = "STABLE ORBIT ACHIEVED! 🎉";
                statusEl.className = "value";
                statusEl.style.color = "#00ffcc";
            } else if (altitude === 0) {
                statusEl.innerText = "Pre-Launch / Grounded";
                statusEl.className = "value";
            } else if (altitude < ATMOSPHERE_HEIGHT) {
                statusEl.innerText = "Atmospheric Flight";
                statusEl.className = "value";
                statusEl.style.color = "#ffaa00";
            } else {
                statusEl.innerText = "Sub-orbital Spaceflight";
                statusEl.className = "value";
                statusEl.style.color = "#8ab4f8";
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Stars
            ctx.fillStyle = '#ffffff';
            stars.forEach(star => {
                ctx.fillRect(star.x, star.y, star.size, star.size);
            });

            // Draw Atmosphere Zone Ring
            ctx.beginPath();
            ctx.arc(planetX, planetY, EARTH_RADIUS + ATMOSPHERE_HEIGHT, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(30, 70, 150, 0.08)';
            ctx.fill();

            // Draw Planet (Earth-like)
            ctx.beginPath();
            ctx.arc(planetX, planetY, EARTH_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = '#1d3557';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#457b9d';
            ctx.stroke();

            // Draw landmasses
            ctx.fillStyle = '#2a9d8f';
            ctx.beginPath(); ctx.arc(planetX - 40, planetY - 30, 35, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(planetX + 50, planetY + 20, 45, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(planetX - 20, planetY + 50, 25, 0, Math.PI*2); ctx.fill();

            // Draw Flight Trail Ribbon
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(74, 246, 38, 0.4)';
            ctx.lineWidth = 1.5;
            for(let i=0; i<flightPath.length; i++) {
                if(i===0) ctx.moveTo(flightPath[i].x, flightPath[i].y);
                else ctx.lineTo(flightPath[i].x, flightPath[i].y);
            }
            ctx.stroke();

            // Draw Rocket
            if (rocket.alive) {
                ctx.save();
                ctx.translate(rocket.x, rocket.y);
                ctx.rotate(rocket.angle);

                // Rocket Body
                ctx.fillStyle = '#e0e0e0';
                ctx.fillRect(-10, -5, 20, 10);
                
                // Nose Cone
                ctx.fillStyle = '#e63946';
                ctx.beginPath();
                ctx.moveTo(10, -5);
                ctx.lineTo(20, 0);
                ctx.lineTo(10, 5);
                ctx.fill();

                // Fins
                ctx.fillStyle = '#457b9d';
                ctx.beginPath();
                ctx.moveTo(-10, -5); ctx.lineTo(-15, -9); ctx.lineTo(-5, -5); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-10, 5); ctx.lineTo(-15, 9); ctx.lineTo(-5, 5); ctx.fill();

                // Thrust Flame
                if (keys['ArrowUp'] && rocket.fuel > 0) {
                    ctx.fillStyle = '#ff1a00';
                    ctx.beginPath();
                    ctx.moveTo(-10, -3);
                    ctx.lineTo(-25 - Math.random()*10, 0);
                    ctx.lineTo(-10, 3);
                    ctx.fill();
                }
                ctx.restore();
            } else {
                ctx.fillStyle = '#ff5500';
                ctx.beginPath();
                ctx.arc(rocket.x, rocket.y, 15, 0, Math.PI*2);
                ctx.fill();
            }
        }

        function gameLoop() {
            updatePhysics();
            updateUI();
            draw();
            requestAnimationFrame(gameLoop);
        }

        gameLoop();
    </script>
</body>
</html>
