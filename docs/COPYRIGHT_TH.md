# KruPo Copyright Risk Guard

ข้อความที่ใช้กับผู้ใช้: “ระบบวิเคราะห์ความเสี่ยงด้านความซ้ำและแหล่งที่มาของสื่อ” ห้ามกล่าวว่า AI รับรองว่าไม่ละเมิด

Basic provider ตรวจ SHA-256, file duplicate, duplicate creator upload, URL duplicate, normalized Thai text similarity และ image perceptual dHash เมื่อมี decoded pixels ผลเก็บ checked time, provider, model/version, input hash, URL, similarity, reason และ evidence

Advanced provider อยู่หลัง interface และ budget guard เมื่อถึง threshold จะกลับเป็น Basic + Manual Review Claim flow: under review → media hold → notify creator → creator evidence → moderator decision (restore/remove/request more information/suspend creator)
