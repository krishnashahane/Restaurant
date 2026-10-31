import QRCode from "qrcode";
const url = "https://krishnaveg.vercel.app";
const opts = { errorCorrectionLevel: "H", margin: 2, color: { dark: "#0f3d22", light: "#ffffff" } };
await QRCode.toFile("public/qr.png", url, { ...opts, width: 1024 });
await QRCode.toFile("public/qr.svg", url, { ...opts, type: "svg" });
console.log("QR ->", url);
