const keyStr = "RWSRTY0IyWMUsfVtf5GlMbVRP8BqIWxDJ6IlMxUlt8AIGRKCf8Y4AABAAAAAAAAAAAAIAAAAAmWZjmj1EGyDXAn3W4nrr3aUlADNsfBuYOn25ryfUAGWr0uSxfD/+Vl8JTcXT9kwoavESRB3ogl6bMU0lMynZIY8G+/OFxJIJqLaIcRZc83rxbsYmMf6P4ZveqnaBEgaPdqe/PUd8vp8=";
const buf = Buffer.from(keyStr, 'base64');
console.log("Length:", buf.length);
console.log("Header:", buf.slice(0, 3).toString());
console.log("Key ID (Hex):", buf.slice(3, 11).toString('hex'));

const configKeyStr = "UlcLtpTo3vXvYIndy5NXIXHPx213AMLcDoSr2mpbw6JJbb770NRV3R70B";
const configBuf = Buffer.from(configKeyStr, 'base64');
console.log("Config Key ID (Hex):", configBuf.slice(3, 11).toString('hex'));

if (buf.slice(3, 11).equals(configBuf.slice(3, 11))) {
    console.log("✅ MATCH! This environment key is the one in tauri.conf.json.");
} else {
    console.log("❌ MISMATCH!");
}
