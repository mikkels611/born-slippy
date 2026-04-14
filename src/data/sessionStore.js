const SESSION_VERSION = 1;

export function persistSlots(slots) {
  try { localStorage.setItem("born-slippy-slots", JSON.stringify(slots)); } catch(e){} 
}

export function loadSlotsAsync() {
  try {
    const r = localStorage.getItem("born-slippy-slots");
    if(r) return Promise.resolve(JSON.parse(r));
  } catch(e){}
  return Promise.resolve(null);
}

export function exportSession(slots, settings) {
  const data = {
    version: SESSION_VERSION,
    appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
    createdAt: new Date().toISOString(),
    slots,
    settings,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `born-slippy-session-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importSession(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !Array.isArray(data.slots)) {
          reject(new Error('Invalid session file format'));
          return;
        }
        if (data.slots.length !== 24) {
          reject(new Error('Session must contain exactly 24 slots'));
          return;
        }
        for (let i = 0; i < 24; i++) {
          const slot = data.slots[i];
          if (slot === null) continue;
          if (!slot.bass || !Array.isArray(slot.bass) || slot.bass.length !== 16) {
            reject(new Error(`Invalid slot ${i + 1}: missing or invalid pattern data`));
            return;
          }
          if (!slot.channels || typeof slot.channels !== 'object') {
            reject(new Error(`Invalid slot ${i + 1}: missing channel snapshot`));
            return;
          }
        }
        resolve(data);
      } catch (err) {
        reject(new Error('Failed to parse session file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
