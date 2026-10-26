const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a24);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20, 20, 25);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.mouseButtons = {
    LEFT: THREE.MOUSE.NONE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
};

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.9);
sunLight.position.set(40, 60, 50);
sunLight.castShadow = true;
scene.add(sunLight);

const textureLoader = new THREE.TextureLoader();
function loadMinecraftTexture(url) {
    const texture = textureLoader.load(url);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

const BASE_URL = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/block/';

const texGrassSide = loadMinecraftTexture(BASE_URL + 'grass_block_side.png');
const texGrassTop  = loadMinecraftTexture(BASE_URL + 'grass_block_top.png');
const texDirt      = loadMinecraftTexture(BASE_URL + 'dirt.png');
const texStone     = loadMinecraftTexture(BASE_URL + 'stone.png');
const texPlanks    = loadMinecraftTexture(BASE_URL + 'oak_planks.png');
const texLogSide   = loadMinecraftTexture(BASE_URL + 'oak_log.png');
const texDiamond   = loadMinecraftTexture(BASE_URL + 'diamond_block.png');
const texBricks    = loadMinecraftTexture(BASE_URL + 'bricks.png');
const texCobble    = loadMinecraftTexture(BASE_URL + 'cobblestone.png');

const blockTypes = [
    {
        name: 'Gras',
        icon: BASE_URL + 'grass_block_side.png',
        materials: [
            new THREE.MeshStandardMaterial({ map: texGrassSide }),
            new THREE.MeshStandardMaterial({ map: texGrassSide }),
            new THREE.MeshStandardMaterial({ map: texGrassTop, color: 0x7cbd6b }),
            new THREE.MeshStandardMaterial({ map: texDirt }),
            new THREE.MeshStandardMaterial({ map: texGrassSide }),
            new THREE.MeshStandardMaterial({ map: texGrassSide })
        ]
    },
    { name: 'Stein', icon: BASE_URL + 'stone.png', materials: new THREE.MeshStandardMaterial({ map: texStone }) },
    { name: 'Holz', icon: BASE_URL + 'oak_planks.png', materials: new THREE.MeshStandardMaterial({ map: texPlanks }) },
    { name: 'Diamant', icon: BASE_URL + 'diamond_block.png', materials: new THREE.MeshStandardMaterial({ map: texDiamond }) },
    { name: 'Ziegel', icon: BASE_URL + 'bricks.png', materials: new THREE.MeshStandardMaterial({ map: texBricks }) },
    { name: 'Bruchstein', icon: BASE_URL + 'cobblestone.png', materials: new THREE.MeshStandardMaterial({ map: texCobble }) },
    { name: 'Baumstamm', icon: BASE_URL + 'oak_log.png', materials: new THREE.MeshStandardMaterial({ map: texLogSide }) }
];

let activeBlockIndex = 0;
const slots = document.querySelectorAll('.slot');
slots.forEach((slot, idx) => { if (blockTypes[idx]) slot.style.backgroundImage = `url('${blockTypes[idx].icon}')`; });

function selectBlock(index) {
    activeBlockIndex = index;
    slots.forEach((s, idx) => {
        if (idx === index) s.classList.add('active');
        else s.classList.remove('active');
    });
}

window.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '6') selectBlock(parseInt(e.key) - 1);
});

const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const objects = [];
const blocksData = [];

const planeGeometry = new THREE.PlaneGeometry(100, 100);
planeGeometry.rotateX(-Math.PI / 2);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x22222b });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.position.y = -0.5;
plane.receiveShadow = true;
scene.add(plane);
objects.push(plane);

const gridHelper = new THREE.GridHelper(100, 100, 0x555555, 0x333333);
gridHelper.position.y = -0.49;
scene.add(gridHelper);

const rollOverGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
const rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc00, wireframe: true });
const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
scene.add(rollOverMesh);

function createBlock(x, y, z, typeIndex, save = true) {
    const mat = blockTypes[typeIndex] ? blockTypes[typeIndex].materials : blockTypes[0].materials;
    const block = new THREE.Mesh(blockGeometry, mat);
    block.position.set(x, y, z);
    block.castShadow = true;
    block.receiveShadow = true;
    block.userData = { x, y, z, type: typeIndex };
    scene.add(block);
    objects.push(block);

    if (save) {
        blocksData.push({ x, y, z, type: typeIndex });
    }
}

function removeBlock(blockMesh) {
    scene.remove(blockMesh);
    const objIndex = objects.indexOf(blockMesh);
    if (objIndex !== -1) objects.splice(objIndex, 1);
    
    const index = blocksData.findIndex(b => b.x === blockMesh.userData.x && b.y === blockMesh.userData.y && b.z === blockMesh.userData.z);
    if (index !== -1) blocksData.splice(index, 1);
    saveToLocalStorage();
}

