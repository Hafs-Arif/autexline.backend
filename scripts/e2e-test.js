/* eslint-disable no-console */
const { spawn } = require('child_process');
const path = require('path');

// Node 18+ has global fetch, FormData, Blob
if (typeof fetch !== 'function') {
  console.error('This script requires Node.js v18+ with global fetch.');
  process.exit(1);
}

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@autoshop.com';
const ADMIN_PASS = process.env.TEST_ADMIN_PASS || 'admin123';

const waitForServer = () => {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let ready = false;

    const onData = (data) => {
      const text = data.toString();
      process.stdout.write(text);
      if (!ready && (/Server running on port/i).test(text)) {
        ready = true;
        resolve(server);
      }
    };

    server.stdout.on('data', onData);
    server.stderr.on('data', onData);

    server.on('exit', (code) => {
      if (!ready) {
        reject(new Error(`Server exited early with code ${code}`));
      }
    });

    // Failsafe timeout
    setTimeout(() => {
      if (!ready) {
        reject(new Error('Timeout waiting for server to start'));
      }
    }, 15000);
  });
};

async function loginAdmin() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${text}`);
  const data = JSON.parse(text);
  if (!data.token) throw new Error('No token in login response');
  return data.token;
}

async function fetchBlob(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to download test image');
  const buf = await resp.arrayBuffer();
  return new Blob([Buffer.from(buf)], { type: 'image/jpeg' });
}

async function createVehicle(token, overrides = {}) {
  const imgBlob = await fetchBlob('https://cloudinary-devs.github.io/cld-docs-assets/assets/images/happy_people.jpg');
  const form = new FormData();
  form.append('category', overrides.category || 'stockCars');
  form.append('title', overrides.title || 'E2E Test Vehicle');
  form.append('price', overrides.price || '$10,330');
  form.append('totalPrice', overrides.totalPrice || '$12,464');
  form.append('stockNo', overrides.stockNo || `E2E-${Date.now()}`);
  form.append('mileage', overrides.mileage || '12,345 km');
  form.append('year', overrides.year || '2018');
  form.append('engine', overrides.engine || '2,000cc');
  form.append('engineCode', overrides.engineCode || '1NZ-FE');
  form.append('modelCode', overrides.modelCode || 'DBA-XXX');
  form.append('transmission', overrides.transmission || 'AT');
  form.append('location', overrides.location || 'Korea');
  form.append('color', overrides.color || 'Gray');
  form.append('fuel', overrides.fuel || 'Petrol');
  form.append('drive', overrides.drive || '2WD');
  form.append('seats', overrides.seats || '5');
  form.append('doors', overrides.doors || '4');
  form.append('features', JSON.stringify(overrides.features || ['Power Steering','A/C','Airbag']));
  form.append('images', imgBlob, 'test.jpg');
  if (overrides.capacity) form.append('capacity', overrides.capacity);
  if (overrides.condition) form.append('condition', overrides.condition);

  const res = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) throw new Error(`Create vehicle failed: ${res.status} ${body?.message || text}`);
  if (!body || !body._id) throw new Error('No _id returned for created vehicle');
  if (!body.image || !String(body.image).includes('res.cloudinary.com')) {
    throw new Error(`Vehicle image is not a Cloudinary URL: ${body.image}`);
  }
  if (!body.engineCode || !body.modelCode) {
    throw new Error('engineCode/modelCode missing on created vehicle');
  }
  return body;
}

async function createPart(token) {
  const imgBlob = await fetchBlob('https://cloudinary-devs.github.io/cld-docs-assets/assets/images/happy_people.jpg');
  const form = new FormData();
  form.append('name', 'E2E Test Part');
  form.append('category', 'Engine & Components');
  form.append('brand', 'OEM');
  form.append('price', '199');
  form.append('stock', '3');
  form.append('compatibleVehicles', JSON.stringify(['Toyota Corolla 2014-2018']));
  form.append('images', imgBlob, 'part.jpg');

  const res = await fetch(`${API_BASE}/parts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create part failed: ${res.status} ${data?.message || ''}`);
  return data;
}

async function verifyInventoryContains(createdId, categoryKey = 'stockCars') {
  const res = await fetch(`${API_BASE}/vehicles/inventory`);
  if (!res.ok) throw new Error(`Inventory fetch failed: ${res.status}`);
  const data = await res.json();
  const found = Array.isArray(data?.[categoryKey]) && data[categoryKey].find(v => String(v._id) === String(createdId));
  if (!found) throw new Error(`Created vehicle not found in ${categoryKey} inventory`);
}

(async () => {
  let server;
  try {
    console.log('Starting server...');
    server = await waitForServer();
    console.log('Server is ready. Logging in as admin...');
    const token = await loginAdmin();

    console.log('Creating one vehicle per category...');
    const normal = await createVehicle(token, { category: 'stockCars', title: 'Normal Car', engineCode: '2AR-FE', modelCode: 'ZRE-123' });
    await verifyInventoryContains(normal._id, 'stockCars');

    const salvage = await createVehicle(token, { category: 'salvageVehicles', title: 'Salvage Car', condition: 'Front damage', engineCode: '1ZZ-FE', modelCode: 'NZT-240' });
    await verifyInventoryContains(salvage._id, 'salvageVehicles');

    const machinery = await createVehicle(token, { category: 'constructionMachinery', title: 'Excavator', capacity: '20 tons', engineCode: '6BT', modelCode: 'PC200' });
    await verifyInventoryContains(machinery._id, 'constructionMachinery');

    const bike = await createVehicle(token, { category: 'bikes', title: 'Motorcycle', seats: '2', doors: '0', engineCode: 'CBR1000', modelCode: 'SC77' });
    await verifyInventoryContains(bike._id, 'bikes');

    console.log('Creating one part...');
    const part = await createPart(token);
    if (!part || !part._id) throw new Error('Part creation failed');

    console.log('E2E creation complete. IDs:', { normal: normal._id, salvage: salvage._id, machinery: machinery._id, bike: bike._id, part: part._id });
    process.exitCode = 0;
  } catch (err) {
    console.error('E2E test failed:', err);
    process.exitCode = 1;
  } finally {
    setTimeout(() => {
      if (server && !server.killed) {
        try { server.kill('SIGTERM'); } catch (_) {}
      }
      process.exit();
    }, 1000);
  }
})(); 