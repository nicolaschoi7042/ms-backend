export const PalletDto = {
  type: "object",
  required: [
    "id",
    "isBuffer",
    "isUse",
    "isError",
    "location",
    "isInvoiceVisible",
    "palletGroupId",
    "palletGroup",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    isBuffer: { type: "boolean" },
    isUse: { type: "boolean" },
    isError: { type: "boolean" },
    location: { type: "string" },
    isInvoiceVisible: { type: "boolean" },
    loadingHeight: { type: "number" },
    loadingPatternId: { type: "integer" },
    loadingPattern: { type: "#/components/schemas/LoadingPatternDto" },
    orderInformation: { type: "string" },
    boxGroupId: { type: "integer" },
    boxGroup: { $ref: "#/components/schemas/BoxGroupDto" },
    palletSpecificationId: { type: "string" },
    palletSpecification: {
      $ref: "#/components/schemas/PalletSpecificationDto",
    },
    palletGroupId: { type: "integer" },
    palletGroup: { $ref: "#/components/schemas/PalletGroupDto" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

export const CreatePalletDto = {
  type: "object",
  required: ["location"],
  properties: {
    isBuffer: { type: "boolean" },
    isUse: { type: "boolean" },
    isError: { type: "boolean" },
    location: { type: "string" },
    isInvoiceVisible: { type: "boolean" },
    loadingHeight: { type: "number" },
    orderInformation: { type: "string" },
    boxGroupId: { type: "integer" },
    palletSpecificationId: { type: "string" },
    loadingPatternId: { type: "integer" },
  },
};

export type ICreatePalletDto = {
  isBuffer?: boolean;
  isUse?: boolean;
  isError?: boolean;
  location: string;
  isInvoiceVisible?: boolean;
  loadingHeight?: number;
  orderInformation?: string;
  boxGroupId?: number;
  palletSpecificationId?: string;
  loadingPatternId?: number;
};
