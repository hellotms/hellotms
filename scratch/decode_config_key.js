const keyStr = "UlcLtpTo3vXvYIndy5NXIXHPx213AMLcDoSr2mpbw6JJbb770NRV3R70B";
const buf = Buffer.from(keyStr, 'base64');
console.log("Raw Bytes (Hex):", buf.toString('hex'));
console.log("Length:", buf.length);

// Minisign PubKey structure: 
// 0-2: "RWR" (not always present in raw strings)
// 3-10: Key ID
// 11-42: Public Key (32 bytes)

if (buf.length >= 12) {
    console.log("Extracted Key ID (Hex):", buf.slice(3, 11).toString('hex'));
    console.log("Extracted PubKey (Base64):", buf.slice(11, 43).toString('base64'));
}
