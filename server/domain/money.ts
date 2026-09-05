export function assertSatang(value:number):number { if(!Number.isSafeInteger(value)||value<0) throw new Error("จำนวนเงินต้องเป็นจำนวนเต็มหน่วยสตางค์"); return value; }
export function formatBaht(satang:number):string { assertSatang(satang); if(satang===0) return "ฟรี"; return `${new Intl.NumberFormat("th-TH",{maximumFractionDigits:2}).format(satang/100)} บาท`; }

export function formatBahtAmount(satang:number):string {
  assertSatang(satang);
  return `${new Intl.NumberFormat("th-TH",{maximumFractionDigits:2}).format(satang/100)} บาท`;
}
export function calculateCartTotal(pricesSatang:number[]):number { return pricesSatang.reduce((sum,value)=>sum+assertSatang(value),0); }
export function canCheckout(totalSatang:number,minimumSatang=1000):boolean { return assertSatang(totalSatang)>=assertSatang(minimumSatang); }
