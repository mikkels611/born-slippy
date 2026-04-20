import { exec } from 'child_process';
import { platform } from 'os';

console.log('=== MIDI Device Test ===\n');
console.log(`Platform: ${platform()}`);
console.log(`Node: ${process.version}\n`);

// Use OS-level commands to list MIDI devices without extra dependencies
const os = platform();

if (os === 'win32') {
  // PowerShell query for USB MIDI devices via WMI
  const ps = `
    Write-Host '--- USB Devices (MIDI-related) ---'
    Get-PnpDevice -Class 'MEDIA' -Status OK -ErrorAction SilentlyContinue |
      Where-Object { $_.FriendlyName -match 'MIDI|Audio|Elektron|Digitone|Digitakt|Syntakt|Analog' } |
      Format-Table -Property Status, Class, FriendlyName -AutoSize

    Write-Host '--- All Sound/Media Devices ---'
    Get-PnpDevice -Class 'MEDIA' -Status OK -ErrorAction SilentlyContinue |
      Format-Table -Property Status, Class, FriendlyName -AutoSize

    Write-Host '--- USB Audio Devices ---'
    Get-PnpDevice -Class 'AudioEndpoint' -Status OK -ErrorAction SilentlyContinue |
      Where-Object { $_.FriendlyName -match 'Elektron|Digitone|Digitakt|Syntakt|Analog|MIDI' } |
      Format-Table -Property Status, Class, FriendlyName -AutoSize

    Write-Host '--- Software/Driver Devices (MIDI) ---'
    Get-PnpDevice -Status OK -ErrorAction SilentlyContinue |
      Where-Object { $_.FriendlyName -match 'MIDI' } |
      Format-Table -Property Status, Class, FriendlyName, InstanceId -AutoSize
  `;
  exec(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`, (err, stdout, stderr) => {
    if (err) console.error('Error:', err.message);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    // Also try Web MIDI-like test using a tiny inline HTML
    console.log('--- Browser Web MIDI Test ---');
    console.log('To test Web MIDI in the browser, open DevTools (F12) console and run:');
    console.log('  navigator.requestMIDIAccess().then(a => console.log([...a.outputs.values()].map(o => o.name)))');
    console.log('');
    console.log('If the Digitone does not appear:');
    console.log('  1. Make sure the Digitone USB MIDI driver is installed');
    console.log('     → Elektron Overbridge: https://www.elektron.se/overbridge');
    console.log('  2. Check Windows Device Manager → Sound, video and game controllers');
    console.log('  3. Try a different USB cable (some are charge-only)');
    console.log('  4. Use Chrome (not Firefox — Firefox lacks Web MIDI support)');
  });
} else {
  // macOS / Linux
  const cmd = os === 'darwin'
    ? 'system_profiler SPUSBDataType 2>/dev/null | grep -A2 -i "midi\\|elektron\\|digitone"'
    : 'aconnect -o 2>/dev/null || amidi -l 2>/dev/null';
  exec(cmd, (err, stdout) => {
    if (stdout) console.log(stdout);
    else console.log('No MIDI devices found via system query.');
  });
}
