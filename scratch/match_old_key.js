const oldPubKeyStr = "RWTSF/+NoH8Q1iRMRDi26SZW2LhBssWWoLbTQaFUNONSZUsasHInsUv0q";
const oldPubKeyBuf = Buffer.from(oldPubKeyStr, 'base64');
console.log("Old Config Key ID:", oldPubKeyBuf.slice(3, 11).toString('hex'));

const envKeyStr = "RWSRTY0IyWMUsfVtf5GlMbVRP8BqIWxDJ6IlMxUlt8AIGRKCf8Y4AABAAAAAAAAAAAAIAAAAAmWZjmj1EGyDXAn3W4nrr3aUlADNsfBuYOn25ryfUAGWr0uSxfD/+Vl8JTcXT9kwoavESRB3ogl6bMU0lMynZIY8G+/OFxJIJqLaIcRZc83rxbsYmMf6P4ZveqnaBEgaPdqe/PUd8vp8=";
const envKeyBuf = Buffer.from(envKeyStr, 'base64');
console.log("Env Key ID:", envKeyBuf.slice(3, 11).toString('hex'));

if (oldPubKeyBuf.slice(3, 11).equals(envKeyBuf.slice(3, 11))) {
    console.log("✅ MATCH! Fixed! The environment key matches the old public key.");
} else {
    console.log("❌ MISMATCH!");
}
