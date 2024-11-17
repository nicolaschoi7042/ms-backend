export const CreateJobBoxDto = {
  type: "object",
  required: ["name", "width", "height", "length"],
  properties: {
    name: {
      type: "string",
    },
    width: {
      type: "number",
    },
    height: {
      type: "number",
    },
    length: {
      type: "number",
    },
  },
  example: {
    name: "Box A",
    width: 2.5,
    height: 1.5,
    length: 3.0,
  },
};

export const JobBoxDto = {
  type: "object",
  required: [
    "id",
    "name",
    "width",
    "height",
    "length",
    "weight",
    "jobId",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: {
      type: "integer",
    },
    name: {
      type: "string",
    },
    width: {
      type: "number",
    },
    height: {
      type: "number",
    },
    length: {
      type: "number",
    },
    weight: {
      type: "number",
    },
    labelDirection: {
      type: "integer",
    },
    jobId: {
      type: "integer",
    },
    barcodeTypeName: {
      type: "string",
    },
    barcodeSampleData: {
      type: "string",
    },
    barcodeWeightLocation: {
      type: "string",
    },
    barcodeUnit: {
      type: "string",
    },
    barcodeDigits: {
      type: "integer",
    },
    createdAt: {
      type: "string",
      format: "date-time",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
    },
  },
  example: {
    id: 1,
    name: "6호",
    width: 520,
    height: 400,
    length: 480,
    weight: 7,
    labelDirection: 2,
    jobId: 1,
    barcodeTypeName: "CODE39",
    barcodeSampleData: "ABC123",
    barcodeWeightLocation: "CODE39_중량정보위치",
    barcodeUnit: "KG",
    barcodeDigits: -1,
  },
};
