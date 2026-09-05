import "server-only";
const encoder=new TextEncoder(),decoder=new TextDecoder();
function bytesToBase64(bytes:Uint8Array){let value="";for(const byte of bytes)value+=String.fromCharCode(byte);return btoa(value)}
function base64ToBytes(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0))}
async function keyFromSecret(secret:string){const digest=await crypto.subtle.digest("SHA-256",encoder.encode(secret));return crypto.subtle.importKey("raw",digest,"AES-GCM",false,["encrypt","decrypt"])}
export async function encryptSecureTarget(url:string,secret:string){const parsed=new URL(url);if(!["https:"].includes(parsed.protocol))throw new Error("ปลายทางต้องใช้ HTTPS");const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},await keyFromSecret(secret),encoder.encode(url));return {ciphertext:bytesToBase64(new Uint8Array(encrypted)),iv:bytesToBase64(iv),algorithm:"AES-256-GCM" as const}}
export async function decryptSecureTarget(ciphertext:string,iv:string,secret:string){const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(iv)},await keyFromSecret(secret),base64ToBytes(ciphertext));return decoder.decode(clear)}
export async function sha256(input:ArrayBuffer|Uint8Array|string){const bytes=typeof input==="string"?encoder.encode(input):input instanceof Uint8Array?input:new Uint8Array(input);const digest=await crypto.subtle.digest("SHA-256",bytes as BufferSource);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("")}
