import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const UNIT_LIST = [undefined, "KG", "LB"];
const DIGIT_LIST = [undefined, -1, 0, 1];
export const seedBarcodeTypes = async () => {
  await prisma.barcodeType.deleteMany({});
  await prisma.barcodeType.create({
    data: {
      name: "EAN",
      productCodeLocation: "EAN_제품코드위치",
      sampleData: "4912345123459",
      weightLocation: "EAN_중량정보위치",
      unit: UNIT_LIST[Math.floor(Math.random() * UNIT_LIST.length)],
      digits: DIGIT_LIST[Math.floor(Math.random() * DIGIT_LIST.length)],
    },
  });
  await prisma.barcodeType.create({
    data: {
      name: "ITF",
      productCodeLocation: "ITF_제품코드위치",
      sampleData: "123456",
      weightLocation: "ITF_중량정보위치",
      unit: UNIT_LIST[Math.floor(Math.random() * UNIT_LIST.length)],
      digits: DIGIT_LIST[Math.floor(Math.random() * DIGIT_LIST.length)],
    },
  });
  await prisma.barcodeType.create({
    data: {
      name: "CODE39",
      productCodeLocation: "CODE39_제품코드위치",
      sampleData: "ABC123",
      weightLocation: "CODE39_중량정보위치",
      unit: UNIT_LIST[Math.floor(Math.random() * UNIT_LIST.length)],
      digits: DIGIT_LIST[Math.floor(Math.random() * DIGIT_LIST.length)],
    },
  });
  await prisma.barcodeType.create({
    data: {
      name: "CODEBAR",
      productCodeLocation: "CODEBAR_제품코드위치",
      sampleData: "A123456A",
      weightLocation: "CODEBAR_중량정보위치",
      unit: UNIT_LIST[Math.floor(Math.random() * UNIT_LIST.length)],
      digits: DIGIT_LIST[Math.floor(Math.random() * DIGIT_LIST.length)],
    },
  });
  await prisma.barcodeType.create({
    data: {
      name: "CODE_128",
      productCodeLocation: "CODE_128_제품코드위치",
      sampleData: "ABab12",
      weightLocation: "CODE_128_중량정보위치",
      unit: UNIT_LIST[Math.floor(Math.random() * UNIT_LIST.length)],
      digits: DIGIT_LIST[Math.floor(Math.random() * DIGIT_LIST.length)],
    },
  });
};
