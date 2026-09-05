export interface FileSafetyResult{status:"clean"|"unsafe"|"manual_review"|"failed";provider:string;reason:string;signatures:string[];checkedAt:string;}
export interface FileSafetyProvider{readonly name:string;check(bytes:Uint8Array,fileName:string,mimeType:string):Promise<FileSafetyResult>}
