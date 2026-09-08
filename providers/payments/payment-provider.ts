export type PaymentStatus="pending"|"awaiting_payment"|"paid"|"failed"|"expired"|"refunded";
export interface PaymentRequest{orderId:string;amountSatang:number;currency:"thb";description:string;customerEmail?:string;idempotencyKey:string;}
export interface PaymentSession{provider:string;providerPaymentId:string;status:PaymentStatus;clientSecret?:string;promptPayQrUrl?:string;expiresAt?:string;}
export interface VerifiedPaymentEvent{kind:"payment";eventId:string;providerPaymentId:string;orderId:string;status:PaymentStatus;amountSatang:number;rawType:string;}
export interface VerifiedRefundEvent{kind:"refund";eventId:string;providerRefundId:string;providerPaymentId?:string;status:"pending"|"succeeded"|"failed";amountSatang:number;rawType:"refund.updated"|"refund.failed";failureReason?:string;}
export type VerifiedPaymentProviderEvent=VerifiedPaymentEvent|VerifiedRefundEvent;
export interface RefundRequest{providerPaymentId:string;amountSatang:number;reason:string;idempotencyKey:string;customerEmail?:string}
export interface RefundResult{providerRefundId:string;status:"pending"|"succeeded"|"failed"}
export interface RefundLookupResult extends RefundResult{amountSatang:number;failureReason?:string}
export interface PaymentProvider{readonly name:"mock"|"stripe"|"disabled";createPayment(request:PaymentRequest):Promise<PaymentSession>;verifyWebhook(payload:string,signature:string|null):Promise<VerifiedPaymentProviderEvent>;refund(request:RefundRequest):Promise<RefundResult>;retrieveRefund?(providerRefundId:string):Promise<RefundLookupResult>;health():Promise<{status:"healthy"|"warning"|"critical"|"unknown";message:string}>;}
