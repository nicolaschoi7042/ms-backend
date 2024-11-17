export const BarcodeTypeDto = {
  type: "object",
  required: [
    "id",
    "name",
    "sampleData",
    "productCodeLocation",
    "weightLocation",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    sampleData: { type: "string" },
    productCodeLocation: { type: "string" },
    weightLocation: { type: "string" },
    unit: { type: "string" },
    digits: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
};

export const CreateBarcodeTypeDto = {
  type: "object",
  required: ["name", "sampleData", "productCodeLocation", "weightLocation"],
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    sampleData: { type: "string" },
    productCodeLocation: { type: "string" },
    weightLocation: { type: "string" },
    unit: { type: "string" },
    digits: { type: "integer" },
  },
};

export const BulkCreateAndUpdateTypeDto = {
  type: "object",
  required: ["barcodeTypes"],
  properties: {
    barcodeTypes: {
      type: "array",
      items: {
        type: "object",
        required: [
          "name",
          "sampleData",
          "productCodeLocation",
          "weightLocation",
        ],
        properties: {
          id: {
            type: "integer",
          },
          name: {
            type: "string",
          },
          sampleData: {
            type: "string",
          },
          productCodeLocation: {
            type: "string",
          },
          weightLocation: {
            type: "string",
          },
          unit: {
            type: "string",
          },
          digits: {
            type: "integer",
          },
        },
      },
    },
  },
};
