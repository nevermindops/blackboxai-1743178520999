// Core game variables
let scene, camera, renderer, world;
let player, weapon, enemies = [];
let score = 0;
let health = 100;
let ammo = 30;
let maxAmmo = 30;
let isGameOver = false;

// Initialize the game
function init() {
    // Create Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    
    // Setup camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6; // Approximate eye level
    
    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Setup physics world
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Earth gravity
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
    
    // Setup lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);
    
    // Setup player controls
    setupPlayerControls();
    
    // Create level
    createLevel();
    
    // Create weapon
    createWeapon();
    
    // Create enemies
    createEnemies();
    
    // Start game loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Player controls setup
function setupPlayerControls() {
    // Mouse look controls
    document.addEventListener('mousemove', (event) => {
        if (isGameOver) return;
        
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        // Horizontal rotation
        player.rotation.y -= movementX * 0.002;
        
        // Vertical rotation (limited to prevent flipping)
        camera.rotation.x -= movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, camera.rotation.x));
    });
    
    // Shooting
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0 && !isGameOver) { // Left click
            fireWeapon();
        }
    });
    
    // Keyboard movement
    const keys = {};
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
    });
    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });
    
    // Movement update
    const playerSpeed = 0.1;
    const playerBody = new CANNON.Body({ mass: 5 });
    playerBody.addShape(new CANNON.Sphere(0.5));
    playerBody.position.set(0, 1, 0);
    world.addBody(playerBody);
    
    function updateMovement() {
        if (isGameOver) return;
        
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();
        
        const sideDirection = new THREE.Vector3();
        sideDirection.crossVectors(new THREE.Vector3(0, 1, 0), direction);
        
        const velocity = new CANNON.Vec3();
        
        if (keys['KeyW']) velocity.vadd(direction.clone().multiplyScalar(playerSpeed).toCANNON(), velocity);
        if (keys['KeyS']) velocity.vadd(direction.clone().multiplyScalar(-playerSpeed).toCANNON(), velocity);
        if (keys['KeyA']) velocity.vadd(sideDirection.clone().multiplyScalar(playerSpeed).toCANNON(), velocity);
        if (keys['KeyD']) velocity.vadd(sideDirection.clone().multiplyScalar(-playerSpeed).toCANNON(), velocity);
        
        playerBody.velocity.x = velocity.x;
        playerBody.velocity.z = velocity.z;
        
        // Update Three.js position to match physics
        player.position.copy(playerBody.position);
        camera.position.copy(playerBody.position);
        camera.position.y += 1.6; // Eye level
    }
    
    // Add movement update to game loop
    window.updateMovement = updateMovement;
}

// Create level geometry
function createLevel() {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    
    // Create walls
    const wallGeometry = new THREE.BoxGeometry(1, 3, 10);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    
    // Left wall
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-5, 1.5, 0);
    scene.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.position.set(5, 1.5, 0);
    scene.add(rightWall);
    
    // Back wall
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.rotation.y = Math.PI / 2;
    backWall.position.set(0, 1.5, -5);
    scene.add(backWall);
    
    // Front wall (with opening)
    const frontWallLeft = new THREE.Mesh(
        new THREE.BoxGeometry(4, 3, 1),
        wallMaterial
    );
    frontWallLeft.position.set(-3, 1.5, 5);
    scene.add(frontWallLeft);
    
    const frontWallRight = new THREE.Mesh(
        new THREE.BoxGeometry(4, 3, 1),
        wallMaterial
    );
    frontWallRight.position.set(3, 1.5, 5);
    scene.add(frontWallRight);
}

// Create weapon
function createWeapon() {
    const weaponGeometry = new THREE.BoxGeometry(0.3, 0.1, 1);
    const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(0.3, -0.2, -0.5);
    camera.add(weapon);
    scene.add(camera);
}

// Fire weapon
function fireWeapon() {
    if (ammo <= 0) return;
    
    ammo--;
    updateAmmoUI();
    
    // Weapon recoil animation
    weapon.position.z -= 0.1;
    setTimeout(() => {
        weapon.position.z += 0.1;
    }, 100);
    
    // Raycasting for hit detection
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(), camera);
    const intersects = raycaster.intersectObjects(scene.children);
    
    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        // Check if we hit an enemy
        if (hitObject.userData.isEnemy) {
            hitObject.userData.health -= 25;
            if (hitObject.userData.health <= 0) {
                // Enemy killed
                scene.remove(hitObject);
                score += 100;
                updateScoreUI();
            }
        }
    }
}

// Create enemies
function createEnemies() {
    const enemyGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
    const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    
    for (let i = 0; i < 3; i++) {
        const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
        enemy.position.set(
            Math.random() * 8 - 4,
            0.75,
            Math.random() * 8 - 4
        );
        enemy.userData = {
            isEnemy: true,
            health: 100
        };
        scene.add(enemy);
        enemies.push(enemy);
    }
}

// Update UI elements
function updateHealthUI() {
    document.getElementById('health-fill').style.width = `${health}%`;
    document.getElementById('health-fill').style.backgroundColor = 
        health > 50 ? '#4CAF50' : 
        health > 20 ? '#FFC107' : '#F44336';
}

function updateAmmoUI() {
    document.getElementById('current-ammo').textContent = ammo;
}

function updateScoreUI() {
    document.getElementById('score').textContent = score;
}

// Game loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update physics
    world.step(1/60);
    
    // Update movement
    if (window.updateMovement) window.updateMovement();
    
    // Update enemies
    updateEnemies();
    
    // Render scene
    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start the game
init();