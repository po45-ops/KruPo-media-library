export type CopyrightRisk="LOW"|"MEDIUM"|"HIGH"|"UNKNOWN";
export interface RiskEvidence{kind:string;reference?:string;similarity?:number;detail:string;}
export interface CopyrightCheckResult{risk:CopyrightRisk;provider:string;model:string;modelVersion:string;inputHash:string;checkedAt:string;reason:string;evidence:RiskEvidence[];urlsFound:string[];}
export interface TextCheckInput{text:string;knownTexts?:{id:string;text:string}[];}
export interface ImageCheckInput{bytes:Uint8Array;grayscalePixels?:number[];width?:number;height?:number;knownHashes?:{id:string;hash:string}[];}
export interface FileCheckInput{bytes:Uint8Array;fileName:string;knownChecksums?:{id:string;checksum:string;creatorId?:string}[];creatorId?:string;}
export interface WebSourceInput{urls:string[];knownUrls?:{id:string;url:string}[];}
export interface CopyrightRiskProvider{readonly name:string;checkText(input:TextCheckInput):Promise<CopyrightCheckResult>;checkImage(input:ImageCheckInput):Promise<CopyrightCheckResult>;checkFile(input:FileCheckInput):Promise<CopyrightCheckResult>;checkWebSources(input:WebSourceInput):Promise<CopyrightCheckResult>;}