// --- EIGENER NBT-PARSER ---
const NBT_TYPES = ['end','byte','short','int','long','float','double','byteArray','string','list','compound','intArray','longArray'];
function parseNbt(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const dec = new TextDecoder('utf-8');
    let p = 0;
    const readStr = () => {
        const len = dv.getUint16(p); p += 2;
        const s = dec.decode(u8.subarray(p, p + len)); p += len;
        return s;
    };
    function payload(t) {
        switch (t) {
            case 1: return dv.getInt8(p++);
            case 2: { const v = dv.getInt16(p); p += 2; return v; }
            case 3: { const v = dv.getInt32(p); p += 4; return v; }
            case 4: { const v = dv.getBigInt64(p); p += 8; return v; }
            case 5: { const v = dv.getFloat32(p); p += 4; return v; }
            case 6: { const v = dv.getFloat64(p); p += 8; return v; }
            case 7: { const len = dv.getInt32(p); p += 4; const a = u8.subarray(p, p + len); p += len; return a; }
            case 8: return readStr();
            case 9: {
                const it = dv.getUint8(p++);
                const len = dv.getInt32(p); p += 4;
                const arr = [];
                for (let i = 0; i < len; i++) arr.push({ type: NBT_TYPES[it], value: payload(it) });
                return arr;
            }
            case 10: {
                const obj = {};
                while (true) {
                    const t2 = dv.getUint8(p++);
                    if (t2 === 0) break;
                    const name = readStr();
                    obj[name] = { type: NBT_TYPES[t2], value: payload(t2) };
                }
                return obj;
            }
            case 11: {
                const len = dv.getInt32(p); p += 4;
                const a = new Array(len);
                for (let i = 0; i < len; i++) { a[i] = dv.getInt32(p); p += 4; }
                return a;
            }
            case 12: {
                const len = dv.getInt32(p); p += 4;
                p += len * 8;
                return [];
            }
            default: throw new Error("Unbekannter NBT-Typ: " + t);
        }
    }
    const rootType = dv.getUint8(p++);
    if (rootType !== 10) throw new Error("Keine gültige NBT-Datei (Root ist kein Compound)");
    readStr();
    return { type: 'compound', value: payload(10) };
}

const NBT = {
    parse(u8, cb) {
        let result = null, err = null;
        try { result = parseNbt(u8); } catch (e) { err = e; }
        cb(err, result);
    }
};

function loadSchematicFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'block';

    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const buffer = new Uint8Array(e.target.result);

                if (file.name.endsWith('.zip') || (buffer[0] === 0x50 && buffer[1] === 0x4B)) {
                    fflate.unzip(buffer, (err, unzipped) => {
                        if (err) {
                            overlay.style.display = 'none';
                            event.target.value = '';
                            return alert("Konnte ZIP-Datei nicht entpacken.");
                        }
                        let foundKey = Object.keys(unzipped).find(k => k.endsWith('.schem') || k.endsWith('.schematic'));
                        if (foundKey) parseNBTData(unzipped[foundKey]);
                        else {
                            overlay.style.display = 'none';
                            alert("Keine Bauplan-Datei im ZIP gefunden.");
                        }
                        event.target.value = '';
                    });
                } else {
                    parseNBTData(buffer);
                    event.target.value = '';
                }
            } catch (err) {
                overlay.style.display = 'none';
                event.target.value = '';
                console.error(err);
                alert("Fehler beim Verarbeiten der Datei: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }, 100);
}

function parseNBTData(uint8Data) {
    let uncompressed;
    try { uncompressed = pako.ungzip(uint8Data); } catch (err) { uncompressed = uint8Data; }

    NBT.parse(uncompressed, function(error, data) {
        document.getElementById('loading-overlay').style.display = 'none';

        if (error || !data) {
            console.error(error);
            alert("NBT konnte nicht gelesen werden: " + (error ? error.message || error : "keine Daten"));
            return;
        }

        try {
            const unwrap = v => (v && typeof v === 'object' && 'value' in v && 'type' in v) ? v.value : v;
            let root = unwrap(data);
            if (root.Schematic) root = unwrap(root.Schematic);

            console.log("Schematic-Keys:", Object.keys(root));

            const width  = unwrap(root.Width);
            const height = unwrap(root.Height);
            const length = unwrap(root.Length);

            if (!width || !height || !length) throw new Error("Width/Height/Length fehlen. Keys: " + Object.keys(root).join(", "));

            let palette = null, blockData = null, oldBlocks = null;

            if (root.Blocks && root.Blocks.type === 'compound') {
                const b = unwrap(root.Blocks);
                palette   = unwrap(b.Palette);
                blockData = unwrap(b.Data);
            } else if (root.BlockData) {
                palette   = unwrap(root.Palette);
                blockData = unwrap(root.BlockData);
            } else if (root.Blocks) {
                oldBlocks = unwrap(root.Blocks);
            } else {
                throw new Error("Unbekanntes Format. Keys: " + Object.keys(root).join(", "));
            }

            clearWorld(false);

            const slider = document.getElementById('layer-slider');
            slider.max = height; 
            slider.value = height;
            document.getElementById('layer-val').innerText = height;

            const ox = Math.floor(width / 2), oz = Math.floor(length / 2);

            if (oldBlocks) {
                let i = 0;
                for (let y = 0; y < height; y++)
                    for (let z = 0; z < length; z++)
                        for (let x = 0; x < width; x++) {
                            const id = oldBlocks[i++] & 0xFF;
                            if (id !== 0) createBlock(x - ox, y, z - oz, getBlockTypeFromID(id), false);
                        }
            } else {
                const paletteMap = {};
                Object.keys(palette).forEach(name => { paletteMap[unwrap(palette[name])] = name; });

                const ids = [];
                let offset = 0;
                const total = width * height * length;

                while (offset < blockData.length && ids.length < total) {
                    let value = 0, size = 0, byte;
                    do {
                        byte = blockData[offset++] & 0xFF;
                        value |= (byte & 0x7F) << (size * 7);
                        size++;
                    } while ((byte & 0x80) !== 0 && offset < blockData.length);
                    ids.push(value);
                }

                let i = 0;
                for (let y = 0; y < height; y++)
                    for (let z = 0; z < length; z++)
                        for (let x = 0; x < width; x++) {
                            const name = paletteMap[ids[i++]] || '';
                            if (name && !name.includes('air'))
                                createBlock(x - ox, y, z - oz, getBlockTypeFromName(name), false);
                        }
            }

            saveToLocalStorage();

            const maxDim = Math.max(width, height, length);
            camera.position.set(maxDim * 1.2, maxDim * 1.2, maxDim * 1.5);
            controls.target.set(0, height / 2, 0);
            controls.update();

        } catch (e) {
            console.error(e);
            alert("Fehler beim Lesen der Bauplan-Struktur:\n" + e.message);
        }
    });
}

function getBlockTypeFromID(id) {
    if (id === 2 || id === 3) return 0;
    if (id === 5) return 2;
    if (id === 17) return 6;
    if (id === 57) return 3;
    if (id === 45) return 4;
    if (id === 4) return 5;
    return 1;
}

function getBlockTypeFromName(name) {
    const n = name.toLowerCase();
    if (n.includes('grass') || n.includes('dirt')) return 0;
    if (n.includes('log') || n.includes('wood') || n.includes('stem')) return 6;
    if (n.includes('plank') || n.includes('fence') || n.includes('door') || n.includes('slab') || n.includes('stairs')) return 2;
    if (n.includes('diamond')) return 3;
    if (n.includes('brick')) return 4;
    if (n.includes('cobble') || n.includes('stone') || n.includes('deepslate') || n.includes('granite') || n.includes('andesite')) return 5;
    return 1;
}

function updateLayerVisibility(maxY) {
    document.getElementById('layer-val').innerText = maxY;
    objects.forEach(obj => {
        if (obj !== plane) {
            obj.visible = obj.position.y <= parseInt(maxY);
        }
    });
}

function saveToLocalStorage() { localStorage.setItem('minecraft_world', JSON.stringify(blocksData)); }

function loadFromLocalStorage() {
    const savedWorld = localStorage.getItem('minecraft_world');
    if (savedWorld) {
        const parsed = JSON.parse(savedWorld);
        parsed.forEach(b => createBlock(b.x, b.y, b.z, b.type, false));
    } else {
        createBlock(0, 0, 0, 0, false);
    }
}

function exportWorld() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blocksData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "mein-minecraft-bauwerk.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importWorld(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const importedData = JSON.parse(e.target.result);
        clearWorld(false);
        importedData.forEach(b => createBlock(b.x, b.y, b.z, b.type, false));
        saveToLocalStorage();
        event.target.value = '';
    };
    reader.readAsText(file);
}

function clearWorld(ask = true) {
    if (ask && !confirm("Möchtest du wirklich alle Blöcke löschen?")) return;
    for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i] !== plane) scene.remove(objects[i]);
    }
    objects.length = 0;
    objects.push(plane);
    blocksData.length = 0;
    saveToLocalStorage();
    if (rollOverMesh) rollOverMesh.visible = false;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isShiftDown = false;

document.addEventListener('keydown', (e) => { if (e.key === 'Shift') isShiftDown = true; });
document.addEventListener('keyup', (e) => { if (e.key === 'Shift') isShiftDown = false; });

window.addEventListener('pointermove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (isShiftDown) {
            const targetPos = intersect.point.clone().add(intersect.face.normal.clone().multiplyScalar(0.5));
            rollOverMesh.position.copy(targetPos).floor().addScalar(0.5);
            rollOverMesh.visible = true;
        } else {
            if (intersect.object !== plane) {
                rollOverMesh.position.copy(intersect.object.position);
                rollOverMesh.visible = true;
            } else {
                rollOverMesh.visible = false;
            }
        }
    } else {
        rollOverMesh.visible = false;
    }
});

window.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('#hotbar-container') || event.target.closest('#menu-container') || event.target.closest('#layer-container')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        if (isShiftDown) {
            const targetPos = intersect.point.clone().add(intersect.face.normal.clone().multiplyScalar(0.5)).floor().addScalar(0.5);
            createBlock(targetPos.x, targetPos.y, targetPos.z, activeBlockIndex, true);
            saveToLocalStorage();
        } else {
            if (intersect.object !== plane) {
                removeBlock(intersect.object);
                rollOverMesh.visible = false;
            }
        }
    }
});

loadFromLocalStorage();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
