import type { StorageMetadata,StorageProvider,UploadInput } from "./storage-provider";
interface Stored{metadata:StorageMetadata;bytes:Uint8Array}
export class LocalTestStorageProvider implements StorageProvider{
 readonly name="local_test" as const;private files=new Map<string,Stored>();
 async upload(input:UploadInput){const id=crypto.randomUUID();const bytes=input.data instanceof Blob?new Uint8Array(await input.data.arrayBuffer()):input.data;const metadata:StorageMetadata={provider:this.name,fileId:id,path:input.path,fileName:input.fileName,mimeType:input.mimeType,size:bytes.byteLength,checksum:input.checksum,createdAt:new Date().toISOString()};this.files.set(id,{metadata,bytes});return metadata}
 async download(fileId:string){const file=this.files.get(fileId);if(!file)return new Response("Not found",{status:404});return new Response(file.bytes as BodyInit,{headers:{"Content-Type":file.metadata.mimeType,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(file.metadata.fileName)}`,"Cache-Control":"private, no-store"}})}
 async delete(id:string){this.files.delete(id)}async exists(id:string){return this.files.has(id)}async getMetadata(id:string){const value=this.files.get(id);if(!value)throw new Error("ไม่พบไฟล์");return value.metadata}
 async move(id:string,path:string){const value=this.files.get(id);if(!value)throw new Error("ไม่พบไฟล์");value.metadata={...value.metadata,path};return value.metadata}
 async copy(id:string,path:string){const value=this.files.get(id);if(!value)throw new Error("ไม่พบไฟล์");return this.upload({path,fileName:value.metadata.fileName,mimeType:value.metadata.mimeType,data:value.bytes,checksum:value.metadata.checksum})}
 async health(){return {status:"healthy" as const,message:"Local test storage พร้อมใช้งานใน process นี้"}}
}
