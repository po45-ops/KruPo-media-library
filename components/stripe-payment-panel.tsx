"use client";
import { useState } from "react";
import { Elements,PaymentElement,useElements,useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

function Form({orderId}:{orderId:string}){const stripe=useStripe(),elements=useElements(),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);async function submit(event:React.FormEvent){event.preventDefault();if(!stripe||!elements)return;setBusy(true);const result=await stripe.confirmPayment({elements,confirmParams:{return_url:`${window.location.origin}/checkout/${orderId}?returned=1`}});if(result.error)setMessage(result.error.message??"ยืนยันการชำระไม่สำเร็จ");setBusy(false)}return <form onSubmit={submit} className="grid gap-5"><PaymentElement options={{layout:"tabs"}}/><button className="btn btn-primary w-full" disabled={!stripe||busy}>{busy?"กำลังยืนยัน…":"ชำระด้วย PromptPay (Test Mode)"}</button>{message&&<p role="alert" className="text-sm text-red-700">{message}</p>}</form>}
export function StripePaymentPanel({publishableKey,clientSecret,orderId}:{publishableKey:string;clientSecret:string;orderId:string}){const stripe=loadStripe(publishableKey);return <Elements stripe={stripe} options={{clientSecret,appearance:{theme:"stripe",variables:{colorPrimary:"#0F5BD8",borderRadius:"12px"}}}}><Form orderId={orderId}/></Elements>}
