export const JobPalletDto = {
  type: "object",
  required: [
    "id",
    "jobId",
    "isBuffer",
    "isUse",
    "isError",
    "location",
    "isInvoiceVisible",
    "loadingHeight",
    "createdAt",
  ],
  properties: {
    id: {
      type: "integer",
    },
    jobId: {
      type: "integer",
    },
    isBuffer: {
      type: "boolean",
    },
    isUse: {
      type: "boolean",
    },
    isError: {
      type: "boolean",
    },
    location: {
      type: "string",
    },
    isInvoiceVisible: {
      type: "boolean",
    },
    loadingHeight: {
      type: "number",
    },
    orderInformation: {
      type: "string",
    },
    loadingPatternName: {
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
    palletBarcode: {
      type: "string",
    },
    palletSpecName: {
      type: "string",
    },
    overhang: {
      type: "integer",
    },
    boxGroupName: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  example: {
    id: 1,
    jobId: 1,
    isBuffer: false,
    isUse: true,
    isError: false,
    location: "A1",
    isInvoiceVisible: true,
    loadingHeight: 100,
    orderInformation: "Order Information",
    loadingPatternName: "Loading Pattern Name",
    width: 100,
    height: 100,
    length: 100,
    palletBarcode: "Pallet Barcode",
    palletSpecName: "Pallet Spec Name",
    overhang: 100,
  },
};
